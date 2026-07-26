# API.md — Routes & REST Endpoints

> Complete reference of every backend endpoint and every frontend route for the Amanat
> Business Platform. Source of truth: `server/src/server.ts` (endpoints) and
> `src/router.tsx` + `src/App.tsx` (frontend routes). Pair with **ARCHITECTURE.md**.

---

## 1. Base URL & auth

- **Base URL** = `VITE_API_BASE` (dev: `http://localhost:8000`; prod same-origin: `""`).
- **Auth**: JWT bearer. Obtain via `POST /api/auth/login`, then send on every protected call:
  `Authorization: Bearer <token>`. Token lives in `localStorage['amanat_token']`.
- **Content type**: `application/json`. Body size limit 25 MB. CORS allows `CORS_ORIGIN` (dev).
- **Error shape**: `{ "error": "<code>", "message"?: "<detail>" }` with an appropriate HTTP status. Unhandled errors → `500 { error: "internal_error", message }`.

Legend: 🔓 public · 🔒 requires bearer token · 👑 requires `super_admin`.

---

## 2. Endpoints

### 🔓 `GET /api/health`
Liveness + DB connectivity probe.
- **200** → `{ "ok": true, "db": true }` (`db:false` if MySQL unreachable, server still up).

### 🔓 `GET /api/public/catalog`
Storefront data with **no** financial/business info. Used before login.
- **200** →
  ```json
  { "products": [Product, …], "settings": AppSettings|null,
    "masterLists": { "brands": string[]|null, "categories": string[]|null } }
  ```

### 🔓 `POST /api/public/quote`
Store a storefront lead (logged-out "Get a Quote"). Body = a full `Quotation` object (must include `id`).
- **200** → `{ "ok": true, "id": "<quotationId>" }`
- **400** → `{ "error": "invalid_quotation" }`

### 🔓 `POST /api/auth/login`
- **Body**: `{ "email": string, "password": string }`
- **200** → `{ "token": "<jwt>", "user": StaffUser }`
- **400** `missing_credentials` · **401** `invalid_login` · **500** `missing_profile`

### 🔒 `GET /api/auth/me`
Validate the current token and return the caller's profile.
- **200** → `{ "user": StaffUser }` · **401** `unauthorized` · **404** `not_found`

### 🔒 `GET /api/state`
Full application state — every collection + singletons + master lists. This is what the
ERP hydrates from on login.
- **200** →
  ```json
  {
    "staffUsers": [], "products": [], "customers": [], "suppliers": [],
    "sales": [], "installmentPlans": [], "quotations": [],
    "supplierRequisitions": [], "purchaseOrders": [], "expenses": [],
    "smsLogs": [], "stockAdjustments": [], "damageLogs": [], "supplierReturns": [],
    "accounts": [], "accountTransfers": [], "supplierPayments": [],
    "settings": AppSettings, "auditConfig": AuditConfig,
    "masterLists": { "brands": [], "categories": [], "expenseCategories": [],
                     "crmGroups": [], "crmLeadSources": [] }
  }
  ```
- **401** `unauthorized`

### 🔒👑 `POST /api/admin/users`
Create a staff login + RBAC profile (super-admin only).
- **Body**: `{ name, email, password, assignedBusiness?, permissions?, role? }`
  - `assignedBusiness`: `"all" | "amanot_electronics" | "amanot_enterprise"` (default `all`)
  - `role`: `"staff" | "super_admin"` (default `staff`)
  - `permissions`: object of booleans (defaults to standard staff set)
- **200** → `{ "ok": true, "user": StaffUser }`
- **400** `missing_fields` · **403** `forbidden` (not super-admin) · **409** `email_exists`

### 🔒 `PUT /api/collections/:key`
**Replace an entire collection** (delete-all + bulk insert, transactional). Client sends the full array.
- `:key` ∈ the collection keys in §3. **Body**: `<Entity>[]` (JSON array).
- **200** → `{ "ok": true, "key": "<key>", "count": <n> }`
- **404** `unknown_collection` · **400** `expected_array`

### 🔒 `PUT /api/singletons/:key`
Upsert a singleton object. `:key` ∈ `settings` | `auditConfig`. **Body**: the object.
- **200** → `{ "ok": true, "key": "<key>" }` · **404** `unknown_singleton`

### 🔒 `PUT /api/master-lists/:key`
Upsert a string-array master list. `:key` ∈ `brands` | `categories` | `expenseCategories` |
`crmGroups` | `crmLeadSources`. **Body**: `string[]`.
- **200** → `{ "ok": true, "key": "<key>", "count": <n> }`
- **404** `unknown_master_list` · **400** `expected_array`

### 🔓 `GET /*` (non-`/api`)
In production (when `dist/` exists) serves the built SPA `index.html` (client-side routing fallback). Requests starting with `/api/` are never caught by this.

---

## 3. Collection keys (`PUT /api/collections/:key`)

`staffUsers`, `products`, `customers`, `suppliers`, `sales`, `installmentPlans`,
`quotations`, `supplierRequisitions`, `purchaseOrders`, `expenses`, `smsLogs`,
`stockAdjustments`, `damageLogs`, `supplierReturns`, `accounts`, `accountTransfers`,
`supplierPayments`.

Each maps to a table with `id` + indexed columns + a `data JSON` blob. Full object shapes
are the TypeScript interfaces in **`src/types.ts`** (`Product`, `Customer`, `SaleInvoice`,
`InstallmentPlan`, `Quotation`, `Supplier`, `SupplierRequisition`, `PurchaseOrder`,
`Expense`, `Account`, `AccountTransfer`, `SupplierPayment`, `StockAdjustment`, `DamageLog`,
`SupplierReturn`, `SMSLog`, `StaffUser`, `AppSettings`, `AuditConfig`).

---

## 4. Frontend routes

| Route | Component | Access |
|-------|-----------|--------|
| `/` (and any unmatched path) | `PublicStorefront` | public storefront (landing) |
| `/login` | `LoginPage` | public; auto-redirects to `/admin` if already signed in |
| `/admin` | `AdminApp` (Header + Sidebar + active ERP view) | requires auth; redirects to `/login` otherwise |

The **active ERP screen** inside `/admin` is not URL-driven — it's `activeTab` in
`AppContext`. Tabs (`ERPTab`) and their gating permission (`src/auth/permissions.ts`):

| Tab | View | Required permission |
|-----|------|---------------------|
| `pos` | POSView | canManagePOS |
| `invoices` | InvoicesView | canManagePOS |
| `quotes` | QuotesView | canManagePOS |
| `installments` | InstallmentsView | canManagePOS |
| `inventory` | InventoryView | canManageInventory |
| `suppliers` | SuppliersView | canManageInventory |
| `accounts` | AccountsView | canManageExpenses |
| `expenses` | ExpensesView | canManageExpenses |
| `crm` | CRMView | canManageCRM |
| `global_reports` | GlobalReportsView | canViewGlobalReports |
| `audit_reports` | AuditReportsView | (any authed user) |
| `rbac` | RBACManager | canManageRBAC |
| `settings` | SettingsView | super_admin only |
| `website` | PublicStorefront (preview) | (any) |

`super_admin` passes every gate.

---

## 5. Typical client flows

**Login → load ERP**
```
POST /api/auth/login {email,password} → {token,user}
  store token; setCurrentUser(user)
GET  /api/state   (Bearer)            → hydrate all collections
```

**Edit data → persist** (handled automatically by `AppContext` + `api/sync.ts`)
```
user edits products in UI → AppContext.setProducts(...)
  → debounced 700ms → PUT /api/collections/products  (Bearer, full array)
```

**Storefront (logged-out)**
```
GET  /api/public/catalog              → products + settings for the grid
POST /api/public/quote {Quotation}    → save a lead (also appears in ERP Quotes)
```

**Create staff (super-admin, in RBAC screen)**
```
POST /api/admin/users {name,email,password,assignedBusiness,role,permissions}
  → new StaffUser; appended to staffUsers and re-synced
```

---

## 6. cURL quickstart

```bash
# health
curl http://localhost:8000/api/health

# login → capture token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@amanatgroup.com","password":"<password>"}' | jq -r .token)

# full state
curl http://localhost:8000/api/state -H "Authorization: Bearer $TOKEN"

# public catalogue (no auth)
curl http://localhost:8000/api/public/catalog
```
