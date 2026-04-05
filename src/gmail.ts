import { getAccessToken } from './auth.js';
import type { GmailMessage, GmailAttachment, GmailLabel } from './types.js';

const API_BASE = 'https://www.googleapis.com/gmail/v1/users/me';

let totalBytesTransferred = 0;

export function getTotalBytes(): number {
  return totalBytesTransferred;
}

async function gmailFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const method = (options.method || 'GET').toUpperCase();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (method === 'GET') {
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      totalBytesTransferred += parseInt(contentLength, 10);
    } else {
      const buf = await response.clone().arrayBuffer();
      totalBytesTransferred += buf.byteLength;
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail API error ${response.status}: ${text}`);
  }

  return response;
}

// ── List messages ──

interface ListResult {
  messages: Array<{ id: string; threadId: string }>;
  nextPageToken: string | null;
  resultSizeEstimate: number;
}

export async function listMessages(
  query?: string,
  pageToken?: string,
  labelIds?: string[],
  maxResults = 25
): Promise<ListResult> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    fields: 'messages(id,threadId),nextPageToken,resultSizeEstimate',
  });

  if (query) params.set('q', query);
  if (pageToken) params.set('pageToken', pageToken);
  if (labelIds?.length) {
    for (const id of labelIds) params.append('labelIds', id);
  }

  const response = await gmailFetch(`/messages?${params}`);
  const data = await response.json();

  return {
    messages: data.messages || [],
    nextPageToken: data.nextPageToken || null,
    resultSizeEstimate: data.resultSizeEstimate || 0,
  };
}

// ── Batch get message metadata ──

async function getMessageMetadata(id: string): Promise<GmailMessage> {
  const fields = 'id,threadId,labelIds,payload(headers),internalDate';

  const response = await gmailFetch(
    `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&fields=${encodeURIComponent(fields)}`
  );
  const data = await response.json();
  return parseMessageData(data);
}

export async function batchGetMetadata(
  ids: string[]
): Promise<GmailMessage[]> {
  if (ids.length === 0) return [];

  const results = await Promise.all(ids.map(id => getMessageMetadata(id)));
  return results;
}

// ── Get single message ──

export async function getMessage(id: string): Promise<GmailMessage> {
  const response = await gmailFetch(
    `/messages/${id}?format=full&fields=${encodeURIComponent(
      'id,threadId,labelIds,payload,internalDate,sizeEstimate'
    )}`
  );
  const data = await response.json();
  return parseMessageData(data, true);
}

// ── Send message ──

export interface SendAttachment {
  name: string;
  mimeType: string;
  data: string; // base64
}

export async function sendMessage(
  to: string,
  subject: string,
  body: string,
  options?: {
    cc?: string;
    bcc?: string;
    threadId?: string;
    inReplyTo?: string;
    attachments?: SendAttachment[];
  }
): Promise<string> {
  const hasAttachments = options?.attachments && options.attachments.length > 0;
  const boundary = `baremail_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const headers: string[] = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
  ];

  if (options?.cc) headers.push(`Cc: ${options.cc}`);
  if (options?.bcc) headers.push(`Bcc: ${options.bcc}`);
  if (options?.inReplyTo) {
    headers.push(`In-Reply-To: ${options.inReplyTo}`);
    headers.push(`References: ${options.inReplyTo}`);
  }

  let raw: string;

  if (hasAttachments) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    const parts: string[] = [
      headers.join('\r\n'),
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ];

    for (const att of options!.attachments!) {
      parts.push(
        `--${boundary}`,
        `Content-Type: ${att.mimeType}; name="${att.name}"`,
        `Content-Disposition: attachment; filename="${att.name}"`,
        'Content-Transfer-Encoding: base64',
        '',
        att.data,
      );
    }

    parts.push(`--${boundary}--`);
    raw = parts.join('\r\n');
  } else {
    headers.push('Content-Type: text/plain; charset=utf-8');
    raw = headers.join('\r\n') + '\r\n\r\n' + body;
  }

  const encoded = btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const payload: Record<string, unknown> = { raw: encoded };
  if (options?.threadId) payload.threadId = options.threadId;

  const response = await gmailFetch('/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return data.id;
}

// ── Modify message (labels, read/unread) ──

export async function modifyMessage(
  id: string,
  addLabelIds?: string[],
  removeLabelIds?: string[]
): Promise<void> {
  const body: Record<string, string[]> = {};
  if (addLabelIds?.length) body.addLabelIds = addLabelIds;
  if (removeLabelIds?.length) body.removeLabelIds = removeLabelIds;

  await gmailFetch(`/messages/${id}/modify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function markAsRead(id: string): Promise<void> {
  await modifyMessage(id, undefined, ['UNREAD']);
}

export async function markAsUnread(id: string): Promise<void> {
  await modifyMessage(id, ['UNREAD']);
}

export async function archiveMessage(id: string): Promise<void> {
  await modifyMessage(id, undefined, ['INBOX']);
}

export async function starMessage(id: string): Promise<void> {
  await modifyMessage(id, ['STARRED']);
}

export async function unstarMessage(id: string): Promise<void> {
  await modifyMessage(id, undefined, ['STARRED']);
}

export async function trashMessage(id: string): Promise<void> {
  await gmailFetch(`/messages/${id}/trash`, { method: 'POST' });
}

// ── Labels ──

export async function listLabels(): Promise<GmailLabel[]> {
  const response = await gmailFetch('/labels?fields=labels(id,name,type,messagesTotal,messagesUnread)');
  const data = await response.json();
  return (data.labels || []).map((l: Record<string, unknown>) => ({
    id: l.id as string,
    name: l.name as string,
    type: l.type as string,
    messagesTotal: l.messagesTotal as number | undefined,
    messagesUnread: l.messagesUnread as number | undefined,
  }));
}

// ── Parse helpers ──

function parseMessageData(data: Record<string, unknown>, full = false): GmailMessage {
  const payload = data.payload as Record<string, unknown> | undefined;
  const headers = (payload?.headers || []) as Array<{ name: string; value: string }>;
  const labelIds = (data.labelIds || []) as string[];

  const getHeader = (name: string) =>
    headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const fromRaw = getHeader('From');
  const fromMatch = fromRaw.match(/^"?([^"<]*)"?\s*<?([^>]*)>?$/);
  const fromName = fromMatch?.[1]?.trim() || fromRaw;
  const fromEmail = fromMatch?.[2]?.trim() || fromRaw;

  let body = '';
  let bodyHtml = '';
  const attachments: GmailAttachment[] = [];

  if (full && payload) {
    const result = extractParts(payload, data.id as string);
    body = result.plain;
    bodyHtml = result.html;
    attachments.push(...result.attachments);

    if (bodyHtml && (!body || body.trim().length < 20)) {
      body = htmlToPlainText(bodyHtml);
    }

    body = body.split('\n').map(l => l.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  return {
    id: data.id as string,
    threadId: data.threadId as string,
    labelIds,
    from: fromEmail,
    fromName,
    to: getHeader('To'),
    cc: getHeader('Cc'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    internalDate: parseInt(data.internalDate as string, 10) || 0,
    snippet: (data.snippet as string) || '',
    body,
    bodyHtml,
    isUnread: labelIds.includes('UNREAD'),
    isStarred: labelIds.includes('STARRED'),
    sizeEstimate: (data.sizeEstimate as number) || 0,
    hasAttachments: attachments.length > 0,
    attachments,
  };
}

function htmlToPlainText(htmlStr: string): string {
  try {
    const doc = new DOMParser().parseFromString(htmlStr, 'text/html');
    doc.querySelectorAll('style, script, head, noscript').forEach(el => el.remove());
    doc.querySelectorAll('img').forEach(el => {
      const w = el.getAttribute('width');
      const h = el.getAttribute('height');
      if ((w === '1' || w === '0') && (h === '1' || h === '0')) el.remove();
    });
    doc.querySelectorAll('[style]').forEach(el => {
      const s = (el.getAttribute('style') || '').toLowerCase();
      if (s.includes('display:none') || s.includes('display: none')) el.remove();
    });

    const blockTags = new Set([
      'div', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'li', 'tr', 'blockquote', 'section', 'article', 'hr', 'pre',
      'table', 'thead', 'tbody', 'tfoot',
    ]);

    const parts: string[] = [];
    let lastWasBlock = false;

    function walk(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent || '').replace(/\s+/g, ' ');
        if (text.trim()) {
          parts.push(text);
          lastWasBlock = false;
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      if (tag === 'hr') { parts.push('\n────────────────────────────\n'); lastWasBlock = true; return; }

      if (tag === 'a' && el.getAttribute('href')) {
        const href = el.getAttribute('href')!;
        const linkText = el.textContent?.trim() || '';
        if (linkText && linkText !== href) {
          parts.push(`${linkText} [${href}]`);
        } else {
          parts.push(href);
        }
        lastWasBlock = false;
        return;
      }

      const isBlock = blockTags.has(tag);
      if (isBlock && !lastWasBlock && parts.length > 0) {
        parts.push('\n');
        lastWasBlock = true;
      }

      for (const child of el.childNodes) walk(child);

      if (isBlock && !lastWasBlock) {
        parts.push('\n');
        lastWasBlock = true;
      }
    }

    walk(doc.body);
    return parts.join('')
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return htmlStr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

interface ExtractResult {
  plain: string;
  html: string;
  attachments: GmailAttachment[];
}

function extractParts(payload: Record<string, unknown>, messageId: string): ExtractResult {
  const result: ExtractResult = { plain: '', html: '', attachments: [] };
  const mimeType = payload.mimeType as string || '';

  if (mimeType === 'text/plain' && payload.body) {
    const bodyData = (payload.body as Record<string, unknown>).data as string;
    if (bodyData) result.plain = decodeBase64Url(bodyData);
  } else if (mimeType === 'text/html' && payload.body) {
    const bodyData = (payload.body as Record<string, unknown>).data as string;
    if (bodyData) result.html = decodeBase64Url(bodyData);
  }

  if (payload.filename && (payload.filename as string).length > 0) {
    const body = payload.body as Record<string, unknown> | undefined;
    result.attachments.push({
      filename: payload.filename as string,
      mimeType,
      size: (body?.size as number) || 0,
      attachmentId: (body?.attachmentId as string) || '',
      messageId,
    });
  }

  const parts = (payload.parts || []) as Array<Record<string, unknown>>;
  for (const part of parts) {
    const sub = extractParts(part, messageId);
    if (!result.plain && sub.plain) result.plain = sub.plain;
    if (!result.html && sub.html) result.html = sub.html;
    result.attachments.push(...sub.attachments);
  }

  return result;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
  } catch {
    try {
      return atob(base64);
    } catch {
      return data;
    }
  }
}

// ── Download attachment ──

export async function getAttachment(messageId: string, attachmentId: string): Promise<Blob> {
  const response = await gmailFetch(
    `/messages/${messageId}/attachments/${attachmentId}`
  );
  const data = await response.json();
  const base64 = (data.data as string).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes]);
}
