import { getConfig } from './config.js';
import { getPref, setPref, deletePref, clearAllData } from './cache.js';

const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

const TOKEN_PREF_KEY = 'auth_tokens';

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  id_token?: string;
}

let tokenData: TokenData | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier);
  return base64urlEncode(hashed);
}

export async function login(): Promise<void> {
  const config = getConfig();
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  sessionStorage.setItem('baremail_code_verifier', codeVerifier);
  sessionStorage.setItem('baremail_oauth_state', state);

  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: config.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'offline',
    prompt: 'select_account consent',
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function handleOAuthCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');

  if (error) {
    console.error('OAuth error:', error);
    cleanupUrl();
    return false;
  }

  if (!code) return false;

  const savedState = sessionStorage.getItem('baremail_oauth_state');
  if (state !== savedState) {
    console.error('OAuth state mismatch');
    cleanupUrl();
    return false;
  }

  const codeVerifier = sessionStorage.getItem('baremail_code_verifier');
  if (!codeVerifier) {
    console.error('Missing code verifier');
    cleanupUrl();
    return false;
  }

  const config = getConfig();

  try {
    const tokenParams: Record<string, string> = {
      code,
      client_id: config.GOOGLE_CLIENT_ID,
      redirect_uri: config.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    };
    if (config.GOOGLE_CLIENT_SECRET) {
      tokenParams.client_secret = config.GOOGLE_CLIENT_SECRET;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Token exchange failed:', text);
      cleanupUrl();
      return false;
    }

    const data = await response.json();

    tokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000,
      id_token: data.id_token,
    };

    await persistTokens();
    scheduleRefresh();

    sessionStorage.removeItem('baremail_code_verifier');
    sessionStorage.removeItem('baremail_oauth_state');
    cleanupUrl();

    return true;
  } catch (err) {
    console.error('Token exchange error:', err);
    cleanupUrl();
    return false;
  }
}

function cleanupUrl() {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, '', url.toString());
}

async function refreshAccessToken(): Promise<boolean> {
  if (!tokenData?.refresh_token) return false;

  const config = getConfig();

  try {
    const refreshParams: Record<string, string> = {
      refresh_token: tokenData.refresh_token,
      client_id: config.GOOGLE_CLIENT_ID,
      grant_type: 'refresh_token',
    };
    if (config.GOOGLE_CLIENT_SECRET) {
      refreshParams.client_secret = config.GOOGLE_CLIENT_SECRET;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(refreshParams),
    });

    if (!response.ok) return false;

    const data = await response.json();
    tokenData = {
      ...tokenData,
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000,
    };

    await persistTokens();
    scheduleRefresh();
    return true;
  } catch {
    return false;
  }
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  if (!tokenData) return;

  const delay = Math.max(0, tokenData.expires_at - Date.now() - 120000);
  refreshTimer = setTimeout(() => refreshAccessToken(), delay);
}

async function persistTokens(): Promise<void> {
  if (!tokenData) return;
  try {
    await setPref(TOKEN_PREF_KEY, tokenData);
  } catch {
    // Storage may be unavailable
  }
}

async function loadPersistedTokens(): Promise<boolean> {
  try {
    const data = await getPref<TokenData | null>(TOKEN_PREF_KEY, null);
    if (!data) return false;

    if (data.expires_at < Date.now() && !data.refresh_token) {
      await deletePref(TOKEN_PREF_KEY);
      return false;
    }

    tokenData = data;
    if (tokenData.expires_at < Date.now() && tokenData.refresh_token) {
      refreshAccessToken();
    } else {
      scheduleRefresh();
    }
    return true;
  } catch {
    return false;
  }
}

export async function getAccessToken(): Promise<string> {
  if (!tokenData) throw new Error('Not authenticated');

  if (tokenData.expires_at < Date.now()) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) throw new Error('Token expired and refresh failed');
  }

  return tokenData.access_token;
}

export function isAuthenticated(): boolean {
  return tokenData !== null;
}

export async function initAuth(): Promise<boolean> {
  return loadPersistedTokens();
}

export async function logout(): Promise<void> {
  tokenData = null;
  if (refreshTimer) clearTimeout(refreshTimer);
  localStorage.removeItem('baremail_tokens');
  await clearAllData();
}

// Parsed without signature verification — used only for display, never for
// authorization decisions. The token comes directly from Google's token
// endpoint over TLS, so tampering is not a practical concern.
export function getUserEmail(): string | null {
  if (!tokenData?.id_token) return null;
  try {
    const payload = JSON.parse(atob(tokenData.id_token.split('.')[1]));
    return payload.email || null;
  } catch {
    return null;
  }
}
