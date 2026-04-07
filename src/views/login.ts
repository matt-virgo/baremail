import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import htm from 'htm';
import { login } from '../auth.js';
import { isConfigured, saveConfig, clearConfig } from '../config.js';

const html = htm.bind(h);

const ASCII_LOGO = `╭──────────────────╮
│   ██████╗  █████╗ ██████╗ ███████╗   │
│   ██╔══██╗██╔══██╗██╔══██╗██╔════╝   │
│   ██████╔╝███████║██████╔╝█████╗     │
│   ██╔══██╗██╔══██║██╔══██╗██╔══╝     │
│   ██████╔╝██║  ██║██║  ██║███████╗   │
│   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   │
│              M  A  I  L              │
╰──────────────────╯`;

const TOTAL_STEPS = 7;

const STEPS = [
  {
    title: 'create a google cloud project',
    link: 'https://console.cloud.google.com/projectcreate',
    linkLabel: 'open google cloud console →',
    instructions: html`
      <p>click the link below to create a new google cloud project. name it anything you like (e.g. "BAREMAIL").</p>
      <p>if you already have a project you want to use, you can skip this step.</p>
    `,
    troubleTitle: 'need a google account?',
    troubleBody: html`you need a google account to create a cloud project. any gmail account works — the project is free and no billing is required. <a href="https://accounts.google.com/" target="_blank" rel="noopener" style="color: var(--amber-dim);">create one here</a>.`,
  },
  {
    title: 'enable the gmail API',
    link: 'https://console.cloud.google.com/apis/library/gmail.googleapis.com',
    linkLabel: 'open gmail API page →',
    instructions: html`
      <p>click the link below, select the project you just created from the dropdown at the top, then click the blue <strong>enable</strong> button.</p>
    `,
    troubleTitle: 'don\'t see the enable button?',
    troubleBody: 'make sure you\'ve selected the correct project from the dropdown at the top of the page. if the button says "manage" instead, the API is already enabled.',
  },
  {
    title: 'configure the OAuth consent screen',
    link: 'https://console.cloud.google.com/apis/credentials/consent',
    linkLabel: 'open consent screen settings →',
    instructions: html`
      <p>this tells google what your app is:</p>
      <ol class="wizard-instructions">
        <li>click the blue <strong>get started</strong> button</li>
        <li>app name: <strong>BAREMAIL</strong> (or anything)</li>
        <li>user support email: <strong>your email</strong> → click <strong>next</strong></li>
        <li>audience: select <strong>external</strong> → click <strong>next</strong></li>
        <li>contact email: <strong>your email</strong> → click <strong>next</strong></li>
        <li>agree to terms → click <strong>continue</strong></li>
        <li>click <strong>create</strong></li>
      </ol>
    `,
    troubleTitle: 'what is the consent screen for?',
    troubleBody: 'the consent screen is what users see when they sign in. since you\'re the only user, the details don\'t matter much — just fill in the required fields and move on.',
  },
  {
    title: 'add yourself as a test user',
    link: 'https://console.cloud.google.com/auth/audience',
    linkLabel: 'open audience page →',
    instructions: html`
      <p><strong>this step is required</strong> — without it, you'll get "access blocked" when signing in.</p>
      <ol class="wizard-instructions">
        <li>click the link below to open the <strong>audience</strong> page</li>
        <li>scroll down to <strong>test users</strong></li>
        <li>click <strong>+ add users</strong></li>
        <li>enter your gmail address (e.g. <strong>you@gmail.com</strong>)</li>
        <li>click <strong>save</strong></li>
      </ol>
    `,
    troubleTitle: 'why is this needed?',
    troubleBody: 'your app starts in "testing" mode, which means only emails you explicitly add as test users can sign in. this is a google requirement — you can\'t skip it.',
  },
  {
    title: 'mobile install (optional)',
    link: 'https://ngrok.com/download',
    linkLabel: 'download ngrok →',
    instructions: html`
      <p><strong>skip this step if you only want BAREMAIL on your computer.</strong></p>
      <p>to install BAREMAIL as a PWA on your phone, you need an HTTPS tunnel. <a href="https://ngrok.com" target="_blank" rel="noopener" style="color: var(--amber-dim);">ngrok</a> is free and takes ~1 minute:</p>
      <ol class="wizard-instructions">
        <li>install ngrok: <strong>brew install ngrok</strong> (mac) or download from the link below</li>
        <li>create a free account at <a href="https://dashboard.ngrok.com/signup" target="_blank" rel="noopener" style="color: var(--amber-dim);">ngrok.com</a> and copy your auth token</li>
        <li>run: <strong>ngrok config add-authtoken YOUR_TOKEN</strong></li>
        <li>with BAREMAIL running (<strong>npm start</strong>), open a new terminal and run: <strong>ngrok http 3000</strong></li>
        <li>copy the <strong>https://xxxx.ngrok-free.app</strong> URL — you'll add it in the next step</li>
      </ol>
    `,
    troubleTitle: 'what is ngrok?',
    troubleBody: 'ngrok creates a secure public URL that tunnels to your local server. this is needed because iPhones require HTTPS to install PWAs, and localhost doesn\'t work from other devices. the free tier is all you need.',
  },
  {
    title: 'create OAuth credentials',
    link: 'https://console.cloud.google.com/apis/credentials/oauthclient',
    linkLabel: 'open credentials page →',
    instructions: html`
      <p>create the credentials BAREMAIL needs to connect to gmail:</p>
      <ol class="wizard-instructions">
        <li>click <strong>+ create client</strong></li>
        <li>application type: <strong>web application</strong></li>
        <li>name: <strong>BAREMAIL</strong> (or anything)</li>
        <li>authorized javascript origins: add <strong>http://localhost:3000</strong></li>
        <li>authorized redirect URIs: add <strong>http://localhost:3000</strong></li>
        <li>if you set up ngrok in the previous step, also add your <strong>https://xxxx.ngrok-free.app</strong> URL to both fields above</li>
        <li>click <strong>create</strong></li>
        <li>you'll see a dialog with your <strong>client ID</strong> and <strong>client secret</strong> — keep this open for the next step</li>
      </ol>
    `,
    troubleTitle: 'getting a "configure consent screen first" error?',
    troubleBody: 'go back to step 3 and make sure you completed the consent screen setup. you need to click through all the way to "back to dashboard" before creating credentials.',
  },
  {
    title: 'paste your credentials',
    link: null,
    linkLabel: null,
    instructions: html`
      <p>paste the client ID and client secret from the dialog you just saw. BAREMAIL stores these locally in your browser — they never leave your machine.</p>
      <p style="margin-top: 8px; opacity: 0.8; font-size: 12px;">📱 <strong>setting up on a new device?</strong> enter the same client ID and secret from your existing google cloud project — find them at <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" style="color: var(--amber-dim);">APIs & Services → Credentials</a>.</p>
    `,
    troubleTitle: 'where do i find these?',
    troubleBody: 'go to APIs & Services → Credentials in the cloud console. click on the OAuth client you just created to see the client ID and secret again.',
  },
];

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [expandedTrouble, setExpandedTrouble] = useState(-1);
  const [error, setError] = useState('');

  const current = STEPS[step];
  const isLastStep = step === TOTAL_STEPS - 1;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      if (!clientId.trim() || !clientId.includes('.apps.googleusercontent.com')) {
        setError('paste a valid client ID (ends with .apps.googleusercontent.com)');
        return;
      }
      setError('');
      saveConfig(clientId, clientSecret);
      onComplete();
      return;
    }
    setStep(s => s + 1);
    setExpandedTrouble(-1);
  }, [step, clientId, clientSecret, isLastStep, onComplete]);

  const handleBack = useCallback(() => {
    setStep(s => s - 1);
    setExpandedTrouble(-1);
    setError('');
  }, []);

  const toggleTrouble = useCallback(() => {
    setExpandedTrouble(prev => prev === step ? -1 : step);
  }, [step]);

  return html`
    <div class="wizard fade-in">
      <div class="wizard-header">
        <span class="wizard-bear">ʕ·ᴥ·ʔ</span>
        <span class="wizard-title">setup guide</span>
        <span class="wizard-time">~3 minutes</span>
      </div>

      <div class="wizard-progress">
        ${STEPS.map((_s, i) => html`
          <div class="wizard-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}"
               onClick=${() => i < step && (setStep(i), setExpandedTrouble(-1))} />
        `)}
      </div>

      <div class="wizard-step-label">step ${step + 1} of ${TOTAL_STEPS}</div>

      <div class="wizard-step fade-in" key=${step}>
        <h3 class="wizard-step-title">${current.title}</h3>

        <div class="wizard-body">
          ${current.instructions}
        </div>

        ${current.link && html`
          <a href=${current.link} target="_blank" rel="noopener" class="btn btn-primary wizard-link">
            ${current.linkLabel}
          </a>
        `}

        ${isLastStep && html`
          <div class="wizard-credentials">
            <label class="wizard-field">
              <span class="wizard-field-label">client ID</span>
              <input
                type="text"
                class="wizard-input"
                placeholder="xxxxxxxxx.apps.googleusercontent.com"
                value=${clientId}
                onInput=${(e: Event) => { setClientId((e.target as HTMLInputElement).value); setError(''); }}
              />
            </label>
            <label class="wizard-field">
              <span class="wizard-field-label">client secret</span>
              <input
                type="text"
                class="wizard-input"
                placeholder="GOCSPX-xxxxxxxxx (optional with PKCE)"
                value=${clientSecret}
                onInput=${(e: Event) => setClientSecret((e.target as HTMLInputElement).value)}
              />
            </label>
            ${error && html`<div class="wizard-error">${error}</div>`}
          </div>
        `}

        <div class="wizard-trouble">
          <button class="wizard-trouble-toggle" onClick=${toggleTrouble}>
            ${expandedTrouble === step ? '▾' : '▸'} ${current.troubleTitle}
          </button>
          ${expandedTrouble === step && html`
            <div class="wizard-trouble-body">${current.troubleBody}</div>
          `}
        </div>
      </div>

      <div class="wizard-nav">
        ${step > 0
          ? html`<button class="btn btn-secondary" onClick=${handleBack}>← back</button>`
          : html`<div />`
        }
        <button class="btn btn-primary" onClick=${handleNext}>
          ${isLastStep ? 'save and sign in →' : step === 4 ? 'skip — desktop only →' : 'done, next step →'}
        </button>
      </div>
    </div>
  `;
}

export function LoginView() {
  const [configured, setConfigured] = useState(isConfigured());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleLogin = () => {
    login();
  };

  const handleWizardComplete = useCallback(() => {
    setConfigured(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    setShowResetConfirm(false);
    clearConfig();
    setConfigured(false);
  }, []);

  if (!configured) {
    return html`
      <div class="login login-compact fade-in">
        <div class="login-brand-row">
          <span class="login-brand-bear">ʕ·ᴥ·ʔ</span>
          <span class="login-brand-name">BAREMAIL</span>
        </div>
        <p class="login-compact-desc">
          a minimal gmail client for bad wifi. read, reply, and compose — all under 200KB. your data never touches a third-party server.
        </p>
        <${SetupWizard} onComplete=${handleWizardComplete} />
      </div>
    `;
  }

  return html`
    <div class="login fade-in">
      <div class="login-bear">ʕ·ᴥ·ʔ</div>
      <pre class="login-logo">${ASCII_LOGO}</pre>

      <p class="login-desc">
        a minimal gmail client for bad wifi.<br/>
        read, reply, and compose — all under 200KB.<br/>
        your data never touches a third-party server.
      </p>

      <button class="btn btn-primary" onClick=${handleLogin} style="padding: 12px 32px; font-size: 13px;">
        sign in with google →
      </button>

      <button class="login-reset-link" onClick=${() => setShowResetConfirm(true)}>
        reset oauth config
      </button>

      ${showResetConfirm && html`
        <div class="modal-overlay" onClick=${() => setShowResetConfirm(false)}>
          <div class="modal" onClick=${(e: Event) => e.stopPropagation()}>
            <div class="modal-title">reset oauth config?</div>
            <div class="modal-body">
              <p>this will remove your saved Google OAuth credentials from this browser. you'll need to go through the setup wizard again to sign back in.</p>
              <p>your Google Cloud project and credentials are <strong>not</strong> deleted — only the local reference to them.</p>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" onClick=${() => setShowResetConfirm(false)}>cancel</button>
              <button class="btn btn-primary modal-btn-danger" onClick=${handleResetConfirm}>reset config</button>
            </div>
          </div>
        </div>
      `}

      <div class="login-privacy">
        <span class="login-privacy-bear">ʕ·ᴥ·ʔ</span>
        <span class="login-privacy-body">
          BAREMAIL runs entirely in your browser.<br/>
          no backend. no tracking. no data collection.<br/>
          emails go directly between you and gmail's api.
        </span>
        <span class="login-privacy-footer">
          open source · MIT license · BAREMAIL.app
        </span>
      </div>
    </div>
  `;
}
