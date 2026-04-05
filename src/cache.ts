import type { GmailMessage, OutboxMessage } from './types.js';

const DB_NAME = 'baremail';
const DB_VERSION = 1;
const STORE_MESSAGES = 'messages';
const STORE_OUTBOX = 'outbox';
const STORE_PREFS = 'prefs';

const MAX_CACHED_MESSAGES = 1000;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const store = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' });
        store.createIndex('internalDate', 'internalDate', { unique: false });
        store.createIndex('accessedAt', 'accessedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_PREFS)) {
        db.createObjectStore(STORE_PREFS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

function tx(
  storeName: string,
  mode: IDBTransactionMode = 'readonly'
): Promise<IDBObjectStore> {
  return openDB().then(db => {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  });
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Message Cache ──

interface CachedMessage extends GmailMessage {
  accessedAt: number;
}

export async function cacheMessage(msg: GmailMessage): Promise<void> {
  const store = await tx(STORE_MESSAGES, 'readwrite');
  const cached: CachedMessage = { ...msg, accessedAt: Date.now() };
  await idbRequest(store.put(cached));
  await evictIfNeeded();
}

export async function cacheMessages(msgs: GmailMessage[]): Promise<void> {
  const store = await tx(STORE_MESSAGES, 'readwrite');
  const now = Date.now();
  for (const msg of msgs) {
    const cached: CachedMessage = { ...msg, accessedAt: now };
    store.put(cached);
  }
  await evictIfNeeded();
}

export async function getCachedMessage(id: string): Promise<GmailMessage | null> {
  const store = await tx(STORE_MESSAGES, 'readwrite');
  const result = await idbRequest(store.get(id)) as CachedMessage | undefined;
  if (!result) return null;

  result.accessedAt = Date.now();
  store.put(result);
  return result;
}

export async function getAllCachedMessages(): Promise<GmailMessage[]> {
  const store = await tx(STORE_MESSAGES);
  const all = await idbRequest(store.getAll()) as CachedMessage[];
  return all.sort((a, b) => b.internalDate - a.internalDate);
}

async function evictIfNeeded(): Promise<void> {
  const store = await tx(STORE_MESSAGES, 'readwrite');
  const countReq = store.count();
  const count = await idbRequest(countReq);

  if (count <= MAX_CACHED_MESSAGES) return;

  const toEvict = count - MAX_CACHED_MESSAGES;
  const index = store.index('accessedAt');
  const cursor = index.openCursor();

  let evicted = 0;
  return new Promise((resolve, reject) => {
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (!c || evicted >= toEvict) {
        resolve();
        return;
      }
      c.delete();
      evicted++;
      c.continue();
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

// ── Outbox Queue ──

export async function queueOutbox(msg: OutboxMessage): Promise<void> {
  const store = await tx(STORE_OUTBOX, 'readwrite');
  await idbRequest(store.put(msg));
}

export async function getOutbox(): Promise<OutboxMessage[]> {
  const store = await tx(STORE_OUTBOX);
  const all = await idbRequest(store.getAll()) as OutboxMessage[];
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeFromOutbox(id: string): Promise<void> {
  const store = await tx(STORE_OUTBOX, 'readwrite');
  await idbRequest(store.delete(id));
}

export async function updateOutboxMessage(msg: OutboxMessage): Promise<void> {
  const store = await tx(STORE_OUTBOX, 'readwrite');
  await idbRequest(store.put(msg));
}

export async function getOutboxCount(): Promise<number> {
  const store = await tx(STORE_OUTBOX);
  return idbRequest(store.count());
}

// ── Preferences ──

interface PrefRecord {
  key: string;
  value: unknown;
}

export async function getPref<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const store = await tx(STORE_PREFS);
    const result = await idbRequest(store.get(key)) as PrefRecord | undefined;
    return result ? (result.value as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setPref(key: string, value: unknown): Promise<void> {
  const store = await tx(STORE_PREFS, 'readwrite');
  await idbRequest(store.put({ key, value }));
}
