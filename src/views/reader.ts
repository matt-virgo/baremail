import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';
import { TypewriterText, Loading, formatFullDate, formatBytes } from '../components/common.js';
import {
  getMessage,
  archiveMessage,
  starMessage,
  unstarMessage,
  trashMessage,
  markAsRead,
  getAttachment,
} from '../gmail.js';
import { cacheMessage, getCachedMessage } from '../cache.js';
import type { GmailMessage, ComposeData } from '../types.js';

const html = htm.bind(h);

interface ReaderProps {
  email: GmailMessage;
  onBack: () => void;
  onReply: (data: ComposeData) => void;
  onForward: (data: ComposeData) => void;
  onEmailUpdated: (email: GmailMessage) => void;
  onArchived: (id: string) => void;
}

export function ReaderView({ email, onBack, onReply, onForward, onEmailUpdated, onArchived }: ReaderProps) {
  const [fullEmail, setFullEmail] = useState<GmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHtml, setShowHtml] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFullEmail(null);
    setLoading(true);
    setShowHtml(false);

    (async () => {
      try {
        const cached = await getCachedMessage(email.id);
        const cacheUsable = cached?.body && cached.body.trim().length > 20;
        if (cacheUsable) {
          if (!cancelled) {
            setFullEmail(cached);
            setLoading(false);
          }
          return;
        }

        const full = await getMessage(email.id);
        await cacheMessage(full);

        if (!cancelled) {
          setFullEmail(full);
          setLoading(false);
        }

        if (full.isUnread) {
          await markAsRead(full.id);
          onEmailUpdated({ ...full, isUnread: false });
        } else {
          onEmailUpdated(full);
        }
      } catch (err) {
        console.error('Failed to load message:', err);
        if (!cancelled) {
          setFullEmail({ ...email, body: '(failed to load message body)' });
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [email.id]);

  const handleArchive = async () => {
    try {
      await archiveMessage(email.id);
      onArchived(email.id);
    } catch (err) {
      console.error('Archive failed:', err);
    }
  };

  const handleStar = async () => {
    try {
      if (email.isStarred) {
        await unstarMessage(email.id);
        onEmailUpdated({ ...email, isStarred: false });
      } else {
        await starMessage(email.id);
        onEmailUpdated({ ...email, isStarred: true });
      }
    } catch (err) {
      console.error('Star toggle failed:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await trashMessage(email.id);
      onArchived(email.id);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleReply = () => {
    if (!fullEmail) return;
    onReply({
      to: fullEmail.from,
      cc: '',
      bcc: '',
      subject: fullEmail.subject.startsWith('Re:') ? fullEmail.subject : `Re: ${fullEmail.subject}`,
      body: `\n\n────────────────────────────\nOn ${formatFullDate(fullEmail.internalDate)}, ${fullEmail.fromName} wrote:\n\n${fullEmail.body}`,
      threadId: fullEmail.threadId,
      inReplyTo: fullEmail.id,
      isReply: true,
    });
  };

  const handleForward = () => {
    if (!fullEmail) return;
    onForward({
      to: '',
      cc: '',
      bcc: '',
      subject: fullEmail.subject.startsWith('Fwd:') ? fullEmail.subject : `Fwd: ${fullEmail.subject}`,
      body: `\n\n────────────────────────────\nForwarded message from ${fullEmail.fromName} <${fullEmail.from}>\nDate: ${formatFullDate(fullEmail.internalDate)}\nSubject: ${fullEmail.subject}\n\n${fullEmail.body}`,
      isForward: true,
    });
  };

  const handleDownloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const blob = await getAttachment(email.id, attachmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const displayEmail = fullEmail || email;
  const body = displayEmail.body;

  if (loading) {
    return html`<${Loading} message="loading message..." />`;
  }

  return html`
    <div class="fade-in">
      <div class="reader-toolbar">
        <button class="btn btn-ghost" onClick=${onBack}>← back</button>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onClick=${handleArchive}>archive</button>
          <button class="btn btn-secondary btn-sm" onClick=${handleStar}>
            ${email.isStarred ? '★ unstar' : '☆ star'}
          </button>
          <button class="btn btn-secondary btn-sm" onClick=${handleDelete}>delete</button>
        </div>
      </div>

      <div class="reader-header">
        <h2 class="reader-subject">${displayEmail.subject}</h2>
        <div class="reader-meta">
          <span class="reader-meta-label">from</span>
          <span class="reader-meta-value">
            ${displayEmail.fromName + ' <' + displayEmail.from + '>'}
          </span>
          ${displayEmail.to && html`
            <span class="reader-meta-label">to</span>
            <span class="reader-meta-value">${displayEmail.to}</span>
          `}
          ${displayEmail.cc && html`
            <span class="reader-meta-label">cc</span>
            <span class="reader-meta-value">${displayEmail.cc}</span>
          `}
          <span class="reader-meta-label">date</span>
          <span class="reader-meta-value">${formatFullDate(displayEmail.internalDate)}</span>
        </div>
      </div>

      <div class="reader-divider">${'─'.repeat(80)}</div>

      ${showHtml && displayEmail.bodyHtml ? html`
        <div
          class="reader-body"
          dangerouslySetInnerHTML=${{ __html: displayEmail.bodyHtml }}
        />
        <button class="btn btn-ghost" style="margin-top: 8px; font-size: 11px;" onClick=${() => setShowHtml(false)}>
          ← plain text
        </button>
      ` : html`
        <div class="reader-body">
          <${TypewriterText} text=${body || '(empty message)'} speed=${8} />
        </div>
        ${displayEmail.bodyHtml && html`
          <button class="btn btn-ghost" style="margin-top: 8px; font-size: 11px;" onClick=${() => setShowHtml(true)}>
            show original HTML
          </button>
        `}
      `}

      ${displayEmail.attachments?.length > 0 && html`
        <div style="padding: 8px 4px; border-top: 1px solid var(--border);">
          <div style="color: var(--dim-text); font-size: 11px; margin-bottom: 8px;">
            attachments (${displayEmail.attachments.length})
          </div>
          ${displayEmail.attachments.map(att => html`
            <div key=${att.attachmentId} style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
              <span style="color: var(--mid-text); font-size: 12px;">${att.filename}</span>
              <span style="color: var(--dim-text); font-size: 10px;">(${formatBytes(att.size)})</span>
              <button
                class="btn btn-dashed"
                onClick=${() => handleDownloadAttachment(att.attachmentId, att.filename)}
              >
                download
              </button>
            </div>
          `)}
        </div>
      `}

      <div class="reader-reply-bar">
        <button class="btn btn-action" onClick=${handleReply}>↩ reply</button>
        <button class="btn btn-secondary" onClick=${handleForward}>↪ forward</button>
      </div>
    </div>
  `;
}
