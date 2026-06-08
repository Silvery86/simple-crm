# CLAUDE.md — Simple CRM

> Source of truth for all Claude agents and developers working in this codebase.
> Every architectural decision here is intentional. Do not deviate without updating this file.

---

## 1. Project Overview

<!-- updated: multi-tenant-uc1-7 -->

Simple CRM is a **multi-tenant SaaS platform** for Vietnamese merchants. Each user owns one or more WooCommerce/WordPress store connections. The platform provides a unified order view across all stores, cross-store product push, website status monitoring, bulk product import from CSV/Shopify JSON, and AI-powered content generation — all from a single bilingual (EN/VI) dashboard.

**Multi-tenancy is the fundamental design constraint.** Every record in the database belongs to exactly one user through the chain `User → Store → data`. No record is global. One user must NEVER see, query, or mutate another user's data.

The system is built on Next.js 16 App Router with TypeScript, backed by Neon DB (PostgreSQL serverless) via Prisma, cached with Upstash Redis, deployed on Vercel, and authenticated via Firebase Auth.

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.0.0 |
| Language | TypeScript | ^5 |
| ORM | Prisma | ^6.18.0 |
| Database | Neon DB (PostgreSQL serverless) | latest |
| Cache / Queue | Upstash Redis via ioredis | ^5.8.2 |
| Job Queue / Cron | Upstash QStash | latest | Serverless-native async jobs and cron scheduling |
| (Legacy → Phase 3 migration) | BullMQ | ^5.62.0 |
| Auth | Firebase Auth (custom abstraction) | ^12.4.0 (client) / ^13.5.0 (admin) |
| State (server) | TanStack React Query | ^5.90.5 |
| State (client UI) | Zustand | (to be installed) |
| Validation | Zod | ^4.1.12 |
| Forms | React Hook Form + @hookform/resolvers | ^7 / ^5 |
| UI Primitives | Radix UI | various |
| Styling | Tailwind CSS | ^4 |
| Icons | Lucide React | ^0.548.0 |
| Dark Mode | next-themes | (to be installed) |
| i18n | next-intl | latest | EN/VI bilingual, path-based routing, all strings via t() |
| E2E Testing | Playwright | (to be installed in .test/) |
| Unit Testing | Jest + ts-jest | ^30 |
| Deployment | Vercel | — |
| CI/CD | GitHub Actions | — |
| Commerce APIs | WooCommerce REST API, Shopify Admin API | — |
| Design | claude.design | outputs in .design/ |

---

## 3. Project Structure

```
simple-crm/
├── .design/                        # claude.design output files
├── .docs/                          # Project documentation
│   ├── design/
│   │   └── COMPONENTS_DESIGN.md
│   ├── DESIGN_PATTERN.md
│   ├── PROJECT_STATUS.md
│   ├── PROJECT_SUMMARY.md
│   └── PROJECT_TECH_SPECS.md
├── .test/                          # ALL Playwright tests (root-level)
│   ├── e2e/                        # Feature E2E tests ([feature].spec.ts)
│   ├── api/                        # API contract tests
│   ├── fixtures/                   # Shared test factories and data
│   └── playwright.config.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
└── src/
    ├── app/
    │   ├── api/                    # Next.js Route Handlers (REST)
    │   │   ├── auth/               # /api/auth/* (login, logout, me, verify)
    │   │   ├── stores/             # /api/stores/*
    │   │   ├── products/           # /api/products/*
    │   │   ├── orders/             # /api/orders/*
    │   │   ├── campaigns/          # /api/campaigns/*
    │   │   ├── shopify/            # /api/shopify/*
    │   │   └── health/             # /api/health
    │   ├── [lang]/                 # i18n-prefixed routes (en | vi)
    │   │   ├── auth/
    │   │   │   └── login/
    │   │   ├── dashboard/
    │   │   │   ├── products/
    │   │   │   ├── stores/
    │   │   │   ├── orders/
    │   │   │   └── campaigns/
    │   │   ├── error.tsx
    │   │   ├── layout.tsx
    │   │   └── not-found.tsx
    │   ├── globals.css
    │   └── layout.tsx              # Root layout (providers only)
    ├── components/
    │   ├── ui/                     # ATOMS: Button, Input, Badge, etc.
    │   ├── forms/                  # MOLECULES: FormField, SearchBar, etc.
    │   ├── layout/                 # ORGANISMS: Navbar, Sidebar, PageHeader
    │   ├── auth/                   # Auth-specific organisms
    │   ├── products/               # Product-specific organisms
    │   ├── stores/                 # Store-specific organisms
    │   ├── orders/                 # Order-specific organisms
    │   └── campaigns/              # Campaign-specific organisms
    ├── lib/
    │   ├── api/                    # FE API client (typed fetch wrappers)
    │   │   ├── client.ts           # Base fetch with auth headers
    │   │   ├── stores.api.ts
    │   │   ├── products.api.ts
    │   │   └── ...
    │   ├── auth/
    │   │   ├── auth-context.tsx    # React context for current user
    │   │   └── server-auth.ts      # Firebase token verification (server-side)
    │   ├── db/
    │   │   ├── client.ts           # Prisma singleton (serverless-safe)
    │   │   └── repositories/       # One file per Prisma model
    │   ├── locales/
    │   │   ├── en.json
    │   │   ├── vi.json
    │   │   └── server.ts           # getTranslations() server helper
    │   ├── services/               # Business logic (stateless functions)
    │   │   ├── product.service.ts
    │   │   ├── store.service.ts
    │   │   └── ...
    │   ├── stores/                 # Zustand UI state stores
    │   │   ├── ui.store.ts         # Sidebar, modals, global UI state
    │   │   └── user.store.ts       # Cached user preferences
    │   ├── utils/                  # Pure utility functions
    │   └── zod/                    # Shared Zod schemas (BE + FE bridge)
    │       ├── store.schema.ts
    │       ├── product.schema.ts
    │       ├── auth.schema.ts
    │       └── common.schema.ts    # ApiResponse<T>, pagination, errors
    └── types/
        └── index.ts                # z.infer<> type aliases only
```

---

## 4. Architecture Rules

### BE/FE Separation Boundaries

- **Route Handlers** (`src/app/api/`) are the BE entry point. They: validate the request body with Zod, call a service function, return the standard envelope. They do NOT contain business logic.
- **Service layer** (`src/lib/services/`) contains all business logic. Services call repositories. Services are pure functions — no HTTP objects, no `NextRequest`.
- **Repository layer** (`src/lib/db/repositories/`) is the only layer that imports Prisma. Repositories do NOT contain business logic.
- **Components and pages** NEVER import from `src/lib/db/` or `src/lib/services/` directly. They call the FE API client (`src/lib/api/`), or use Server Actions from `src/lib/actions/`.
- **Server Actions** (`src/lib/actions/`) may call service functions directly (they run server-side). Use for form mutations in Server Components.

### Shared Types / Schemas

- All Zod schemas that define API shapes live in `src/lib/zod/`.
- TypeScript types are inferred: `export type StoreDTO = z.infer<typeof StoreDTOSchema>` in `src/types/index.ts`.
- When adding a new API endpoint:
  1. Define request + response schemas in `src/lib/zod/[feature].schema.ts`
  2. Export inferred types from `src/types/index.ts`
  3. Use the schema in the route handler for validation
  4. Import the type in the FE API client function return signature
- **Never write duplicate type definitions.** If a type exists in Zod, infer it — do not manually re-declare it.

### Absolute Prohibitions

- No `any` type. Enable `strict: true` in `tsconfig.json`. Use `unknown` and narrow with type guards.
- No direct Prisma imports outside `src/lib/db/`.
- No `fetch()` calls directly in React components or pages. Always use `src/lib/api/` wrappers.
- No hardcoded user-facing strings. All text must use `t('key')`.
- No inline `style={{}}` props. Tailwind utility classes only.
- No business logic in route handlers or components.
- **No global Prisma queries without tenant scope.** `prisma.order.findMany()` with no `WHERE` clause is forbidden. See Section 14.

---

## 5. REST API Conventions

### URL Patterns

```
/api/[resource]                    GET (list), POST (create)
/api/[resource]/[id]               GET (single), PUT (replace), PATCH (update), DELETE
/api/[resource]/[id]/[sub-resource] nested resource
```

Examples:
- `GET /api/stores` — list all stores
- `POST /api/stores` — create store
- `GET /api/stores/:id` — get store
- `PATCH /api/stores/:id` — partial update
- `DELETE /api/stores/:id` — delete store
- `GET /api/stores/:id/products` — products in store
- `POST /api/stores/:id/sync` — trigger sync action

### HTTP Methods

| Method | When to use |
|---|---|
| GET | Read-only. Never mutates state. Safe to retry. |
| POST | Create a new resource. Also for actions (sync, import). |
| PUT | Full replacement of a resource. |
| PATCH | Partial update (one or more fields). Prefer PATCH over PUT. |
| DELETE | Remove a resource. Soft-delete preferred (isActive: false). |

### Response Envelope

Every API response uses this shape — no exceptions:

```typescript
// Success
{
  "success": true,
  "data": T,         // Typed payload
  "error": null,
  "meta": {          // null if not paginated
    "page": 1,
    "pageSize": 20,
    "total": 142,
    "totalPages": 8
  }
}

// Error
{
  "success": false,
  "data": null,
  "error": "STORE_NOT_FOUND",   // Uppercase snake_case error code
  "meta": null
}
```

### Error Code Conventions

- Format: `UPPERCASE_SNAKE_CASE`
- Namespace by resource: `STORE_NOT_FOUND`, `PRODUCT_SYNC_FAILED`, `AUTH_TOKEN_EXPIRED`
- Standard codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_ERROR`, `RATE_LIMITED`
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity, 429 Too Many Requests, 500 Internal Server Error

---

## 6. Prisma Conventions

- **Model names:** PascalCase, singular (`User`, `Store`, `Product`, `OrderItem`)
- **Field names:** camelCase (`createdAt`, `externalId`, `firebaseUid`)
- **Table names:** snake_case plural via `@@map("table_name")` (`@@map("stores")`, `@@map("order_items")`)
- **Every model must include:**
  ```prisma
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ```
- **Monetary values:** Always `Decimal` (`@db.Decimal(10, 2)`). Never `Float`.
- **Enum names:** PascalCase (`StorePlatform`, `RoleName`). Enum values: SCREAMING_SNAKE_CASE (`WOO`, `IN_TRANSIT`).
- **Relations:** Always define both sides. Use `onDelete: Cascade` for owned relations; `onDelete: SetNull` for optional associations.
- **Indexes:** Add `@@index` for all foreign keys and fields used in WHERE clauses.
- **Migration naming:** `YYYYMMDD_description_of_change` (e.g., `20240615_add_campaign_status_index`)
- **Seed files:** `prisma/seed/` directory. Run with `npm run seed`.

---

## 7. i18n Rules

- **Routing:** Path-based. `/en/dashboard`, `/vi/dashboard`. Middleware detects browser locale and redirects to `/en/` by default if no prefix present.
- **Translation files:** `src/lib/locales/en.json` (source) and `src/lib/locales/vi.json` (target). Both must be updated in the same commit — never add an English key without the Vietnamese translation.
- **Key format:** Dot-notation, namespaced by feature domain:
  ```
  auth.login.title
  auth.login.emailLabel
  products.table.header.name
  products.sync.successMessage
  stores.form.platformLabel
  common.actions.save
  common.actions.cancel
  common.errors.notFound
  ```
- **Usage in Server Components:** Use `getTranslations()` from `src/lib/locales/server.ts`
- **Usage in Client Components:** Pass translated strings as props from Server Components, or use a client-safe hook (to be documented when next-intl is adopted)
- **Rule:** No hardcoded English or Vietnamese strings in any `.tsx`/`.ts` file. Violation is a PR blocking issue.
- **i18n consideration:** Vietnamese strings are typically 20–30% longer than English. All text containers must accommodate overflow without breaking layout.

---

## 8. Component Rules

### Atomic Design Hierarchy

| Level | Location | Examples |
|---|---|---|
| Atoms | `src/components/ui/` | Button, Input, Badge, Avatar, Spinner, Tooltip |
| Molecules | `src/components/forms/` | FormField, SearchBar, Pagination, Breadcrumb |
| Organisms | `src/components/layout/`, `src/components/[feature]/` | Navbar, Sidebar, DataTable, AuthForm |
| Templates | `src/app/[lang]/dashboard/*/layout.tsx` | Dashboard layout wrappers |

### Style Rules

- Tailwind utility classes only. No `style={{}}` props. No CSS Modules. No `styled-components`.
- For conditional classes, use `clsx` + `tailwind-merge` (both installed).
- Class variance authority (`cva`) for component variant definitions.
- All spacing uses Tailwind's 4px-base scale.

### Dark Mode

- All components must render correctly in both light and dark modes.
- Use Tailwind's `dark:` variants: `className="bg-white dark:bg-gray-900"`.
- Semantic color tokens via CSS variables (see DESIGN_PATTERN.md for token table).
- Never hardcode color hex values in components — always use token classes.
- `next-themes` manages the active theme class on `<html>`.

### Accessibility

- All interactive elements: `aria-label` or visible label text.
- Buttons without visible text: `aria-label` required.
- Form inputs: always paired with `<label>` via `htmlFor`.
- Keyboard navigation: all interactive elements must be reachable with Tab.
- Focus indicators: never remove the default focus ring — customize it, don't hide it.
- Color contrast: minimum WCAG AA (4.5:1 for normal text, 3:1 for large text).

---

## 9. Testing Rules

### Structure

All tests live in `root/.test/`. Jest unit tests remain in `src/**/__tests__/` (existing pattern, do not move).

```
.test/
├── e2e/
│   ├── auth.spec.ts
│   ├── stores.spec.ts
│   ├── products.spec.ts
│   ├── price-comparison.spec.ts
│   └── ...
├── api/
│   ├── stores.contract.ts
│   ├── products.contract.ts
│   └── ...
├── fixtures/
│   ├── auth.fixture.ts
│   ├── stores.fixture.ts
│   └── ...
└── playwright.config.ts
```

### Rules

- Naming: `[feature].spec.ts` for E2E, `[feature].contract.ts` for API contracts.
- Every new user-facing feature requires a Playwright E2E test before the PR can merge.
- Both `en` and `vi` locales must be explicitly tested in any test involving user-facing text.
- API contract tests verify the response matches the Zod schema shape — they are the type-safety regression suite.
- No `page.waitForTimeout()` in tests — use proper `waitFor` conditions.
- Tests must be deterministic — no reliance on external state. Use fixtures.

### CI Triggers

| Event | Tests run |
|---|---|
| Push to any branch | Jest unit tests |
| PR opened/updated targeting `main` | Jest + Playwright E2E (.test/e2e/) |
| PR opened/updated targeting `production` | Jest + Playwright E2E + API contracts |

---

## 10. Git & CI/CD Rules

### Branch Strategy

| Branch | Purpose | Vercel Deploy |
|---|---|---|
| `feature/*` | Development work | No auto-deploy |
| `main` | Staging / QA | Vercel Preview (auto) |
| `production` | Live production | Vercel Production (auto) |

- **All changes** require a PR. No direct push to `main` or `production`.
- `production` is only updated via PR from `main`, after QA sign-off on the preview deployment.
- Feature branches are named: `feature/[issue-number]-short-description` (e.g., `feature/42-store-price-sync`)
- Fix branches: `fix/[issue-number]-description`

### Commit Messages

Conventional Commits format — enforced:

```
feat: add store price sync endpoint
fix: resolve pagination off-by-one in product list
chore: update prisma to 6.18
docs: add CLAUDE.md architecture rules
test: add E2E tests for auth flow
refactor: extract price calculation to service layer
```

- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — tooling, deps, config (no production code change)
- `docs:` — documentation only
- `test:` — test additions or fixes
- `refactor:` — code change that neither fixes a bug nor adds a feature

### PR Requirements

- Title: conventional commit format
- Description: what changed, why, how to test
- All CI checks must pass before merge
- At least 1 reviewer approval required

---

## 11. Environment Variable Rules

### Management

- `.env.local` — local development secrets. **Never committed. Never shared.**
- `.env.example` — committed. Documents every variable with description and example (no real values).
- Vercel Dashboard — env vars set per environment: Development / Preview / Production.

### Required Variables (see `.env.example` for full list)

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Neon DB connection string (with pooler) | Yes |
| `DIRECT_URL` | Neon DB direct connection (for migrations) | Yes |
| `REDIS_URL` | Upstash Redis connection URL | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK service account email | Yes |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK private key | Yes |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client config | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase client config | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase client config | Yes |
| `ENCRYPTION_KEY` | 32-byte key for credential encryption | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app base URL | Yes |

### Rules

- Variables prefixed `NEXT_PUBLIC_` are exposed to the browser — never put secrets there.
- Rotate secrets immediately if accidentally committed.
- Add every new env var to `.env.example` in the same PR that uses it.

---

## 12. Design Rules

- All design files output by claude.design go into `root/.design/`. File names match the component: `.design/button.md`, `.design/data-table.md`.
- Design tokens (colors, spacing, typography, shadows) are documented in `.docs/DESIGN_PATTERN.md` and must be reflected in `tailwind.config.ts`.
- No UI component is implemented without either: (a) a corresponding `.design/` file, or (b) an explicit component spec in `.docs/design/COMPONENTS_DESIGN.md`.
- When the design system changes (new color, new spacing token), update `tailwind.config.ts`, `globals.css` CSS variables, and `DESIGN_PATTERN.md` in the same PR.
- Design review is required for new organisms and major changes to existing ones.

---

## 13. Integration Architecture Rules

<!-- updated: hybrid-integration -->

### Overview

The system uses a **hybrid Webhook Push + Scheduled Polling** architecture for all WooCommerce ↔ CRM ↔ New Website data flows. Five distinct flows are defined. No new flows may be added without a team discussion and a Decision Log entry in `.docs/INTEGRATION_FLOWS.md`.

### The Five Flows

| # | Name | Mechanism | Phase |
|---|---|---|---|
| 1 | Order webhook | WooCommerce webhook → QStash → job processor | 1 |
| 2 | Order reconciliation | QStash cron every 5 min → polling fallback | 1 |
| 3 | Product sync inbound | QStash cron every 30 min → WooCommerce poll | 2 |
| 4 | Product push outbound | QStash cron hourly + manual trigger | 3 |
| 5 | Error detection | QStash cron every 30 min → DB analysis | 3 |

### Webhook Routes (`app/api/webhooks/`)

- **ONLY do:** HMAC-SHA256 signature verification + publish payload to QStash + return 200 OK.
- **NEVER do:** Any DB query, service call, business logic, or transformation.
- Rationale: WooCommerce expects a response within 5 seconds. Publishing to QStash is <100ms. Any heavier work causes timeouts and WooCommerce retry storms.

### Job Processor Routes (`app/api/jobs/`)

- **ONLY do:** QStash signature verification (`verifySignatureAppRouter` from `@upstash/qstash`) + call one service function + return 200 OK.
- **NEVER do:** Direct Prisma calls, multiple service calls, or business logic inline.
- All job routes are unauthenticated to Firebase — QStash signature IS the authentication.

### Polling Job Rules

- All outbound WooCommerce API calls go through `lib/utils/woocommerce-client.ts`. Never `fetch()` WooCommerce URLs directly in a job file.
- Pagination: 100ms delay between pages. Max `per_page=100`.
- Auth: `Authorization: Basic base64(key:secret)` header — never query params.

### Outbound Push Rules

- All new website API calls go through `lib/utils/new-website-api.ts`. The concrete client is a stub until the API contract is confirmed (Decision 03).
- Retry: max 3 attempts, exponential backoff (1s, 2s, 4s). After 3 failures: `PushLog.status = FAILED`.
- Publishable product criteria: `status='publish'` AND (`stockStatus='instock'` OR `manage_stock=false`) AND `featuredImage IS NOT NULL` AND `title` is not empty.

### Record-Keeping Requirement

- **Every job execution must write a record.** No silent success.
  - Flow 1 + 2: write `SyncLog` entry per order.
  - Flow 3: update `WooProduct.lastSyncedAt` and `SyncCursor.lastProductSyncAt`.
  - Flow 4: write `PushLog` entry per product (status: SUCCESS / FAILED / SKIPPED).
  - Flow 5: write `ErrorReport` per detected issue (deduplicated by flow + message hash).

### Cursor Management

- **Durable cursors** (`lastOrderSyncAt`, `lastProductSyncAt`): stored in Neon DB via `SyncCursor` model. They survive Redis restarts.
- **Ephemeral cursors** (current pagination page during an active job run): stored in Upstash Redis with 10-minute TTL.
- Never use Redis for the durable cursors — losing them causes redundant full re-syncs.

### Job Registry

- All QStash cron jobs are registered in `src/lib/jobs/registry.ts`. This is the single source of truth for all scheduled work.
- Adding a new cron job without updating `registry.ts` is a violation.
- Each job entry includes: name, cron expression, destination URL env var, retry count, timeout.

### QStash Cron Schedules

| Job | Cron (UTC) | Destination Env Var | Retries | Timeout |
|---|---|---|---|---|
| `reconcile-orders` | `*/5 * * * *` | `JOB_RECONCILE_ORDERS_URL` | 3 | 30s |
| `sync-products` | `*/30 * * * *` | `JOB_SYNC_PRODUCTS_URL` | 3 | 120s |
| `push-products` | `0 * * * *` | `JOB_PUSH_PRODUCTS_URL` | 3 | 120s |
| `detect-errors` | `*/30 * * * *` | `JOB_DETECT_ERRORS_URL` | 2 | 60s |

### Integration-Specific Environment Variables

<!-- updated: multi-tenant-uc1-7 -->
<!-- NOTE: WOOCOMMERCE_BASE_URL / CONSUMER_KEY / CONSUMER_SECRET / WEBHOOK_SECRET are NO LONGER env vars. -->
<!-- They are stored per-store in the StoreCredential table, encrypted with CREDENTIAL_ENCRYPTION_KEY. -->

| Variable | Description | Required For |
|---|---|---|
| `CREDENTIAL_ENCRYPTION_KEY` | 32-byte base64 key for AES-256-GCM credential encryption | All flows |
| `QSTASH_URL` | Upstash QStash publish URL | All flows |
| `QSTASH_TOKEN` | Upstash QStash auth bearer token | All flows |
| `QSTASH_CURRENT_SIGNING_KEY` | QStash current signing key | All flows |
| `QSTASH_NEXT_SIGNING_KEY` | QStash next signing key (key rotation) | All flows |
| `VERCEL_BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token for image upload (UC5) | Flow 4, UC5 |
| `NEW_WEBSITE_API_URL` | New website API base URL | Flow 4 |
| `NEW_WEBSITE_API_KEY` | New website API authentication key | Flow 4 |
| `JOB_RECONCILE_ORDERS_URL` | Full public URL of `/api/jobs/reconcile-orders` | Flow 2 |
| `JOB_SYNC_PRODUCTS_URL` | Full public URL of `/api/jobs/sync-products` | Flow 3 |
| `JOB_PUSH_PRODUCTS_URL` | Full public URL of `/api/jobs/push-products` | Flow 4 |
| `JOB_DETECT_ERRORS_URL` | Full public URL of `/api/jobs/detect-errors` | Flow 5 |
| `JOB_INITIAL_SYNC_ORDERS_URL` | Full public URL of `/api/jobs/initial-sync-orders` | UC1 initial sync |
| `JOB_INITIAL_SYNC_PRODUCTS_URL` | Full public URL of `/api/jobs/initial-sync-products` | UC1 initial sync |
| `JOB_INITIAL_SYNC_CUSTOMERS_URL` | Full public URL of `/api/jobs/initial-sync-customers` | UC1 initial sync |

### Idempotency Rules

- **Flow 1 + 2:** `@@unique([storeId, wooOrderId])` on `SyncLog` is the guard. Upsert on existing `(storeId, wooOrderId)` is a no-op — not an error.
- **Flow 3:** `@@unique([storeId, wooProductId])` on `Product`. Repository uses `upsert({ where: { storeId_wooProductId: { storeId, wooProductId } } })`.
- **Flow 4:** Check for existing `PENDING` PushLog for `(sourceProductId, targetStoreId)` before creating a new one. If found, skip.
- **Flow 5:** Check for existing unresolved `ErrorReport` with same `(storeId, flow, messageHash)` before creating. If found, bump `updatedAt`.

### Manual Push Authorization

- `/api/admin/push-products` requires `ADMIN` role only. `USER` and `VIEWER` roles receive `403 Forbidden`.
- A confirmation dialog showing the product count is mandatory before any push executes.

### Polling Job Rules — Multi-Tenant Update

<!-- updated: multi-tenant-uc1-7 -->

- All polling jobs receive a `storeId` in the QStash payload. They NEVER use global env var credentials.
- All outbound WooCommerce API calls go through `lib/utils/woocommerce-client.ts`. The client is built per-request via the credential factory in `lib/services/store-credential.service.ts`.
- Webhook routes may perform ONE cached credential lookup (Redis, 5-minute TTL keyed `wh:creds:{storeId}`) to verify HMAC signature. No other DB queries in webhook routes.
- Auth: `Authorization: Basic base64(consumerKey:consumerSecret)` — keys sourced from decrypted `StoreCredential`, never env vars.

### BullMQ → QStash Migration Note

BullMQ is incompatible with Vercel serverless (requires persistent workers). All new integration work uses QStash. Existing BullMQ code (AI jobs, email sends) will be migrated to QStash in Phase 3. Until migration is complete, BullMQ remains in `package.json` but should not be used for new features.

### Repository Layer Transition Note

Two repository patterns co-exist during migration:
- `src/lib/db/repositories/` — legacy pattern, `.repo.ts` naming, no interfaces (existing store/product repos)
- `src/lib/repositories/implementations/` + `src/lib/repositories/interfaces/` — standard pattern (new integration repos + user/role)

New code must use the standard pattern. Legacy repos will be migrated in a dedicated refactor ticket.

---

## 14. Multi-Tenant Data Rules

<!-- updated: multi-tenant-uc1-7 -->

These rules are **absolute prohibitions**. Violations are PR-blocking and constitute a security defect.

### Ownership Chain

Every record belongs to a user through: `User → Store → [Order | Product | Customer | SyncLog | SyncCursor | ErrorReport | PushLog]`. Records without this chain are forbidden.

`ImportJob` and `AssetFile` belong directly to `User`. `ImportedProduct` belongs to `ImportJob` (and thus to `User`).

### Mandatory Repository Rules

- Every repository function that returns tenant data MUST accept `userId` as a required parameter.
- No repository function may call `prisma.[model].findMany()` or `prisma.[model].findFirst()` without a `WHERE` clause that includes `storeId` or `store: { userId }`.
- Correct pattern: `prisma.order.findMany({ where: { store: { userId } } })`
- Forbidden pattern: `prisma.order.findMany()` — global query with no tenant filter

### Mandatory Route Handler Rules

Every route handler that receives a `storeId` parameter MUST:
1. Verify the user is authenticated (session check)
2. Verify `store.userId === session.userId` BEFORE passing the storeId to any service function

**Return `403 Forbidden` — never `404` — when a resource exists but belongs to a different user.** Returning `404` leaks the existence of another user's resource.

### Cross-Store Push Authorization

Before pushing products from Store A to Store B:
1. Verify Store A belongs to the authenticated user
2. Verify Store B belongs to the authenticated user
3. If either check fails: `403 Forbidden`

A user can only push between stores they own.

### Forbidden Patterns — Examples

```typescript
// ❌ FORBIDDEN — no tenant scope
const orders = await prisma.order.findMany()

// ❌ FORBIDDEN — unverified storeId from client
const orders = await prisma.order.findMany({ where: { storeId: req.params.storeId } })

// ❌ FORBIDDEN — returning credentials to route handler
const store = await prisma.store.findUnique({ include: { credential: true } })

// ✅ CORRECT — always scope through userId
const orders = await prisma.order.findMany({
  where: { store: { userId: session.userId } }
})
```

---

## 15. Credential Security Rules

<!-- updated: multi-tenant-uc1-7 -->

WooCommerce credentials (consumer key, consumer secret, webhook secret) are stored encrypted in the `StoreCredential` table using AES-256-GCM with `CREDENTIAL_ENCRYPTION_KEY`.

### What Must NEVER Happen

The decrypted (plaintext) credential value must NEVER appear in:
- API response bodies (any endpoint, any format)
- Server-side logs (`console.log`, `logger.info`, `logger.error`, etc.)
- Error messages sent to the client
- Prisma query results returned directly from route handlers to clients
- Redis cache values (only encrypted bytes may be cached)
- Error tracking systems (Sentry, etc.) — configure data scrubbing

### Where Decryption Is Permitted

Decryption happens ONLY inside service functions, immediately before an outbound WooCommerce API call. The flow is:

```
storeCredentialService.getDecryptedCredentials(storeId)
  → storeCredentialRepository.findByStoreId(storeId)  // returns encrypted bytes
  → decryptCredential(encrypted, iv)                    // in-memory only
  → buildWooCommerceClient(domain, key, secret)         // key/secret on call stack only
  → client.makeApiCall()
  → [stack returns, decrypted values garbage collected]
```

The decrypted credential lives only for the duration of one API call. It is never:
- Stored in a module-level variable
- Returned from a service function
- Passed to a component or route handler
- Included in any structured log object

### `StoreCredential` Repository Rule

`storeCredentialRepository` functions must NEVER be called from route handlers directly. They are called only from `storeCredentialService` within the service layer. Route handlers receive `Store` objects that never include credential fields.

### Key Rotation

If `CREDENTIAL_ENCRYPTION_KEY` is rotated:
1. Run the migration script: `npm run migrate:re-encrypt`
2. The script decrypts all `StoreCredential` rows with the old key and re-encrypts with the new key
3. Set the new key in Vercel Dashboard
4. Verify at least one store connection succeeds before removing the old key
5. Key rotation is a scheduled maintenance operation — do not rotate without a plan
