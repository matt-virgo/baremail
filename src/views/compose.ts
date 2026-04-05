import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import htm from 'htm';
import { TypewriterText, formatBytes } from '../components/common.js';
import { sendMessage } from '../gmail.js';
import { queueOutbox, getPref, setPref } from '../cache.js';
import type { ComposeData, OutboxMessage } from '../types.js';

const html = htm.bind(h);

const BAREMAIL_FOOTER = '\n\nʕ·ᴥ·ʔ sent with baremail — email for bad wifi — baremail.app';

interface ComposeProps {
  data: ComposeData;
  onSent: () => void;
  onDiscard: () => void;
  isOnline: boolean;
}

export function ComposeView({ data, onSent, onDiscard, isOnline }: ComposeProps) {
  const [to, setTo] = useState(data.to);
  const [cc, setCc] = useState(data.cc || '');
  const [bcc, setBcc] = useState(data.bcc || '');
  const [subject, setSubject] = useState(data.subject);
  const [body, setBody] = useState(data.body || '');
  const [showCcBcc, setShowCcBcc] = useState(!!(data.cc || data.bcc));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const isReply = !!data.to;

  useEffect(() => {
    if (isReply && bodyRef.current) {
      bodyRef.current.focus();
      bodyRef.current.setSelectionRange(0, 0);
    }
  }, []);

  const estimatedSize = new TextEncoder().encode(to + subject + body + cc + bcc).length + 300;

  const handleSend = async () => {
    if (!to.trim()) {
      setError('recipient required');
      return;
    }
    if (!subject.trim() && !body.trim()) {
      setError('empty message');
      return;
    }

    setSending(true);
    setError('');

    const footerEnabled = await getPref('footerEnabled', true);
    const sentCount = await getPref<number>('sentCount', 0);
    const finalBody = footerEnabled ? body + BAREMAIL_FOOTER : body;

    if (!isOnline) {
      const outboxMsg: OutboxMessage = {
        id: `outbox_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        to,
        cc,
        bcc,
        subject,
        body: finalBody,
        threadId: data.threadId,
        inReplyTo: data.inReplyTo,
        createdAt: Date.now(),
        attempts: 0,
      };
      await queueOutbox(outboxMsg);
      setSending(false);
      setSent(true);
      setTimeout(onSent, 2000);
      return;
    }

    try {
      await sendMessage(to, subject, finalBody, {
        cc: cc || undefined,
        bcc: bcc || undefined,
        threadId: data.threadId,
        inReplyTo: data.inReplyTo,
      });

      await setPref('sentCount', sentCount + 1);

      if (sentCount + 1 === 10 && footerEnabled) {
        // The prompt will be shown separately in the app
        await setPref('showFooterPrompt', true);
      }

      setSending(false);
      setSent(true);
      setTimeout(onSent, 2000);
    } catch (err) {
      console.error('Send failed:', err);
      setError('send failed — message queued for retry');

      const outboxMsg: OutboxMessage = {
        id: `outbox_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        to,
        cc,
        bcc,
        subject,
        body: finalBody,
        threadId: data.threadId,
        inReplyTo: data.inReplyTo,
        createdAt: Date.now(),
        attempts: 1,
        lastAttempt: Date.now(),
        error: String(err),
      };
      await queueOutbox(outboxMsg);
      setSending(false);
    }
  };

  if (sent) {
    return html`
      <div class="compose-sent fade-in">
        <pre>${`
    ʕᵔᴥᵔʔ  ok!
     |    |
     |${isOnline ? 'sent' : 'queued'}|
        `}</pre>
        <div style="color: var(--green); font-size: 12px;">
          <${TypewriterText}
            text=${isOnline
              ? `message sent · ~${formatBytes(estimatedSize)} transmitted`
              : `message queued · will send when online`
            }
            speed=${25}
          />
        </div>
      </div>
    `;
  }

  return html`
    <div class="fade-in">
      <div style="padding: 12px 0 0;">
        <div class="compose-field">
          <label class="compose-label">to:</label>
          <input
            class="compose-input"
            type="text"
            value=${to}
            onInput=${(e: Event) => setTo((e.target as HTMLInputElement).value)}
            placeholder="recipient@example.com"
            autofocus=${!isReply}
          />
          ${!showCcBcc && html`
            <button
              class="btn btn-ghost"
              style="font-size: 11px; padding: 2px 8px;"
              onClick=${() => setShowCcBcc(true)}
            >cc/bcc</button>
          `}
        </div>

        ${showCcBcc && html`
          <div class="compose-field">
            <label class="compose-label">cc:</label>
            <input
              class="compose-input"
              type="text"
              value=${cc}
              onInput=${(e: Event) => setCc((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="compose-field">
            <label class="compose-label">bcc:</label>
            <input
              class="compose-input"
              type="text"
              value=${bcc}
              onInput=${(e: Event) => setBcc((e.target as HTMLInputElement).value)}
            />
          </div>
        `}

        <div class="compose-field">
          <label class="compose-label">subject:</label>
          <input
            class="compose-input subject"
            type="text"
            value=${subject}
            onInput=${(e: Event) => setSubject((e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="compose-attach">
          <button class="btn btn-dashed">+ attach file</button>
        </div>
      </div>

      <textarea
        ref=${bodyRef}
        class="compose-body"
        value=${body}
        onInput=${(e: Event) => setBody((e.target as HTMLTextAreaElement).value)}
        placeholder="write your message..."
      />

      ${error && html`
        <div style="padding: 4px 4px; color: var(--red); font-size: 11px;">
          ${error}
        </div>
      `}

      <div class="compose-send-bar">
        <div style="display: flex; gap: 8px; align-items: center;">
          <button
            class="btn btn-primary"
            onClick=${handleSend}
            disabled=${sending}
          >
            ${sending ? 'sending...' : isOnline ? 'send →' : 'queue →'}
          </button>
          <button class="btn btn-secondary" onClick=${onDiscard}>discard</button>
        </div>
        <span style="color: var(--dim-text); font-size: 11px;">
          ${!isOnline && '⚡ offline · will queue · '}
          estimated: ~${formatBytes(estimatedSize)}
        </span>
      </div>
    </div>
  `;
}
