import { h } from 'preact';
import htm from 'htm';
import { KeyHint } from './common.js';
import type { View } from '../types.js';

const html = htm.bind(h);

interface FooterProps {
  view: View;
  hasActiveSearch?: boolean;
}

export function Footer({ view, hasActiveSearch }: FooterProps) {
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return html`
    <footer class="footer">
      <div>
        ${view === 'inbox' && html`
          <${KeyHint} keys="j/k" label="navigate" />
          <${KeyHint} keys="o" label="open" />
          <${KeyHint} keys="e" label="archive" />
          <${KeyHint} keys="s" label="star" />
          <${KeyHint} keys="c" label="compose" />
          <${KeyHint} keys="/" label="search" />
          ${hasActiveSearch && html`<${KeyHint} keys="esc" label="clear search" />`}
        `}
        ${view === 'reader' && html`
          <${KeyHint} keys="r" label="reply" />
          <${KeyHint} keys="e" label="archive" />
          <${KeyHint} keys="s" label="star" />
          <${KeyHint} keys="esc" label="back" />
        `}
        ${view === 'compose' && html`
          <${KeyHint} keys="⌘↩" label="send" />
          <${KeyHint} keys="esc" label="discard" />
        `}
      </div>
      <span class="footer-version">
        baremail v0.1.0 · ʕ·ᴥ·ʔ · ${now}
      </span>
    </footer>
  `;
}
