# Origin CRM

A lightweight, local-first **CRM & sales-pipeline tracker** that uses your
Google Sheet (`Origin_Sales_CRM_v2`) as the database. Minimal, fast UI inspired
by [Twenty](https://github.com/twentyhq/twenty). Edits sync **bidirectionally**
with the sheet, and you can **enrich client data with Claude** from inside the
app.

- **Deals** — drag-and-drop Kanban pipeline by stage
- **Leads** — fast, filterable/sortable table with inline editing
- **Dashboard** — live KPIs, forecast, and a "needs attention" list
- **Lead → Deal conversion** — promote qualified leads in one click
- **Claude enrichment** — research a company and auto-fill fields
- **Plugins** — an event/route extension seam for future automations

Everything runs on your machine. The only outbound network calls are to
**Google Sheets** (your database) and, during enrichment, to **Anthropic via
your local Claude Code CLI**. See [External dependencies](#external-dependencies).

---

## Quick start

### Try it instantly (no Google setup)

```bash
npm install
npm run demo        # → http://localhost:5173, runs on sample data
```

Demo mode (`DEMO=1`) uses an in-memory sample dataset so you can explore the
whole app before connecting Sheets. Changes persist until you restart the
server. Enrichment still works if the `claude` CLI is installed.

Run `npm run setup` any time for a guided check of your local config.

### Connect your real sheet

### 0. Prerequisites

- **Node.js ≥ 20** (you have it if `node -v` works)
- **Claude Code CLI** on your PATH (`claude`) — only needed for enrichment.
  Already installed if you use Claude Code.

### 1. Install

```bash
npm install
```

### 2. Connect Google Sheets (one-time OAuth setup)

The app reads/writes your sheet through the Google Sheets API, which needs an
OAuth client. This is the one external setup step.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create (or pick) a project.
2. **APIs & Services → Library →** enable the **Google Sheets API**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - If prompted, configure the consent screen (User type: **External** is fine
     for personal use; add your own email as a **test user**).
   - Application type: **Desktop app**.
4. **Download** the client JSON and save it as `credentials.json` in the project
   root (next to this README). It's gitignored.
5. Copy the env template and log in:

   ```bash
   cp .env.example .env
   npm run auth
   ```

   A browser opens — sign in with the Google account that owns the sheet and
   grant access. A `token.json` is cached locally so you only do this once.

> The default sheet ID is already set in `.env.example`. To point at a different
> sheet, change `SPREADSHEET_ID`.

### 3. Run

```bash
npm run dev
```

- Web UI: **http://localhost:5173**
- API: **http://localhost:8787**

The Vite dev server proxies `/api` to the backend, so just open the UI.

### 4. Build & run as one local server (optional)

```bash
npm run build   # builds the web app
npm start       # serves UI + API together on http://localhost:8787
```

---

## How sync works

You chose **direct-to-Sheets (live)**: every read and write hits the Google
Sheet directly (with a tiny 4-second read cache to keep the UI snappy). The UI
also re-fetches every 15 seconds and on window focus, so edits made directly in
the sheet show up automatically — and edits in the app appear in the sheet
immediately. Last write wins; there's no separate local database to get out of
sync.

Writes are **field-level**: only the cells you change are updated, so existing
formulas in untouched columns are preserved. The presentational **Dashboard tab
is never written to** — the app computes its own live dashboard from the Deals
and Leads data.

---

## Claude enrichment

Open any deal or lead and click **Enrich with Claude → Research company**. The
server shells out to your local `claude` CLI in headless mode with web tools
enabled. Claude researches the company and returns suggested field values
(contact, title, phone, email, state, ICP segment, trade fit, a suggested next
step) plus a short profile and sources.

Suggestions are **review-then-apply**: applying fills the form only; you click
**Save** to write to the sheet. Nothing is written automatically.

- Uses your existing Claude subscription via the CLI — **no API key, no
  per-token billing**.
- Configure the command or timeout via `CLAUDE_CLI` / `ENRICH_TIMEOUT_MS` in
  `.env`.

---

## Plugins (automation seam)

Drop a folder in `server/plugins/<name>/` with an `index.ts` that default-exports
a `CrmPlugin`. Plugins can subscribe to domain events
(`deal.stage_changed`, `lead.converted`, …) and register HTTP routes at
`/api/plugins/<name>`. This is where future integrations (Slack, email digests,
calendar sync, auto-enrichment) live without touching core code. See
[`server/plugins/README.md`](server/plugins/README.md). An example
`webhook-notifier` plugin ships disabled-by-default.

---

## External dependencies

Per your "flag anything external" requirement:

| Dependency           | Required for            | Notes                                                                 |
| -------------------- | ----------------------- | --------------------------------------------------------------------- |
| **Google Sheets API**| The database (core)     | Cloud. One-time OAuth setup. Your data stays in *your* Google account.|
| **Claude Code CLI**  | Enrichment feature only | Local CLI; calls Anthropic during a research run. App works without it (enrichment just won't run). |
| npm packages         | Build/runtime           | Standard, installed locally. No telemetry added by this app.          |

No other services, accounts, or cloud infrastructure. The server, UI, and data
cache all run on `localhost`.

---

## Project layout

```
server/                Node + Express API (TypeScript, run via tsx)
  src/
    auth/              Google OAuth (login + token cache)
    sheets/            Sheets client, parsing, repository (CRUD + conversion)
    domain/            CRM model (stages, fields) + dashboard math
    enrichment/        Claude CLI runner + prompt builder
    core/              event bus, plugin manager, logger, types
    routes/            REST API
  plugins/             drop-in automations (event listeners + routes)
web/                   Vite + React + TS UI (Tailwind, TanStack Query, dnd-kit)
  src/
    pages/             Dashboard, DealsBoard (Kanban), LeadsTable
    components/        Drawer, Modal, EnrichPanel, RecordDrawer, atoms
.env.example           Configuration template
```

## Configuration reference

See [`.env.example`](.env.example). Common knobs: `SPREADSHEET_ID`, `PORT`,
`GOOGLE_CREDENTIALS_PATH`, `GOOGLE_TOKEN_PATH`, `CLAUDE_CLI`,
`ENRICH_TIMEOUT_MS`, `ENABLED_PLUGINS`.

## Troubleshooting

- **"Google Sheets not connected" banner** — run `npm run auth`.
- **Can't find the Deals/Leads tab** — the app auto-detects tabs by name; if
  yours are named differently, set `SHEET_TAB_DEALS` / `SHEET_TAB_LEADS` in `.env`.
- **Enrichment says CLI not found** — ensure `claude` is on your PATH, or set
  `CLAUDE_CLI` to its full path.
- **403 from Google** — make sure the signed-in account can edit the sheet and
  that you added yourself as a test user on the consent screen.
