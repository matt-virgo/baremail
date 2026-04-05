import type { BaremailConfig } from './types.js';

let config: BaremailConfig | null = null;

export function getConfig(): BaremailConfig {
  if (config) return config;

  if (window.BAREMAIL_CONFIG) {
    config = window.BAREMAIL_CONFIG;
    return config;
  }

  throw new Error(
    'BareMail config not found. Copy config.example.js to config.js and add your Google OAuth client ID.'
  );
}

export function isConfigured(): boolean {
  try {
    const c = getConfig();
    return c.GOOGLE_CLIENT_ID !== '' && !c.GOOGLE_CLIENT_ID.includes('YOUR_CLIENT_ID');
  } catch {
    return false;
  }
}
