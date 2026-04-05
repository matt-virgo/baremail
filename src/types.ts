export interface BaremailConfig {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  from: string;
  fromName: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  internalDate: number;
  snippet: string;
  body: string;
  bodyHtml: string;
  isUnread: boolean;
  isStarred: boolean;
  sizeEstimate: number;
  hasAttachments: boolean;
  attachments: GmailAttachment[];
}

export interface GmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  messageId: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

export interface OutboxMessage {
  id: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  createdAt: number;
  attempts: number;
  lastAttempt?: number;
  error?: string;
}

export interface ComposeData {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  isReply?: boolean;
  isForward?: boolean;
}

export type View = 'login' | 'inbox' | 'reader' | 'compose';

export type ConnectionStatus = 'online' | 'slow' | 'offline';

export interface AppState {
  view: View;
  authenticated: boolean;
  emails: GmailMessage[];
  selectedEmail: GmailMessage | null;
  composeData: ComposeData;
  labels: GmailLabel[];
  activeLabel: string;
  searchQuery: string;
  loading: boolean;
  connectionStatus: ConnectionStatus;
  outboxCount: number;
  nextPageToken: string | null;
  theme: 'dark' | 'light';
  totalBytes: number;
}

declare global {
  interface Window {
    BAREMAIL_CONFIG?: BaremailConfig;
  }
}
