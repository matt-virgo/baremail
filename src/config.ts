import type { BaremailConfig } from './types.js';

const LS_KEY = 'baremail_config';

let config: BaremailConfig | null = null;

function loadFromLocalStorage(): BaremailConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.GOOGLE_CLIENT_ID && !parsed.GOOGLE_CLIENT_ID.includes('YOUR_CLIENT_ID')) {
      return {
        GOOGLE_CLIENT_ID: parsed.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: parsed.GOOGLE_CLIENT_SECRET || undefined,
        GOOGLE_REDIRECT_URI: parsed.GOOGLE_REDIRECT_URI || window.location.origin,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveConfig(clientId: string, clientSecret: string): void {
  const cfg: BaremailConfig = {
    GOOGLE_CLIENT_ID: clientId.trim(),
    GOOGLE_CLIENT_SECRET: clientSecret.trim() || undefined,
    GOOGLE_REDIRECT_URI: window.location.origin,
  };
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  config = cfg;
}

export function getConfig(): BaremailConfig {
  if (config) return config;

  const fromLs = loadFromLocalStorage();
  if (fromLs) {
    config = fromLs;
    return config;
  }

  if (window.BAREMAIL_CONFIG) {
    config = window.BAREMAIL_CONFIG;
    return config;
  }

  throw new Error(
    'BareMail config not found. Copy config.example.js to config.js and add your Google OAuth client ID.'
  );
}

export function clearConfig(): void {
  localStorage.removeItem(LS_KEY);
  config = null;
}

export function isConfigured(): boolean {
  try {
    const c = getConfig();
    return c.GOOGLE_CLIENT_ID !== '' && !c.GOOGLE_CLIENT_ID.includes('YOUR_CLIENT_ID');
  } catch {
    return false;
  }
}
