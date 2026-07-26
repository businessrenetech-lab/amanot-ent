# DESIGN.md — Amanat Business Platform UI/UX System

> Purpose: a single source of truth for any AI agent (Claude, GPT, Kimi, Gemini) or
> developer building/editing UI in this repo. Read this **before** writing any
> component or Tailwind class so new screens match the existing system.

---

## 1. What this product is

**Amanat Business Platform** ("Amanot Group") is a dual-business retail ERP + public
storefront for a Bangladeshi electronics/appliance dealer. It has **two visual faces**:

| Face | Route | Look | Audience |
|------|-------|------|----------|
| **Public Storefront** | `/` | Light, marketing, spacious | Customers browsing products, requesting quotes |
| **Business ERP** | `/admin` | Dense, dashboard, dark chrome | Staff running POS, inventory, sales, accounts |
| **Login** | `/login` | Light, focused | Staff sign-in |

Two business entities run inside one app:
- **Amanot Electronics** → brand accent **blue** (`amanot_electronics`) — Gree, Konka, Haiko
- **Amanot Enterprise** → brand accent **emerald** (`amanot_enterprise`) — Haier

Currency is **Bangladeshi Taka `৳`** everywhere (never `$`). Numbers use
`.toLocaleString()` and a monospace font.

---

## 2. Tech & tokens

- **React 19 + TypeScript**, **Tailwind CSS v4** (utility-first, no CSS modules), **lucide-react** icons, **motion** for animation, `animate-in` utilities (tailwindcss-animate style) for entrances.
- No component library — everything is hand-rolled Tailwind. Match the patterns below rather than introducing a UI kit.
- Icons: always `lucide-react`, sized `w-3.5 h-3.5` (inline) to `w-5 h-5` (headers), tinted with a color class (e.g. `text-blue-400`).

### Color system

| Role | Tailwind | Usage |
|------|----------|-------|
| App background (ERP) | `bg-slate-100` | ERP page canvas |
| Surface / card | `bg-white` (light) / `bg-slate-900` (dark chrome) | Cards, panels |
| Chrome / dark UI | `bg-slate-900`, `bg-slate-950` | Header, sidebar, POS terminal |
| Primary action | `bg-blue-600` → hover `bg-blue-500`; gradients `from-blue-600 to-indigo-600` | Main buttons, active nav |
| Success / money-in / submit | `emerald` (`from-emerald-600 to-teal-600`) | Complete Sale, positive figures |
| Warning / due / draft | `amber` (`bg-amber-500/10`, `text-amber-600`) | Drafts, due balance, EMI |
| Danger / delete / logout | `rose` (`bg-rose-600`) | Destructive, logout |
| Accent / reports | `purple`/`fuchsia`/`pink` gradients | Global Reporting, super-admin |
| Electronics brand | `blue` (dot `bg-blue-500`) | Business = electronics |
| Enterprise brand | `emerald` (dot `bg-emerald-500`) | Business = enterprise |
| Muted text | `text-slate-400` / `text-slate-500` | Labels, secondary |
| Body text | `text-slate-900` (light) / `text-slate-100` (dark) | Primary text |

Use **transparency tints** for soft badges/backgrounds: `bg-blue-500/10 text-blue-400 border border-blue-500/20`. This is the signature "soft chip" look.

### Typography

- Family: default `font-sans` (system). Monospace (`font-mono`) for **all numbers, money, SKUs, model codes, IDs**.
- Weight ladder: `font-semibold` (labels) → `font-bold` → `font-extrabold` → `font-black` (headlines, totals).
- Size ladder actually used: `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-2xl`. Dense UI leans on `text-[10px]`–`text-xs`.
- UPPERCASE + `tracking-wider`/`tracking-widest` for section labels (`text-[10px] font-bold uppercase tracking-wider text-slate-400`).

### Shape, spacing, elevation

- Radius: `rounded-lg` (inputs/small), `rounded-xl` (buttons/cards), `rounded-2xl` (panels), `rounded-3xl` (modals). Nothing sharp-cornered.
- Shadows: `shadow-sm` (cards), `shadow-md`/`shadow-lg` (buttons), `shadow-2xl` (modals, terminal).
- Gaps: `gap-2`/`gap-3` inside components, `gap-4`/`gap-6` between layout regions. Padding `p-3`–`p-6`.
- Borders: `border border-slate-200` (light) / `border-slate-800` (dark).

---

## 3. Layout system

### ERP shell (`/admin`, `src/App.tsx` → `AdminApp`)
```
┌────────────────────────────────────────────────────────────┐
│ Header  (sticky, h-16, bg-slate-900, FULL WIDTH)            │
├──────────┬─────────────────────────────────────────────────┤
│ Sidebar  │  <main> active view (flex-1, min-w-0)            │
│ (w-64,   │                                                  │
│ dark,    │  Views are height-aware; POS bounds to viewport  │
│ rounded) │                                                  │
└──────────┴─────────────────────────────────────────────────┘
```
- Wrapper: `min-h-screen bg-slate-100 flex flex-col`. Body row: `flex-1 flex w-full p-4 md:p-6 gap-6` — **full width, no `max-w-*` cap** (deliberate; the app fills the screen).
- Header inner is `w-full px-4 sm:px-6 lg:px-8` (also full width).
- Sidebar: `w-64 bg-slate-900 text-slate-300 rounded-2xl`, grouped nav with UPPERCASE section labels; items are RBAC-filtered (see §6).

### Storefront (`/`, `PublicStorefront.tsx`)
- Self-contained: its own light top bar (brand + nav + "Staff Login" button → `/admin`), hero, product grid, quote modal. Centered content via `max-w-7xl mx-auto` (storefront is allowed to center; the ERP is not).

### Login (`/login`, `LoginPage.tsx`)
- Full-screen `bg-slate-50` with a subtle radial dot texture + pale blurred color blobs, and a centered `max-w-md` light glass card (`bg-white/90 backdrop-blur border border-slate-200 rounded-3xl`).

---

## 4. Core component patterns (copy these)

**Primary button (submit / positive):**
```tsx
className="py-3 rounded-xl font-extrabold text-xs text-white flex items-center justify-center gap-2 shadow-lg
           bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95
           disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
```
**Secondary / neutral button:** `bg-slate-800 hover:bg-slate-700 text-white ...` or `bg-slate-100 hover:bg-slate-200 text-slate-800` on light.
**Danger:** `bg-rose-600 hover:bg-rose-500 text-white`.

**Soft chip / badge:** `text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20`.

**Input:** `w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500`. On dark chrome: `bg-slate-800/70 border-slate-700 text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500`.

**Card:** `bg-white border border-slate-200 rounded-2xl p-4 shadow-sm` (light) or `bg-slate-900 border border-slate-800 rounded-2xl` (dark).

**Modal:** overlay `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4`; panel `bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden`; dark gradient header bar; optional in-modal **sub-tabs** (see `EditProductModal.tsx`: Photos / Product Identity & Brand / Pricing & Stock / Storefront & Tags).

**Toast:** single global host (`ToastHost` in `App.tsx`), bottom-right, `fixed bottom-6 right-6 z-[100] bg-slate-900 text-white rounded-2xl` with a pinging emerald dot. Fire via `showToast(msg)` from `useApp()`.

**Section label:** `text-[10px] font-bold text-slate-500 uppercase tracking-widest`.

---

## 5. Signature screen: the POS terminal (`pos/POSView.tsx`)

The POS is the design showcase — replicate its structure for any "work surface" screen.

- **Height-bounded** so it never forces page scroll: minimized `h-[calc(100vh-6.5rem)] min-h-[600px] overflow-hidden`; maximized `fixed inset-0 z-50`.
- **Two columns**: left = product catalog (search/filter bar `shrink-0` + product grid `flex-1 overflow-y-auto`), right = **checkout terminal**.
- **Checkout terminal is always dark** (`bg-slate-900`) in both modes, a 3-zone flex column:
  1. Header (`shrink-0`)
  2. **Cart list** (`flex-1 overflow-y-auto min-h-0`) — the only scrolling region
  3. **Pinned bottom block** (`shrink-0`, `max-h-[62%]` with own scroll) = Customer info + payment methods + totals + Complete Sale. **Always visible — the cashier never scrolls to reach customer/payment.**
- Product cards: business dot + brand chip + optional "N Sold" + spec pills (model/series/capacity) + big `৳` price + stock + Add button; hover lift `hover:-translate-y-0.5 hover:shadow-lg`; in-cart state gets a blue ring + "N in cart" ribbon.

Rule: **structured technical fields print small under a big product name.** Product name is headline (e.g. `GREE 1.0 TON Zeno Split Inverter AC (GS-12XZNA3V)`); `model / typeSeries / acType / capacity / size` render as a small monospace line under it (see `receipt/BrandedReceiptModal.tsx`).

---

## 6. RBAC & business theming in the UI

- The logged-in `currentUser.role` (`super_admin` | `staff`) and `permissions` drive visibility. Sidebar items and views are gated by `canAccessTab(tab, user)` (`src/auth/permissions.ts`). Never render a control the user can't use — hide it.
- `activeBusiness` scope (`all` | `amanot_electronics` | `amanot_enterprise`) filters data; staff are locked to their assigned business.
- Color-code by business: electronics = blue, enterprise = emerald (dots, badges, gradients).

---

## 7. Do / Don't

**Do**
- Keep the ERP full-width; keep dense screens height-bounded with internal scroll.
- Use `৳` + `font-mono` + `.toLocaleString()` for money.
- Use soft transparency chips, `rounded-xl/2xl`, and the emerald/blue/amber/rose semantic palette.
- Gate every action by permission; theme by business entity.
- Fire `showToast()` after mutations for feedback.

**Don't**
- Don't add a UI framework, cap the ERP width with `max-w-7xl`, or use `$`.
- Don't put customer/payment inputs at the bottom of a long scroll — pin them.
- Don't use pure-black/pure-white; stay on the slate ramp. Avoid sharp corners and flat gray AI-slop cards — every surface has a subtle border + radius + (on light) a soft shadow.
