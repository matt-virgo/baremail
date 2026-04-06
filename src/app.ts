import { h, render } from 'preact';
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import htm from 'htm';
import { initAuth, isAuthenticated, handleOAuthCallback, logout, getUserEmail } from './auth.js';
import { getTotalBytes, archiveMessage, starMessage, unstarMessage } from './gmail.js';
import { getPref, setPref, getOutboxCount } from './cache.js';
import { Header } from './components/header.js';
import { Nav } from './components/nav.js';
import { Footer } from './components/footer.js';
import { InboxZeroBear } from './components/bear.js';
import { LoginView } from './views/login.js';
import { InboxView } from './views/inbox.js';
import { ReaderView } from './views/reader.js';
import { ComposeView } from './views/compose.js';
import type { View, GmailMessage, ComposeData, ConnectionStatus } from './types.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

const html = htm.bind(h);

const EMPTY_COMPOSE: ComposeData = { to: '', cc: '', bcc: '', subject: '', body: '' };

function App() {
  const [view, setView] = useState<View>('login');
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);
  const [composeData, setComposeData] = useState<ComposeData>(EMPTY_COMPOSE);
  const [activeLabel, setActiveLabel] = useState('inbox');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('online');
  const [outboxCount, setOutboxCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(0);
  selectedIndexRef.current = selectedIndex;

  interface LabelData { emails: GmailMessage[]; nextPageToken: string | null; }
  const [labelCache, setLabelCache] = useState<Record<string, LabelData>>({});

  const cacheKey = apiSearchQuery ? `search:${apiSearchQuery}` : activeLabel;
  const currentData = labelCache[cacheKey];
  const emails = currentData?.emails || [];
  const nextPageToken = currentData?.nextPageToken || null;

  // ── Init ──
  useEffect(() => {
    (async () => {
      try {
        const savedTheme = await getPref<'dark' | 'light'>('theme', 'dark');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        setTheme(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme);

        const callbackHandled = await handleOAuthCallback();
        if (callbackHandled || await initAuth()) {
          setView('inbox');
        }

        const count = await getOutboxCount();
        setOutboxCount(count);
      } catch (err) {
        console.error('Init error:', err);
      }

      setTimeout(() => setMounted(true), 100);
    })();
  }, []);

  // ── Connection status ──
  useEffect(() => {
    const updateStatus = () => {
      if (!navigator.onLine) {
        setConnectionStatus('offline');
      } else {
        const conn = (navigator as any).connection;
        if (conn && conn.downlink < 0.5) {
          setConnectionStatus('slow');
        } else {
          setConnectionStatus('online');
        }
      }
    };

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  // ── Theme toggle ──
  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    await setPref('theme', next);
  }, [theme]);

  // ── Navigation helpers ──
  const openEmail = useCallback((email: GmailMessage) => {
    setSelectedEmail(email);
    setView('reader');
  }, []);

  const startCompose = useCallback(() => {
    setComposeData(EMPTY_COMPOSE);
    setView('compose');
  }, []);

  const handleReply = useCallback((data: ComposeData) => {
    setComposeData(data);
    setView('compose');
  }, []);

  const handleForward = useCallback((data: ComposeData) => {
    setComposeData(data);
    setView('compose');
  }, []);

  const goToInbox = useCallback(() => {
    setView('inbox');
    setSelectedEmail(null);
  }, []);

  const handleTabClick = useCallback((tab: string) => {
    setActiveLabel(tab);
    setView('inbox');
    setSelectedEmail(null);
    setLocalSearchQuery('');
    setApiSearchQuery('');
    setSelectedIndex(0);
  }, []);

  const handleSearchInput = useCallback((q: string) => {
    setLocalSearchQuery(q);
    if (apiSearchQuery) setApiSearchQuery('');
    setSelectedIndex(0);
  }, [apiSearchQuery]);

  const handleSearchSubmit = useCallback(() => {
    if (!localSearchQuery.trim()) return;
    setApiSearchQuery(localSearchQuery.trim());
    setSelectedIndex(0);
  }, [localSearchQuery]);

  const handleSearchClear = useCallback(() => {
    setLocalSearchQuery('');
    setApiSearchQuery('');
    setSelectedIndex(0);
  }, []);

  const handleEmailsLoaded = useCallback((key: string, newEmails: GmailMessage[], token: string | null, append = false) => {
    setLabelCache(prev => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          emails: append ? [...(existing?.emails || []), ...newEmails] : newEmails,
          nextPageToken: token,
        },
      };
    });
  }, []);

  const handleEmailUpdated = useCallback((updated: GmailMessage) => {
    setLabelCache(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const data = next[key];
        if (data.emails.some(e => e.id === updated.id)) {
          next[key] = { ...data, emails: data.emails.map(e => e.id === updated.id ? updated : e) };
        }
      }
      return next;
    });
    if (selectedEmail?.id === updated.id) setSelectedEmail(updated);
  }, [selectedEmail]);

  const handleArchived = useCallback((id: string) => {
    setLabelCache(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const data = next[key];
        if (data.emails.some(e => e.id === id)) {
          next[key] = { ...data, emails: data.emails.filter(e => e.id !== id) };
        }
      }
      return next;
    });
    if (view === 'reader') goToInbox();
  }, [view, goToInbox]);

  const handleSent = useCallback(async () => {
    goToInbox();
    const count = await getOutboxCount();
    setOutboxCount(count);
  }, [goToInbox]);

  const handleLogout = useCallback(async () => {
    await logout();
    setView('login');
    setLabelCache({});
    setSelectedEmail(null);
  }, []);


  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (view === 'inbox' && (localSearchQuery || apiSearchQuery)) {
          handleSearchClear();
          (document.activeElement as HTMLElement)?.blur();
        } else if (view === 'reader') goToInbox();
        else if (view === 'compose') goToInbox();
        return;
      }

      if (view === 'compose') {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          const sendBtn = document.querySelector('.compose-send-bar .btn-primary') as HTMLButtonElement;
          sendBtn?.click();
        }
        return;
      }

      if (isInput) return;
      const isButton = target.tagName === 'BUTTON';

      if (!isButton && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabs = ['inbox', 'starred', 'sent', 'drafts', 'compose'];
        const idx = parseInt(e.key) - 1;
        if (tabs[idx] === 'compose') startCompose();
        else handleTabClick(tabs[idx]);
        return;
      }

      if (view === 'inbox') {
        if (e.key === '/') {
          e.preventDefault();
          const searchInput = document.querySelector('.nav-search input') as HTMLInputElement;
          searchInput?.focus();
        } else if (e.key === 'j') {
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, emails.length - 1));
        } else if (e.key === 'k') {
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
        } else if ((e.key === 'o' || e.key === 'Enter') && !isButton) {
          e.preventDefault();
          const email = emails[selectedIndexRef.current];
          if (email) openEmail(email);
        } else if (e.key === 'e') {
          e.preventDefault();
          const email = emails[selectedIndexRef.current];
          if (email) {
            archiveMessage(email.id).then(() => handleArchived(email.id));
          }
        } else if (e.key === 's') {
          e.preventDefault();
          const email = emails[selectedIndexRef.current];
          if (email) {
            const toggle = email.isStarred ? unstarMessage : starMessage;
            toggle(email.id).then(() => {
              handleEmailUpdated({ ...email, isStarred: !email.isStarred });
            });
          }
        } else if (e.key === 'c') {
          e.preventDefault();
          startCompose();
        }
        return;
      }

      if (view === 'reader') {
        if (e.key === 'r') {
          e.preventDefault();
          const replyBtn = document.querySelector('.reader-reply-bar .btn-action') as HTMLButtonElement;
          replyBtn?.click();
        } else if (e.key === 'e') {
          e.preventDefault();
          if (selectedEmail) {
            archiveMessage(selectedEmail.id).then(() => handleArchived(selectedEmail.id));
          }
        } else if (e.key === 's') {
          e.preventDefault();
          if (selectedEmail) {
            const toggle = selectedEmail.isStarred ? unstarMessage : starMessage;
            toggle(selectedEmail.id).then(() => {
              handleEmailUpdated({ ...selectedEmail, isStarred: !selectedEmail.isStarred });
            });
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [view, emails, selectedEmail, localSearchQuery, apiSearchQuery, openEmail, startCompose, goToInbox, handleArchived, handleEmailUpdated, handleTabClick, handleSearchClear]);

  // ── Derived state ──
  const inboxEmails = labelCache['inbox']?.emails || [];
  const inboxUnreadCount = inboxEmails.filter(e => e.isUnread).length;
  const currentUnreadCount = emails.filter(e => e.isUnread).length;
  const totalBytes = getTotalBytes();
  const isOnline = connectionStatus !== 'offline';

  const tabCounts: Record<string, number> = {};
  for (const key of Object.keys(labelCache)) {
    tabCounts[key] = labelCache[key].emails.length;
  }

  // ── Login view ──
  if (view === 'login' || !isAuthenticated()) {
    return html`
      <div>
        <div class="crt-scanlines" />
        <div class="crt-vignette" />
        <div class="app-container ${mounted ? 'mounted' : ''}">
          <${LoginView} />
        </div>
      </div>
    `;
  }

  // ── Authenticated views ──
  return html`
    <div>
      <div class="crt-scanlines" />
      <div class="crt-vignette" />

      ${connectionStatus === 'offline' && html`
        <div class="connection-banner offline">
          ⚡ offline${outboxCount > 0 ? ` · ${outboxCount} message${outboxCount > 1 ? 's' : ''} queued` : ''}
        </div>
      `}
      ${connectionStatus === 'slow' && html`
        <div class="connection-banner slow">
          ◑ slow connection detected
        </div>
      `}

      <div class="app-container ${mounted ? 'mounted' : ''}">
        <div class="sticky-top">
          <${Header}
            connectionStatus=${connectionStatus}
            unreadCount=${inboxUnreadCount}
            totalEmails=${inboxEmails.length}
            totalBytes=${totalBytes}
            theme=${theme}
            onToggleTheme=${toggleTheme}
            userEmail=${getUserEmail()}
            onLogout=${handleLogout}
          />

          <${Nav}
            activeLabel=${activeLabel}
            view=${view}
            tabCounts=${tabCounts}
            searchQuery=${localSearchQuery}
            apiSearchQuery=${apiSearchQuery}
            onTabClick=${handleTabClick}
            onSearchInput=${handleSearchInput}
            onSearchSubmit=${handleSearchSubmit}
            onSearchClear=${handleSearchClear}
            onCompose=${startCompose}
          />
        </div>

        ${view === 'inbox' && html`
          <${InboxView}
            emails=${emails}
            cacheKey=${cacheKey}
            activeLabel=${activeLabel}
            localSearchQuery=${localSearchQuery}
            apiSearchQuery=${apiSearchQuery}
            nextPageToken=${nextPageToken}
            needsFetch=${!currentData}
            loading=${loading}
            onEmailsLoaded=${handleEmailsLoaded}
            onOpenEmail=${openEmail}
            onSetLoading=${setLoading}
            onSearchSubmit=${handleSearchSubmit}
            onSearchClear=${handleSearchClear}
            selectedIndex=${selectedIndex}
            inboxZeroBear=${html`<${InboxZeroBear} />`}
          />
        `}

        ${view === 'reader' && selectedEmail && html`
          <${ReaderView}
            email=${selectedEmail}
            onBack=${goToInbox}
            onReply=${handleReply}
            onForward=${handleForward}
            onEmailUpdated=${handleEmailUpdated}
            onArchived=${handleArchived}
          />
        `}

        ${view === 'compose' && html`
          <${ComposeView}
            data=${composeData}
            onSent=${handleSent}
            onDiscard=${goToInbox}
            isOnline=${isOnline}
          />
        `}

        <${Footer} view=${view} hasActiveSearch=${!!(localSearchQuery || apiSearchQuery)} />
      </div>
    </div>
  `;
}

render(html`<${App} />`, document.getElementById('app')!);
