import { h } from 'preact';
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
}

export function Header({ connectionStatus, unreadCount, totalEmails, totalBytes, theme, onToggleTheme }: HeaderProps) {
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
          BARE<span class="header-wordmark-sub">mail</span>
        </div>
        <div class="header-tagline">── email's bare necessities ──</div>
      </div>
      <div class="header-status">
        <span>
          <${StatusDot} status=${connectionStatus} />
          ${statusText} · ${inboxText}
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
