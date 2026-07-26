# Database + Backend Setup — Amanat Business Platform

This app was originally **frontend-only** (React 19 + TS + Tailwind v4), storing all
data in the browser's `localStorage`. This adds a proper **MySQL database** with a
small **Express + TypeScript** backend, and wires the existing frontend to it.

Nothing in your UI was rebuilt — `AppContext.tsx` gained a sync layer, and a new
`server/` folder holds the DB code.

```
server/
  schema.sql          all MySQL tables (also importable via phpMyAdmin)
  build.mjs           esbuild bundler -> server/dist/*.js (for Hostinger)
  .env.example        DB + API env vars
  src/
    db.ts             mysql2 connection pool (reads .env)
    collections.ts    registry: which state key -> which table/columns
    repo.ts           generic read / replace / upsert
    migrate.ts        creates the schema      (npm run db:migrate)
    seed.ts           imports src/data/initialData.ts into MySQL (npm run db:seed)
    server.ts         REST API + serves the built site
src/api/sync.ts       frontend <-> API sync (no-op unless VITE_API_BASE is set)
```

---

## How persistence works

- **On startup** the app calls `GET /api/state` and hydrates from MySQL.
- **On every change** each collection is debounce-pushed back (`PUT /api/collections/:key`).
- `localStorage` remains as an **offline cache** — if the API is unreachable, the app
  keeps working locally and syncs when it's back.
- If `VITE_API_BASE` is **not set**, the app is 100% localStorage (original behaviour).

---

## 1. Local development

**Prerequisites:** Node.js, and a local MySQL (XAMPP/MAMP/MySQL Server) if you want to
test the DB locally.

1. `.env` (project root) already has local defaults:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=amanat_platform
   PORT=8000
   VITE_API_BASE=http://localhost:8000
   ```
2. Create the tables and import the seed data:
   ```
   npm run db:setup        # = db:migrate + db:seed
   ```
3. Run the backend and the frontend (two terminals):
   ```
   npm run server:dev      # API on http://localhost:8000
   npm run dev             # site on http://localhost:3000
   ```
   The site loads its data from MySQL. Edit anything → it's saved to the database.

> No local MySQL? Just skip `db:setup` and run `npm run dev`. The app falls back to
> localStorage automatically.

---

## 2. Deploy to Hostinger (Business hosting — Node app + MySQL on one server)

### 2a. Create the database (hPanel)
1. **hPanel → Databases → MySQL Databases**.
2. Create a database and a user (Hostinger prefixes both with your account id, e.g.
   `u123456789_amanat`). Give the user **All Privileges** on that database.
3. Note the **database name, user, and password**. Host is `localhost`.

### 2b. Upload the project
Upload the repo to your app directory (e.g. `~/domains/yourdomain.com/app`) via
Git deploy, SFTP, or the File Manager. Include `package.json`, `server/`, `src/`, etc.
(You can build locally and upload, or build on the server — see 2d.)

### 2c. Set environment variables
Create `.env` in the project root on the server (same folder as `package.json`):
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_amanat
DB_PASSWORD=your-strong-db-password
DB_NAME=u123456789_amanat

PORT=8000
# Same-origin in production: leave empty so the browser calls /api on this domain.
VITE_API_BASE=
GEMINI_API_KEY=your-gemini-key
```
> `VITE_API_BASE` is read by Vite **at build time**, so it must be set before `npm run build`.

### 2d. Build, create tables, seed
Over SSH in the project folder:
```
npm install
npm run build            # builds the frontend into dist/
npm run build:server     # bundles the backend into server/dist/
npm run db:migrate       # creates all tables (or import server/schema.sql in phpMyAdmin)
npm run db:seed          # imports src/data/initialData.ts into MySQL
```
> No SSH? Import `server/schema.sql` manually via **phpMyAdmin → SQL**, then run the
> seed once from a machine that can reach the DB, or trigger it from the Node app.

### 2e. Start the Node app (Passenger)
1. **hPanel → Advanced → Node.js** → *Create Application*.
2. Set:
   - **Application root**: your project folder
   - **Application startup file**: `server/dist/server.js`
   - **Node version**: 18+
3. Start it. The single Node process now serves **both** the API (`/api/...`) and the
   built site (from `dist/`) on your domain.

Open `https://yourdomain.com/api/health` → should return `{"ok":true,"db":true}`.

---

## 3. Remote MySQL instead (optional)

If you run the backend elsewhere (your PC / a VPS) and connect to Hostinger's MySQL:
- **hPanel → Databases → Remote MySQL** → add your client's IP to the allow-list.
- Set `DB_HOST` to the remote host Hostinger gives you (not `localhost`).

---

## Re-running the seed

`npm run db:seed` is **idempotent** — it replaces the seeded collections with the
contents of `src/data/initialData.ts`. It will overwrite seeded rows, so don't run it
on top of live production data you want to keep.

---

## Authentication & RBAC

The app now has a real login system:

- **Login:** `POST /api/auth/login` verifies a bcrypt password and returns a JWT.
- **Protected:** `GET /api/state` and all `PUT /api/...` writes require a Bearer token.
- **Public:** the storefront reads `GET /api/public/catalog` (products + display settings
  only — no financials) and submits leads via `POST /api/public/quote`.
- **Routes:** `/` = storefront · `/login` = staff login · `/admin` = ERP (redirects to
  `/login` when signed out).
- **RBAC:** the logged-in user's `permissions` drive which sidebar modules and views are
  visible; Super Admin can create staff logins and edit permissions in **Staff RBAC & Access**.

### Create / reset the super-admin login
```
npm run db:create-admin
```
Defaults: `admin@amanatgroup.com` / `JJstmg3xpt9@!` (override with `ADMIN_EMAIL`,
`ADMIN_PASSWORD`, `ADMIN_NAME` env vars). Set a strong random `JWT_SECRET` in production.
