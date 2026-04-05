# BareMail — Email's Bare Necessities

## Overview

BareMail is an open-source Progressive Web App that provides a minimal Gmail interface optimized for extremely low-bandwidth environments — airplane wifi, rural connections, developing regions, or any situation where Gmail's full interface is too heavy to use.

**Design philosophy:** Every byte over the wire should be email content, not UI. The app shell loads once on good bandwidth and is cached permanently by the service worker. After that, the only network traffic is Gmail API JSON — the UI itself costs zero bytes on subsequent visits.

---

## Problem

Gmail's web interface transfers several megabytes on initial load and continues to make heavy background requests. On connections with 50-200 Kbps throughput (typical airplane wifi), this results in 30-60+ second load times, frequent timeouts, and an essentially unusable experience — even though the user may just want to read a few text emails and send a short reply.

## Goals

- **App shell under 200KB** (HTML + CSS + JS, gzipped) — loaded once on good bandwidth, then cached by service worker
- **Inbox load in under 5KB** of API data (metadata only, 25 messages)
- **Full message fetch under 2KB** for a typical text email
- **Offline-first:** read cached emails, compose and queue messages with no connection
- **Zero-install:** works in any modern browser, installable as a PWA
- **Open source and self-hostable**

## Non-Goals

- Replacing Gmail for daily desktop use
- Rich text composition (HTML emails)
- Attachment viewing/editing inline
- Full label/filter management
- Calendar or Meet integration

---

## Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│                                              │
│  ┌────────────┐  ┌────────────────────────┐  │
│  │  App Shell  │  │    Service Worker       │  │
│  │  (cached)   │  │  - Cache management     │  │
│  │             │  │  - Offline queue         │  │
│  │  - Inbox    │  │  - Background sync      │  │
│  │  - Reader   │  │  - Request interception  │  │
│  │  - Compose  │  │                          │  │
│  └──────┬─────┘  └──────────┬───────────────┘  │
│         │                   │                   │
└─────────┼───────────────────┼───────────────────┘
          │                   │
          ▼                   ▼
   ┌─────────────────────────────────┐
   │        Gmail REST API           │
   │  (googleapis.com/gmail/v1)      │
   └─────────────────────────────────┘
```

### Key Decision: No Backend Server

The app runs entirely client-side. OAuth is handled via Google's client-side flow (PKCE). This means:

- No server to host or maintain
- Can be deployed as static files (GitHub Pages, Netlify, Cloudflare Pages)
- Users' email data never touches a third-party server
- Contributors can run it locally with zero setup

The tradeoff is that each user (or self-hoster) needs their own Google Cloud project with OAuth credentials, unless we register a shared one and go through Google's verification process. More on this in the Open Source section below.

---

## Core Features

### 1. Inbox View

**What loads:**
- `messages.list` returns message IDs and thread IDs (~1KB for 25 messages)
- `messages.get` with `format=metadata` and `metadataHeaders=From,Subject,Date` for each visible message
- Batched into a single HTTP request using Gmail's batch endpoint

**Display:**
- Flat list: sender, subject, date, read/unread indicator
- No avatars, no snippets (saves a field per message), no attachment icons
- Pagination via "Load more" (no infinite scroll — saves bandwidth on accidental scrolling)
- Unread count in the PWA badge / page title

**Bandwidth budget:** ~3-5KB for 25 inbox items after gzip

### 2. Message Reader

**What loads:**
- `messages.get` with `format=full`
- Extract `text/plain` part only; ignore `text/html`
- If no plain text part exists, show a notice: "This email is HTML-only. [Load HTML version]" (user opts in to the heavier payload)

**Display:**
- From, To, CC, Date, Subject as a simple header block
- Plain text body, preserving line breaks
- Attachment list (filename + size) with individual download buttons — nothing downloaded automatically
- Reply / Forward buttons

**Bandwidth budget:** ~1-3KB for a typical text email

### 3. Compose / Reply

**What it does:**
- Plain text only. No formatting toolbar, no signature editor
- To, CC, BCC, Subject fields
- Reply prefills the recipient, subject (`Re: ...`), and quoted text
- Forward prefills subject (`Fwd: ...`) and body

**Offline behavior:**
- If online: send immediately via `messages.send`
- If offline: save to IndexedDB outbox queue, show "Queued" badge
- When connectivity returns, service worker sends via background sync

**Attachment support:**
- Allow attaching files, but warn on file size ("This is a 4MB file. On your current connection, this may take ~3 minutes to send.")
- Optional: defer attachment send — queue it for when bandwidth improves

**Email footer (opt-out):**
- All outgoing emails include a one-line footer by default: `ʕ·ᴥ·ʔ sent with baremail — email for bad wifi — baremail.app`
- Serves dual purpose: explains why the email is plain text (so recipients don't think something is broken), and provides organic discovery for the project
- Enabled by default for the first ~10 emails, then prompts the user: "Want to keep the BareMail footer? It helps others discover the project." User can disable at any time in settings

### 4. Search

- Uses Gmail's native `messages.list` with a `q` parameter (same syntax as Gmail search: `from:alice subject:invoice`) when online
- Offline: MiniSearch indexes cached messages locally for instant search without network
- Results displayed identically to inbox

### 5. Labels

- Sidebar shows Gmail labels (minimal: Inbox, Sent, Drafts, Starred, + user labels)
- Tapping a label filters the message list
- No label creation/editing/coloring (use full Gmail for that)

---

## Offline Strategy

### Service Worker Caching

| Resource | Strategy | Rationale |
|---|---|---|
| App shell (HTML, CSS, JS) | Cache-first, update in background | UI loads instantly, updates silently |
| Gmail API responses | Network-first, fall back to cache | Show fresh data when possible, cached data when offline |
| Message bodies | Cache on read | Once you've opened an email, it's available offline forever (until cache is pruned) |

### IndexedDB Storage

- **Message cache:** Store fetched message metadata and bodies locally. Cap at ~1000 messages or 10MB, LRU eviction.
- **Outbox queue:** Unsent messages with retry metadata (attempts, last tried, error).
- **User preferences:** Theme, default label, signature text.

### Background Sync

When the browser regains connectivity:
1. Flush the outbox queue (oldest first)
2. Refresh inbox metadata
3. Update the service worker if a new version is available

---

## Authentication

### OAuth 2.0 with PKCE

- Use Google Identity Services (GIS) for the OAuth flow
- PKCE (Proof Key for Code Exchange) — no client secret needed, safe for public clients
- Scopes requested:
  - `gmail.readonly` — read messages and labels
  - `gmail.send` — send messages
  - `gmail.modify` — mark read/unread, archive, label changes
- Token stored in memory (not localStorage for security) with a refresh token in an HttpOnly cookie if using a thin auth proxy, or in IndexedDB encrypted at rest if fully client-side
- Token refresh handled transparently by the service worker

### Self-Hosting OAuth

For the open-source case:
1. User creates a Google Cloud project
2. Enables Gmail API
3. Creates OAuth credentials (web application type)
4. Sets the redirect URI to their deployment URL
5. Adds their client ID to a config file or environment variable

The README should include a step-by-step guide with screenshots for this process.

---

## UI / UX Design Principles

### Visual Design

- **No images.** Zero image assets in the UI. Icons are Unicode characters and ASCII art.
- **One web font allowed.** IBM Plex Mono (~15KB gzipped) for the retro terminal aesthetic. Falls back to system monospace.
- **Two themes:** Light and dark, respecting `prefers-color-scheme` by default with manual toggle.
- **Single-column layout.** No sidebar on mobile. Sidebar is collapsible on desktop. The inbox list and message reader are separate views, not side-by-side panes.

### Interaction Design

- **Lightweight framework allowed.** Preact (~4KB) or similar for better DX. The 200KB budget accommodates this since the app shell is a one-time download cached by the service worker.
- **Subtle animations welcome.** CSS transitions for view changes, the BareMail bear, and micro-interactions. Keep them lightweight — no animation libraries.
- **Aggressive lazy loading.** Nothing loads until requested. Message bodies load on tap. Avatars never load.
- **Visible connection status.** A persistent banner showing connection state: "Online", "Slow connection", "Offline (X messages queued)".

### Bandwidth Indicator

Show estimated transfer sizes before actions:
- "Load 25 more messages (~4KB)"
- "Download attachment: quarterly-report.pdf (2.4MB)"
- "Send message (~1KB)" / "Send message with attachment (~3.5MB)"

---

## Technical Stack

| Layer | Choice | Size Impact |
|---|---|---|
| Language | TypeScript (compiled to JS) | Better DX, no runtime cost |
| Framework | Preact + HTM (no build step JSX) | ~4KB gzipped |
| Styling | Single CSS file, CSS custom properties for theming | ~5KB gzipped |
| Font | IBM Plex Mono (subset: latin + basic symbols) | ~15KB gzipped |
| HTML | Single index.html with view templates | ~2KB gzipped |
| Build tool | esbuild (bundling + minification) | Fast, minimal config |
| Service Worker | Vanilla, using Cache API and IndexedDB | ~5KB |
| Local search | MiniSearch (offline email search) | ~8KB gzipped |
| Testing | Playwright for E2E, Vitest for unit tests | Dev dependency only |
| Deployment | Static hosting (GitHub Pages, Cloudflare Pages) | Free |

### Gmail API Usage

Key endpoints:

```
GET  /gmail/v1/users/me/messages              # List message IDs
GET  /gmail/v1/users/me/messages/{id}          # Get message content
POST /gmail/v1/users/me/messages/send           # Send a message
POST /gmail/v1/users/me/messages/{id}/modify    # Change labels, read state
GET  /gmail/v1/users/me/labels                  # List labels
POST /gmail/v1/users/me/messages/batchGet       # Batch fetch (custom batch endpoint)
```

Use `fields` parameter aggressively to limit response size:
```
?fields=messages(id,threadId)                   # List: IDs only
?fields=id,labelIds,payload(headers),internalDate  # Metadata only
```

### Batch Requests

Gmail supports batch requests (up to 100 per batch). The inbox view should:
1. Call `messages.list` to get 25 IDs (~1KB)
2. Batch-fetch metadata for all 25 in a single request (~3KB)

This reduces 26 round trips to 2, which is critical on high-latency connections.

---

## Performance Budgets

| Metric | Target | Notes |
|---|---|---|
| App shell (all assets, gzipped) | < 200KB | One-time download, cached by service worker |
| Time to interactive (first visit, 3G) | < 5 seconds | Acceptable since this is a one-time cost |
| Time to interactive (repeat visit) | < 500ms | Served entirely from cache |
| Inbox load (25 messages, metadata) | < 5KB transfer | This is the real per-use bandwidth cost |
| Single message load (text) | < 3KB transfer | Per-use bandwidth cost |
| Lighthouse Performance score | > 90 | |
| Lighthouse PWA score | 100 | |

---

## Open Source Considerations

### Repository Structure

```
baremail/
├── index.html
├── style.css
├── app.js               # Main application logic
├── sw.js                 # Service worker
├── manifest.json         # PWA manifest
├── auth.js               # OAuth / token management
├── gmail.js              # Gmail API client
├── cache.js              # IndexedDB + caching logic
├── views/
│   ├── inbox.js
│   ├── reader.js
│   ├── compose.js
│   └── settings.js
├── config.example.js     # OAuth client ID placeholder
├── LICENSE               # MIT
├── README.md
├── CONTRIBUTING.md
└── docs/
    ├── DESIGN.md          # This document
    ├── SETUP-OAUTH.md     # Guide for setting up Google credentials
    └── SELF-HOSTING.md
```

### License

MIT — maximizes adoption and contribution.

### OAuth for Public Users

Two approaches, to be decided:

1. **BYO credentials (recommended for v1):** Each user or self-hoster sets up their own Google Cloud project. Simplest for the maintainer, no verification needed, but adds friction for non-technical users.

2. **Shared OAuth app (future):** Register a verified OAuth app with Google. Users can log in directly. Requires going through Google's OAuth verification process (privacy policy, homepage, scoping review). Worth doing once the project has traction.

### Contribution Guidelines

- Every PR must not increase the app shell beyond 200KB gzipped
- Runtime dependencies must be justified by their size-to-value ratio
- Features must degrade gracefully offline
- All new views must work without JavaScript enabled (server-rendered fallback, if we add a server mode later)

---

## Roadmap

### v0.1 — MVP

- [ ] OAuth login flow (PKCE)
- [ ] Inbox view (list messages, pagination)
- [ ] Message reader (plain text)
- [ ] Compose new message (plain text)
- [ ] Reply to message
- [ ] Service worker with app shell caching
- [ ] PWA manifest (installable)
- [ ] Light/dark theme
- [ ] Email footer with opt-out (`ʕ·ᴥ·ʔ sent with baremail`)

### v0.2 — Offline & Polish

- [ ] Offline message reading (cached)
- [ ] Offline compose with outbox queue
- [ ] Background sync for queued messages
- [ ] Connection status indicator
- [ ] Bandwidth estimates on actions
- [ ] Label sidebar
- [ ] Search

### v0.3 — Power User

- [ ] Keyboard shortcuts (j/k navigation, r to reply, c to compose)
- [ ] Mark as read/unread, archive, star
- [ ] Thread view (grouped messages)
- [ ] Forward messages
- [ ] Attachment download (selective)
- [ ] Settings page (signature, default view, cache size)

### v1.0 — Public Release

- [ ] Shared OAuth app (Google-verified)
- [ ] Landing page explaining the project
- [ ] One-click deploy buttons (Netlify, Cloudflare, Vercel)
- [ ] Comprehensive README with GIFs/screenshots
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Localization (i18n) framework

### Future Ideas

- Optional server mode (tiny Node.js proxy) for environments where client-side OAuth is impractical
- Support for other email providers (Outlook, FastMail) via their respective APIs
- E2E encryption via OpenPGP.js (opt-in, adds ~50KB)
- "Data saver" mode that fetches only unread messages
- Connection-aware loading (use `navigator.connection` API to adjust batch sizes)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Google changes/deprecates Gmail API | Project breaks | Pin to stable API version, monitor deprecation notices |
| OAuth verification process is slow/rejected | Can't offer shared login | BYO credentials as permanent fallback |
| IndexedDB storage limits | Offline cache evicted by browser | LRU eviction, warn users, suggest installing as PWA (more storage) |
| Gmail blocks client-side API calls (CORS) | App can't function | Gmail API supports CORS for browser clients natively; low risk |
| Scope creep toward "full Gmail clone" | Defeats the purpose | Hard 200KB budget enforced in CI, feature rubric: "does this help on airplane wifi?" |

---

## Name

**BareMail** — email's bare necessities. The name is a double pun: "bare" as in stripped down to essentials, and the project mascot is a bear (ʕ·ᴥ·ʔ) who appears throughout the UI, most notably in the inbox zero celebration screen.

---

*This is a living document. Update it as architectural decisions are made.*
