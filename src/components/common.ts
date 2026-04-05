import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';
import type { ConnectionStatus } from '../types.js';

const html = htm.bind(h);

export function StatusDot({ status }: { status: ConnectionStatus }) {
  return html`<span class="status-dot ${status}" />`;
}

export function TypewriterText({ text, speed = 30 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return html`
    <span>
      ${displayed}
      ${!done && html`<span class="cursor-blink">▌</span>`}
    </span>
  `;
}

export function KeyHint({ keys, label }: { keys: string; label: string }) {
  return html`
    <span class="key-hint">
      <span class="key-hint-key">${keys}</span>
      ${label}
    </span>
  `;
}

export function Loading({ message = 'fetching mail...' }: { message?: string }) {
  return html`
    <div class="loading fade-in">
      <div class="loading-bear">ʕ·ᴥ·ʔ</div>
      <div>${message}</div>
    </div>
  `;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function formatDate(internalDate: number): string {
  const d = new Date(internalDate);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatFullDate(internalDate: number): string {
  const d = new Date(internalDate);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
