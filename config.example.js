// BareMail Configuration
// Copy this file to config.js and fill in your Google OAuth credentials.
//
// Setup (see README.md for full walkthrough):
//
// 1. Go to https://console.cloud.google.com/
// 2. Create a project → enable Gmail API
// 3. Configure OAuth consent screen:
//    - User type: External
//    - Add your Gmail address as a TEST USER (required!)
// 4. Create OAuth credentials (APIs & Services → Credentials → OAuth client ID):
//    - Application type: Web application
//    - Authorized JavaScript origins: http://localhost:3000
//    - Authorized redirect URIs: http://localhost:3000
// 5. Copy the Client ID below

window.BAREMAIL_CONFIG = {
  GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'YOUR_CLIENT_SECRET',
  GOOGLE_REDIRECT_URI: window.location.origin,
};
