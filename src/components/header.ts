import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import htm from 'htm';
import { StatusDot, formatBytes } from './common.js';
import type { ConnectionStatus } from '../types.js';

const html = htm.bind(h);

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  unreadCount: number;
  totalEmails: number;
  totalBytes: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  userEmail: string | null;
  onLogout: () => void;
  onRefresh: () => void;
}

export function Header({ connectionStatus, unreadCount, totalEmails, totalBytes, theme, onToggleTheme, userEmail, onLogout, onRefresh }: HeaderProps) {
  const [showAccount, setShowAccount] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAccount) return;
    const close = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowAccount(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showAccount]);

  const statusText = connectionStatus === 'online' ? 'connected'
    : connectionStatus === 'slow' ? 'slow connection'
    : 'offline';

  const inboxText = totalEmails === 0
    ? 'inbox zero ʕᵔᴥᵔʔ'
    : `${unreadCount} unread`;

  return html`
    <header class="header">
      <div class="header-brand">
        <div class="header-bear">ʕ·ᴥ·ʔ</div>
        <div class="header-wordmark">
          BAREMAIL
        </div>
        <div class="header-tagline">── email's bare necessities ──</div>
      </div>
      <div class="header-status">
        <span class="header-status-left" ref=${popoverRef}>
          <button class="header-status-btn" onClick=${() => setShowAccount(!showAccount)}>
            <${StatusDot} status=${connectionStatus} />
            ${statusText}
          </button>
          ${' · '}${inboxText}${' '}
          <button class="header-refresh-btn" onClick=${onRefresh} title="refresh inbox">↻</button>
          ${showAccount && html`
            <div class="account-popover">
              ${userEmail && html`
                <div class="account-popover-email">${userEmail}</div>
              `}
              <button class="account-popover-logout" onClick=${onLogout}>
                ⏻ sign out
              </button>
            </div>
          `}
        </span>
        <span>
          <button class="theme-toggle" onClick=${onToggleTheme}>
            ${theme === 'dark' ? '◑ light' : '◐ dark'}
          </button>
          ${' · '}↓ ${formatBytes(totalBytes)} api
        </span>
      </div>
    </header>
  `;
}
