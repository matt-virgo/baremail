import { h } from 'preact';
import htm from 'htm';
import type { View } from '../types.js';

const html = htm.bind(h);

interface NavProps {
  activeLabel: string;
  view: View;
  tabCounts: Record<string, number>;
  searchQuery: string;
  apiSearchQuery: string;
  onTabClick: (tab: string) => void;
  onSearchInput: (q: string) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
  onCompose: () => void;
}

export function Nav({ activeLabel, view, tabCounts, searchQuery, apiSearchQuery, onTabClick, onSearchInput, onSearchSubmit, onSearchClear, onCompose }: NavProps) {
  const countLabel = (id: string) => {
    const count = tabCounts[id];
    return count ? ` (${count})` : '';
  };

  const tabs = [
    { id: 'inbox', label: `inbox${countLabel('inbox')}`, icon: '>' },
    { id: 'starred', label: `starred${countLabel('starred')}`, icon: '★' },
    { id: 'sent', label: `sent${countLabel('sent')}`, icon: '↑' },
    { id: 'drafts', label: `drafts${countLabel('drafts')}`, icon: '◫' },
    { id: 'compose', label: 'compose', icon: '+' },
  ];

  const handleSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchSubmit();
      (e.target as HTMLInputElement).blur();
    }
  };

  return html`
    <nav class="nav">
      ${tabs.map(tab => html`
        <button
          key=${tab.id}
          class="nav-tab ${(activeLabel === tab.id && view !== 'compose') || (tab.id === 'compose' && view === 'compose') ? 'active' : ''}"
          onClick=${() => tab.id === 'compose' ? onCompose() : onTabClick(tab.id)}
        >
          <span class="nav-tab-icon">${tab.icon}</span>
          ${tab.label}
        </button>
      `)}
      <div class="nav-spacer" />
      ${view === 'inbox' && html`
        <div class="nav-search ${apiSearchQuery ? 'active-search' : ''}">
          <span class="nav-search-icon">⌕</span>
          <input
            type="text"
            placeholder="search..."
            value=${searchQuery}
            onInput=${(e: Event) => onSearchInput((e.target as HTMLInputElement).value)}
            onKeyDown=${handleSearchKeyDown}
          />
          ${(searchQuery || apiSearchQuery) && html`
            <button class="nav-search-clear" onClick=${onSearchClear}>✕</button>
          `}
        </div>
      `}
    </nav>
  `;
}
