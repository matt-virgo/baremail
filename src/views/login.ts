import { h } from 'preact';
import htm from 'htm';
import { login } from '../auth.js';
import { isConfigured } from '../config.js';

const html = htm.bind(h);

const ASCII_LOGO = `╭──────────────────╮
│   ██████╗  █████╗ ██████╗ ███████╗   │
│   ██╔══██╗██╔══██╗██╔══██╗██╔════╝   │
│   ██████╔╝███████║██████╔╝█████╗     │
│   ██╔══██╗██╔══██║██╔══██╗██╔══╝     │
│   ██████╔╝██║  ██║██║  ██║███████╗   │
│   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   │
│              m  a  i  l              │
╰──────────────────╯`;

export function LoginView() {
  const configured = isConfigured();

  const handleLogin = () => {
    login();
  };

  return html`
    <div class="login fade-in">
      <div class="login-bear">ʕ·ᴥ·ʔ</div>
      <pre class="login-logo">${ASCII_LOGO}</pre>

      <p class="login-desc">
        a minimal gmail client for bad wifi.<br/>
        read, reply, and compose — all under 200KB.<br/>
        your data never touches a third-party server.
      </p>

      ${!configured && html`
        <div style="margin-bottom: 24px; padding: 12px; border: 1px dashed var(--amber-dim); color: var(--amber-dim); font-size: 11px; max-width: 400px; margin-left: auto; margin-right: auto;">
          <strong>setup needed:</strong> copy config.example.js to config.js<br/>
          and add your Google OAuth client ID.<br/>
          see README.md for instructions.
        </div>
      `}

      <button class="btn btn-primary" onClick=${handleLogin} style="padding: 12px 32px; font-size: 13px;">
        sign in with google →
      </button>

      <div class="login-privacy">
        <span class="login-privacy-bear">ʕ·ᴥ·ʔ</span>
        <span class="login-privacy-body">
          baremail runs entirely in your browser.<br/>
          no backend. no tracking. no data collection.<br/>
          emails go directly between you and gmail's api.
        </span>
        <span class="login-privacy-footer">
          open source · MIT license · baremail.app
        </span>
      </div>
    </div>
  `;
}
