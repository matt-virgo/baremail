/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'baremail-v4';
const API_CACHE = 'baremail-api-v1';
const MSG_CACHE = 'baremail-messages-v1';

const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/config.js',
  '/manifest.json',
  '/icon.svg',
];

// ── Install: cache app shell ──

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME && name !== API_CACHE && name !== MSG_CACHE)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: routing strategy ──

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Gmail API: network-first, fall back to cache
  if (url.hostname === 'www.googleapis.com' && url.pathname.includes('/gmail/')) {
    event.respondWith(networkFirstWithCache(event.request, API_CACHE));
    return;
  }

  // Google OAuth: always network
  if (url.hostname === 'accounts.google.com' || url.hostname === 'oauth2.googleapis.com') {
    return;
  }

  // Google Fonts: cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirstWithNetwork(event.request, CACHE_NAME));
    return;
  }

  // App shell: cache-first, update in background
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstUpdateBackground(event.request));
    return;
  }
});

// ── Strategies ──

async function cacheFirstWithNetwork(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function cacheFirstUpdateBackground(request: Request): Promise<Response> {
  const cached = await caches.match(request);

  const networkPromise = fetch(request).then(async response => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  if (cached) {
    networkPromise; // fire-and-forget background update
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;

  return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
}

async function networkFirstWithCache(request: Request, cacheName: string): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Background sync for outbox ──

self.addEventListener('sync', (event: any) => {
  if (event.tag === 'baremail-outbox-sync') {
    event.waitUntil(flushOutbox());
  }
});

async function getTokenFromIDB(): Promise<string | null> {
  const DB_NAME = 'baremail';
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const tx = db.transaction('prefs', 'readonly');
    const store = tx.objectStore('prefs');
    const result = await new Promise<any>((resolve, reject) => {
      const req = store.get('auth_tokens');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    db.close();
    return result?.value?.access_token || null;
  } catch {
    return null;
  }
}

async function flushOutbox(): Promise<void> {
  const DB_NAME = 'baremail';
  const STORE_OUTBOX = 'outbox';

  try {
    const token = await getTokenFromIDB();
    if (!token) return;

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORE_OUTBOX);
    const allReq = store.getAll();

    const messages = await new Promise<any[]>((resolve, reject) => {
      allReq.onsuccess = () => resolve(allReq.result || []);
      allReq.onerror = () => reject(allReq.error);
    });

    for (const msg of messages) {
      try {
        const lines = [
          `To: ${msg.to}`,
          `Subject: ${msg.subject}`,
          'Content-Type: text/plain; charset=utf-8',
          'MIME-Version: 1.0',
        ];
        if (msg.cc) lines.push(`Cc: ${msg.cc}`);
        if (msg.bcc) lines.push(`Bcc: ${msg.bcc}`);
        if (msg.inReplyTo) {
          lines.push(`In-Reply-To: ${msg.inReplyTo}`);
          lines.push(`References: ${msg.inReplyTo}`);
        }
        lines.push('', msg.body);

        const raw = lines.join('\r\n');
        const encoded = btoa(unescape(encodeURIComponent(raw)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const payload: Record<string, unknown> = { raw: encoded };
        if (msg.threadId) payload.threadId = msg.threadId;

        const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const deleteTx = db.transaction(STORE_OUTBOX, 'readwrite');
          deleteTx.objectStore(STORE_OUTBOX).delete(msg.id);
        }
      } catch {
        // Will retry on next sync
      }
    }

    db.close();
  } catch {
    // DB not available
  }
}

// ── Message to clients ──

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
