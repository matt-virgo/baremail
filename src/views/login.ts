import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import htm from 'htm';
import { login } from '../auth.js';
import { isConfigured, saveConfig } from '../config.js';

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

const TOTAL_STEPS = 5;

const STEPS = [
  {
    title: 'create a google cloud project',
    link: 'https://console.cloud.google.com/projectcreate',
    linkLabel: 'open google cloud console →',
    instructions: html`
      <p>click the link below to create a new google cloud project. name it anything you like (e.g. "baremail").</p>
      <p>if you already have a project you want to use, you can skip this step.</p>
    `,
    troubleTitle: 'need a google account?',
    troubleBody: 'you need a google account to create a cloud project. any gmail account works — the project is free and no billing is required.',
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
      <p>this tells google what your app is. fill in these fields:</p>
      <ol class="wizard-instructions">
        <li>select user type: <strong>external</strong>, then click create</li>
        <li>app name: <strong>BAREmail</strong> (or anything)</li>
        <li>user support email: <strong>your email</strong></li>
        <li>developer contact: <strong>your email</strong></li>
        <li>click <strong>save and continue</strong> through scopes (no changes needed)</li>
        <li>on test users, click <strong>add users</strong> and enter your gmail address</li>
        <li>click <strong>save and continue</strong>, then <strong>back to dashboard</strong></li>
      </ol>
    `,
    troubleTitle: 'why do i need to add myself as a test user?',
    troubleBody: 'your app starts in "testing" mode, which means only emails you explicitly add as test users can sign in. without this, you\'ll see "access blocked" when trying to log in.',
  },
  {
    title: 'create OAuth credentials',
    link: 'https://console.cloud.google.com/apis/credentials/oauthclient',
    linkLabel: 'open credentials page →',
    instructions: html`
      <p>create the credentials baremail needs to connect to gmail:</p>
      <ol class="wizard-instructions">
        <li>application type: <strong>web application</strong></li>
        <li>name: <strong>BAREmail</strong> (or anything)</li>
        <li>authorized javascript origins: add <strong>http://localhost:3000</strong></li>
        <li>authorized redirect URIs: add <strong>http://localhost:3000</strong></li>
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
      <p>paste the client ID and client secret from the dialog you just saw. baremail stores these locally in your browser — they never leave your machine.</p>
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
          ${isLastStep ? 'save and sign in →' : 'done, next step →'}
        </button>
      </div>
    </div>
  `;
}

export function LoginView() {
  const [configured, setConfigured] = useState(isConfigured());

  const handleLogin = () => {
    login();
  };

  const handleWizardComplete = useCallback(() => {
    setConfigured(true);
  }, []);

  if (!configured) {
    return html`
      <div class="login fade-in">
        <div class="login-bear">ʕ·ᴥ·ʔ</div>
        <pre class="login-logo">${ASCII_LOGO}</pre>
        <p class="login-desc">
          a minimal gmail client for bad wifi.<br/>
          read, reply, and compose — all under 200KB.<br/>
          your data never touches a third-party server.
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
