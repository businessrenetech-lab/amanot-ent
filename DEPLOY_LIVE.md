# Live deployment — olive-woodcock-158400.hostingersite.com

Concrete steps for **this** deployment. For background on how the sync layer works,
see `DEPLOY_HOSTINGER.md`.

- **Live URL:** https://olive-woodcock-158400.hostingersite.com/
- **Repo:** `git@github.com:businessrenetech-lab/amanot-ent.git` (SSH — a deploy key is required)
- **Startup file:** `server/dist/server.js`
- **Node:** 18 or newer

One Node process serves **both** the API (`/api/...`) and the built site (from `dist/`),
so the frontend talks to its own origin — no CORS, no separate API domain.

---

## 1. Pull the code onto the server

The repo is private-key protected. Install the deploy key first (once):

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
nano ~/.ssh/id_ed25519          # paste the private key, save
chmod 600 ~/.ssh/id_ed25519
ssh-keyscan github.com >> ~/.ssh/known_hosts
ssh -T git@github.com           # expect "Hi businessrenetech-lab/amanot-ent!"
```

Then clone into the application root:

```bash
cd ~/domains/olive-woodcock-158400.hostingersite.com
git clone git@github.com:businessrenetech-lab/amanot-ent.git app
cd app
```

---

## 2. Create `.env` in the project root

Same folder as `package.json`. **This file is gitignored and must be created on the
server** — it is never committed.

```env
# --- MySQL (app runs ON Hostinger, so the DB is local to it) ---
DB_HOST=localhost
DB_PORT=3306
DB_USER=u943292694_amanot_user
DB_PASSWORD=<the password from your local .env>
DB_NAME=u943292694_amanot_ent

# --- API server ---
PORT=8000

# --- Auth ---
JWT_SECRET=<long random string — see below>
JWT_TTL=30d

# --- Frontend ---
# MUST be present but EMPTY so the browser calls /api on this same domain.
# Read by Vite at BUILD time, so it must exist before `npm run build`.
VITE_API_BASE=

# --- Optional ---
GEMINI_API_KEY=<only if you use the Gemini features>
```

### Two settings that are easy to get wrong

| Setting | Value | Why |
|---|---|---|
| `DB_HOST` | `localhost` | Your local `.env` uses `srv502.hstgr.io` for remote access from your PC. On the server the DB is local — using the remote host still works but is slower and depends on the IP allow-list. |
| `VITE_API_BASE` | present, empty | **Empty** = same-origin (correct here). **Absent entirely** = the app silently runs in offline localStorage-only mode and never touches MySQL. **`http://localhost:8000`** = the browser calls the visitor's own machine and everything fails. |

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## 3. Install, build, migrate, seed

```bash
npm install
npm run build            # frontend -> dist/
npm run build:server     # backend  -> server/dist/
npm run db:migrate       # create tables (or import server/schema.sql in phpMyAdmin)
npm run db:seed          # load initial catalogue/settings — SEE WARNING BELOW
npm run db:create-admin  # create the super-admin login
```

> **`db:seed` overwrites seeded collections.** Run it on first deploy only. Running it
> again on live data replaces those rows with the contents of `src/data/initialData.ts`.

The admin defaults come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`; set them
before running `db:create-admin`, or change the password immediately after logging in.

---

## 4. Start the Node app

**hPanel → Advanced → Node.js → Create Application**

| Field | Value |
|---|---|
| Application root | `domains/olive-woodcock-158400.hostingersite.com/app` |
| Application startup file | `server/dist/server.js` |
| Application URL | your domain |
| Node version | 18+ |

The server resolves the site from `process.cwd() + /dist`, so the **application root must
be the project folder** — not `server/` and not `server/dist/`. If the root is wrong the
API answers but every page 404s.

---

## 5. Verify

```bash
curl https://olive-woodcock-158400.hostingersite.com/api/health
# expect: {"ok":true,"db":true}
```

- `"db": false` → the DB credentials in `.env` are wrong, or the user lacks privileges.
- 404 HTML instead of JSON → the Node app is not running; check the Passenger log.
- Site loads but data never persists → `VITE_API_BASE` was missing at build time.
  Fix `.env`, re-run `npm run build`, restart the app.

Then open the site:

| Path | What it is |
|---|---|
| `/` | Public storefront |
| `/login` | Staff login |
| `/admin` | ERP (redirects to `/login` when signed out) |

---

## 6. Redeploying after a change

```bash
cd ~/domains/olive-woodcock-158400.hostingersite.com/app
git pull
npm install              # only if dependencies changed
npm run build
npm run build:server
```

Then **Restart** the app in hPanel → Node.js. Do **not** re-run `db:seed`.

---

## Notes

- `dist/` and `server/dist/` are gitignored build output — they are produced on the
  server, not pulled from the repo.
- `alphaSmsApiKey` ships empty. Set the live SMS key in **Admin → Settings** after the
  first login; it is stored in the database, not in the code.
- If the server has too little memory for the Vite build, build locally with
  `VITE_API_BASE= npm run build && npm run build:server` and upload `dist/` and
  `server/dist/` alongside the repo checkout.
