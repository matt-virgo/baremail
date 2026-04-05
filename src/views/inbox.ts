import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';
import { formatDate, Loading } from '../components/common.js';
import { listMessages, batchGetMetadata, archiveMessage } from '../gmail.js';
import { cacheMessages, getAllCachedMessages } from '../cache.js';
import type { GmailMessage } from '../types.js';

const html = htm.bind(h);

interface InboxProps {
  emails: GmailMessage[];
  cacheKey: string;
  activeLabel: string;
  searchQuery: string;
  nextPageToken: string | null;
  needsFetch: boolean;
  loading: boolean;
  onEmailsLoaded: (cacheKey: string, emails: GmailMessage[], nextPageToken: string | null, append?: boolean) => void;
  onOpenEmail: (email: GmailMessage) => void;
  onSetLoading: (loading: boolean) => void;
  selectedIndex: number;
  inboxZeroBear: any;
}

export function InboxView({
  emails,
  cacheKey,
  activeLabel,
  searchQuery,
  nextPageToken,
  needsFetch,
  loading,
  onEmailsLoaded,
  onOpenEmail,
  onSetLoading,
  selectedIndex,
  inboxZeroBear,
}: InboxProps) {
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const result = await listMessages(
        searchQuery || undefined,
        pageToken,
        labelIds
      );

      if (result.messages.length === 0) {
        onEmailsLoaded(key, [], null, !!pageToken);
        onSetLoading(false);
        setInitialLoad(false);
        return;
      }

      const ids = result.messages.map(m => m.id);
      const metadata = await batchGetMetadata(ids);
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
    return html`<${Loading} message="fetching mail..." />`;
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

  if (emails.length === 0 && !loading) {
    if (searchQuery) {
      return html`
        <div class="no-results fade-in">
          <pre>${`  ʕ;ᴥ;ʔ ?`}</pre>
          no results for "${searchQuery}"
        </div>
      `;
    }
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
      ${emails.map((email, i) => html`
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
              ${email.fromName || email.from}
            </span>
            <span class="inbox-subject ${email.isUnread ? 'unread' : 'read'}">
              ${email.subject}
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

      ${(nextPageToken || loading) && html`
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
    </div>
  `;
}
