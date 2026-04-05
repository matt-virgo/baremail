import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import htm from 'htm';
import { formatDate, Loading } from '../components/common.js';
import { listMessages, batchGetMetadata, archiveMessage } from '../gmail.js';
import { cacheMessages, getAllCachedMessages } from '../cache.js';
import type { GmailMessage } from '../types.js';

const html = htm.bind(h);

const API_SEARCH_MAX_RESULTS = 10;

function highlightMatch(text: string, query: string): any {
  if (!query || !text) return text;
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return html`${before}<mark class="search-highlight">${match}</mark>${after}`;
}

function localFilter(emails: GmailMessage[], query: string): GmailMessage[] {
  const q = query.toLowerCase();
  return emails.filter(e =>
    e.fromName.toLowerCase().includes(q) ||
    e.from.toLowerCase().includes(q) ||
    e.subject.toLowerCase().includes(q) ||
    (e.body && e.body.toLowerCase().includes(q)) ||
    (e.snippet && e.snippet.toLowerCase().includes(q))
  );
}

interface InboxProps {
  emails: GmailMessage[];
  cacheKey: string;
  activeLabel: string;
  localSearchQuery: string;
  apiSearchQuery: string;
  nextPageToken: string | null;
  needsFetch: boolean;
  loading: boolean;
  onEmailsLoaded: (cacheKey: string, emails: GmailMessage[], nextPageToken: string | null, append?: boolean) => void;
  onOpenEmail: (email: GmailMessage) => void;
  onSetLoading: (loading: boolean) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
  selectedIndex: number;
  inboxZeroBear: any;
}

export function InboxView({
  emails,
  cacheKey,
  activeLabel,
  localSearchQuery,
  apiSearchQuery,
  nextPageToken,
  needsFetch,
  loading,
  onEmailsLoaded,
  onOpenEmail,
  onSetLoading,
  onSearchSubmit,
  onSearchClear,
  selectedIndex,
  inboxZeroBear,
}: InboxProps) {
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLocalSearch = !!localSearchQuery && !apiSearchQuery;
  const isApiSearch = !!apiSearchQuery;

  const displayEmails = useMemo(() => {
    if (isLocalSearch) return localFilter(emails, localSearchQuery);
    return emails;
  }, [emails, localSearchQuery, isLocalSearch]);

  const searchHighlight = isLocalSearch ? localSearchQuery : '';

  const fetchInbox = async (pageToken?: string) => {
    onSetLoading(true);
    setError(null);
    const key = cacheKey;
    try {
      const labelMap: Record<string, string[]> = {
        inbox: ['INBOX'],
        starred: ['STARRED'],
        sent: ['SENT'],
        drafts: ['DRAFT'],
      };

      const labelIds = labelMap[activeLabel] || ['INBOX'];
      const maxResults = isApiSearch ? API_SEARCH_MAX_RESULTS : 25;
      const result = await listMessages(
        apiSearchQuery || undefined,
        pageToken,
        labelIds,
        maxResults
      );

      if (result.messages.length === 0) {
        onEmailsLoaded(key, [], null, !!pageToken);
        onSetLoading(false);
        setInitialLoad(false);
        return;
      }

      const ids = result.messages.map(m => m.id);
      const metadata = await batchGetMetadata(ids, (_loaded, _total, partial) => {
        onEmailsLoaded(key, partial, result.nextPageToken, !!pageToken);
      });
      await cacheMessages(metadata);

      onEmailsLoaded(key, metadata, result.nextPageToken, !!pageToken);
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
      setError(String(err));
      try {
        const cached = await getAllCachedMessages();
        if (cached.length > 0) {
          onEmailsLoaded(key, cached, null);
        }
      } catch {
        // No cached data either
      }
    } finally {
      onSetLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    if (!needsFetch) {
      setInitialLoad(false);
      return;
    }
    setInitialLoad(true);
    fetchInbox();
  }, [cacheKey, needsFetch]);

  const handleArchive = async (e: Event, email: GmailMessage) => {
    e.stopPropagation();
    try {
      await archiveMessage(email.id);
      onEmailsLoaded(
        cacheKey,
        emails.filter(m => m.id !== email.id),
        nextPageToken
      );
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  };

  const handleLoadMore = () => {
    if (emails.length === 0) {
      onEmailsLoaded(cacheKey, [], null);
      fetchInbox();
    } else if (nextPageToken) {
      fetchInbox(nextPageToken);
    }
  };

  if (loading && initialLoad) {
    return html`<${Loading} message=${isApiSearch ? 'searching gmail...' : 'fetching mail...'} />`;
  }

  if (error && emails.length === 0) {
    return html`
      <div class="no-results fade-in">
        <pre style="color: var(--red);">${`  ʕ;ᴥ;ʔ !`}</pre>
        <div style="color: var(--red); font-size: 12px; margin-bottom: 8px;">failed to load inbox</div>
        <div style="color: var(--dim-text); font-size: 11px; max-width: 500px; margin: 0 auto; word-break: break-word;">
          ${error}
        </div>
        <button class="btn btn-secondary" style="margin-top: 16px;" onClick=${() => fetchInbox()}>
          retry
        </button>
      </div>
    `;
  }

  // API search returned no results
  if (isApiSearch && displayEmails.length === 0 && !loading) {
    return html`
      <div class="no-results fade-in">
        <pre>${`  ʕ;ᴥ;ʔ ?`}</pre>
        <div>no Gmail results for "${apiSearchQuery}"</div>
        <button class="btn btn-secondary" style="margin-top: 12px;" onClick=${onSearchClear}>
          ← back to ${activeLabel}
        </button>
      </div>
    `;
  }

  // Local search with no matches — prompt to search via API
  if (isLocalSearch && displayEmails.length === 0 && !loading) {
    return html`
      <div class="no-results fade-in">
        <pre>${`  ʕ;ᴥ;ʔ`}</pre>
        <div>no local matches for "${localSearchQuery}"</div>
        <button
          class="btn btn-secondary"
          style="margin-top: 12px;"
          onClick=${onSearchSubmit}
        >
          search all gmail (~2KB) →
        </button>
        <div class="search-hint" style="margin-top: 8px;">
          or press enter in the search box
        </div>
      </div>
    `;
  }

  // No emails at all (empty label)
  if (displayEmails.length === 0 && !loading) {
    return html`
      <div>
        ${inboxZeroBear}
        ${nextPageToken && html`
          <div class="inbox-load-more" style="margin-top: 16px;">
            <button
              class="btn btn-secondary"
              onClick=${handleLoadMore}
              disabled=${loading}
            >
              ${loading ? 'loading...' : 'load more ↓ (~4KB)'}
            </button>
          </div>
        `}
      </div>
    `;
  }

  return html`
    <div>
      ${isApiSearch && html`
        <div class="search-results-header fade-in">
          <span>Gmail results for "${apiSearchQuery}" · ${displayEmails.length} result${displayEmails.length !== 1 ? 's' : ''}</span>
          <button class="btn btn-secondary btn-sm" onClick=${onSearchClear}>
            ✕ clear
          </button>
        </div>
      `}

      ${isLocalSearch && html`
        <div class="search-results-header fade-in">
          <span>${displayEmails.length} of ${emails.length} loaded · press enter to search all gmail</span>
        </div>
      `}

      ${displayEmails.map((email, i) => html`
        <div
          key=${email.id}
          class="inbox-row fade-in"
          onMouseEnter=${() => setHoverRow(email.id)}
          onMouseLeave=${() => setHoverRow(null)}
          onClick=${() => onOpenEmail(email)}
          style=${{
            animationDelay: `${i * 40}ms`,
            background: selectedIndex === i ? 'var(--bg-highlight)' : undefined,
          }}
        >
          <span class="inbox-indicator">
            ${email.isUnread
              ? html`<span class="unread">●</span>`
              : email.isStarred
                ? html`<span class="starred">★</span>`
                : html`<span class="read">·</span>`
            }
          </span>

          <div class="inbox-content">
            <span class="inbox-from ${email.isUnread ? 'unread' : 'read'}">
              ${searchHighlight
                ? highlightMatch(email.fromName || email.from, searchHighlight)
                : (email.fromName || email.from)}
            </span>
            <span class="inbox-subject ${email.isUnread ? 'unread' : 'read'}">
              ${searchHighlight
                ? highlightMatch(email.subject, searchHighlight)
                : email.subject}
            </span>
          </div>

          <span class="inbox-date">
            ${formatDate(email.internalDate)}
          </span>

          <span class="inbox-actions">
            <button
              class="btn btn-secondary btn-sm"
              onClick=${(e: Event) => handleArchive(e, email)}
            >
              archive
            </button>
          </span>
        </div>
      `)}

      ${!isLocalSearch && !isApiSearch && (nextPageToken || loading) && html`
        <div class="inbox-load-more">
          <button
            class="btn btn-secondary"
            onClick=${handleLoadMore}
            disabled=${loading}
          >
            ${loading ? 'loading...' : 'load more ↓ (~4KB)'}
          </button>
        </div>
      `}

      ${isLocalSearch && html`
        <div class="inbox-load-more">
          <button
            class="btn btn-secondary"
            onClick=${onSearchSubmit}
          >
            search all gmail for "${localSearchQuery}" (~2KB) →
          </button>
        </div>
      `}

      ${isApiSearch && (nextPageToken || loading) && html`
        <div class="inbox-load-more">
          <button
            class="btn btn-secondary"
            onClick=${handleLoadMore}
            disabled=${loading}
          >
            ${loading ? 'loading...' : 'load more results ↓ (~2KB)'}
          </button>
        </div>
      `}
    </div>
  `;
}
