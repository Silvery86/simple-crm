# Project Status — Simple CRM

<!-- updated: multi-tenant-uc1-7 -->

**Last updated:** 2026-06-08
**Current phase:** Phase 1 — Multi-Tenant SaaS Platform: Auth + Store Connection + Status Dashboard

---

## Phase 0 — Project Bootstrap

### Completed ✅

- [x] Next.js 16 App Router project initialized with TypeScript
- [x] Prisma schema defined (all core entities: User, Store, Product, Order, Customer, Campaign, AI, etc.)
- [x] Firebase Auth integrated (client + admin SDK)
- [x] REST API routes scaffolded: auth, stores, products, shopify, health
- [x] i18n routing structure (`src/app/[lang]/`) with en.json and vi.json
- [x] Tailwind CSS v4 configured with Radix UI primitives
- [x] TanStack React Query wired up for server state
- [x] Zod schemas in `src/lib/zod/` for product and store
- [x] Repository pattern established (`src/lib/db/repositories/`)
- [x] Service layer established (`src/lib/services/`)
- [x] WooCommerce sync service implemented
- [x] Shopify import with streaming support
- [x] Price comparison dashboard (component + API)
- [x] Duplicate detection service
- [x] Store Add/Edit flow (reviewed and fixed)
- [x] Jest unit test suite setup (`jest.config.js`)
- [x] Unit tests: duplicate-detection, product-display, woocommerce-push, woocommerce-sync, API routes
- [x] CLAUDE.md — architecture source of truth created
- [x] .docs/PROJECT_SUMMARY.md — project overview created
- [x] .docs/PROJECT_TECH_SPECS.md — technical specifications created
- [x] .docs/PROJECT_STATUS.md — this file created
- [x] .docs/DESIGN_PATTERN.md — design system specification created
- [x] .docs/design/COMPONENTS_DESIGN.md — component catalogue created
- [x] `.design/` directory created for claude.design outputs
- [x] `.test/` directory structure created (e2e/, api/, fixtures/)
- [x] CLAUDE.md updated with Integration Architecture Rules (Section 13)
- [x] PROJECT_TECH_SPECS.md updated with Hybrid Integration Architecture section
- [x] INTEGRATION_FLOWS.md created (.docs/)
- [x] .env.example created with all integration env vars documented

---

## Phase 1 — Store & Product MVP + Order Integration

### Status: In Progress 🔄

### Pre-Requisites (must complete before any Phase 1 feature ships)

- [ ] **Install next-intl** — migrate from custom `getTranslations()`. Blocker for all new UI.
- [ ] **Install next-themes, zustand, @playwright/test, msw** — required for dark mode, state, and testing
- [ ] **Install @vercel/blob** — required for UC5 image storage (Phase 3, but install now)
- [ ] **Install @upstash/qstash** — required for `verifySignatureAppRouter`
- [ ] **Set up GitHub Actions CI** (`.github/workflows/ci.yml`) — Jest on push, Playwright on PR to main
- [ ] **Run multi-tenant schema migrations** — see DATABASE_DESIGN.md §9 for migration order
- [ ] **Provision CREDENTIAL_ENCRYPTION_KEY** — generate and set in Vercel before Phase 1 ships

### Phase 1 — Core Platform Tasks

- [ ] Complete FE API client layer (`src/lib/api/`)
- [ ] Add Zustand store for UI state (`src/lib/stores/ui.store.ts`)
- [ ] Implement dark/light mode toggle with next-themes
- [ ] Add Firebase auth token caching in Redis (TTL 15 min)
- [ ] Language switcher component (EN ↔ VI) in navbar
- [ ] Theme toggle component (dark ↔ light) in navbar
- [ ] Migrate all API routes to use standard response envelope `{ success, data, error, meta }`
- [ ] Add multi-tenant scope enforcement to ALL existing repository functions
- [ ] Add rate limiting to sync endpoints via Redis

---

## Use Case Implementation Status

<!-- updated: multi-tenant-uc1-7 -->

### UC1 — Auth + Store Connection (Phase 1)

- [ ] Prisma schema migrated: `User`, `Store`, `StoreCredential` (migration: `20260610_add_user_store_credential`)
- [ ] `src/lib/utils/credential-encryption.ts` — `encryptCredential` + `decryptCredential` implemented
- [ ] `src/lib/repositories/implementations/store-credential.repository.ts` — NEVER returns plaintext
- [ ] `src/lib/services/store-credential.service.ts` — credential factory (decrypt in-memory only)
- [ ] `src/lib/utils/woocommerce-client.ts` — updated: takes `(domain, key, secret)` params, no env vars
- [ ] `src/app/api/auth/register/route.ts` — creates User record on Firebase registration
- [ ] `src/app/api/stores/route.ts` — POST: validate credentials → encrypt → save → enqueue initial sync
- [ ] `src/app/api/stores/[storeId]/route.ts` — GET: verify userId ownership → return Store (no credentials)
- [ ] `POST /api/jobs/initial-sync-orders/route.ts` — chunked self-re-queuing (QStash sig auth)
- [ ] `POST /api/jobs/initial-sync-products/route.ts` — chunked self-re-queuing
- [ ] `POST /api/jobs/initial-sync-customers/route.ts` — chunked self-re-queuing
- [ ] `src/lib/jobs/registry.ts` — initial sync jobs registered
- [ ] `JOB_INITIAL_SYNC_ORDERS_URL`, `JOB_INITIAL_SYNC_PRODUCTS_URL`, `JOB_INITIAL_SYNC_CUSTOMERS_URL` set in Vercel
- [ ] `CREDENTIAL_ENCRYPTION_KEY` set in Vercel (preview + production)
- [ ] FE: `/[lang]/auth/register` — registration page
- [ ] FE: `/[lang]/dashboard/stores/new` — store connection form
- [ ] FE: `/[lang]/settings/stores` — manage stores (update credentials, delete)
- [ ] Playwright E2E: register → connect store → see store card (EN + VI)
- [ ] Jest unit: credential encrypt/decrypt round-trip
- [ ] Jest unit: wrong key → throws Error (not null)
- [ ] API contract: GET /api/stores response has no credential fields

### UC4 — Website Status Dashboard (Phase 1)

- [ ] `src/app/api/stores/[storeId]/check-status/route.ts` — POST: auth check → HTTP ping → WooCommerce API test → write result
- [ ] `src/lib/services/store-status.service.ts` — `checkStoreStatus(storeId, userId)` implemented
- [ ] `StoreStatus` enum: ONLINE | DEGRADED | OFFLINE | AUTH_ERROR | UNKNOWN
- [ ] FE: `/[lang]/dashboard` — store status grid (StoreStatusCard components, all stores for user)
- [ ] FE: `StoreStatusCard` component — shows status dot, last checked time, order/product counts, Check Now button
- [ ] FE: "Check Now" — optimistic UI update with TanStack Query mutation
- [ ] Dark mode: StoreStatusCard renders correctly in both modes
- [ ] Playwright E2E: connect store → dashboard shows card with status (EN + VI)
- [ ] Playwright E2E: click "Check Now" → card updates with live status

### UC2 — Unified Order View (Phase 2)

- [ ] Prisma schema: `Order`, `OrderItem`, `Customer` migrated (migration: `20260611_add_order_customer_orderitem`)
- [ ] Integration Flows 1 + 2 updated to use multi-tenant credential factory and scoped `storeId`
- [ ] `src/app/api/orders/route.ts` — GET: multi-store, paginated, filtered, scoped to userId
- [ ] Order table query verified with EXPLAIN ANALYZE (indexes used: `storeId_wooCreatedAt`)
- [ ] FE: `/[lang]/orders` — unified order table (50/page, server-side pagination)
- [ ] FE: Store domain filter (multi-select), status filter, date range, search input
- [ ] FE: Inline tracking number edit → PATCH /api/orders/[id]
- [ ] Playwright E2E: two stores with orders → orders from both appear in table, filterable (EN + VI)
- [ ] Playwright E2E: User A cannot see User B's orders (data isolation test)

### UC3 — Unified Product View + Cross-Store Push (Phase 2)

- [ ] Prisma schema: `Product`, `ProductCategory`, `ProductTag`, `ProductImage`, junctions migrated
- [ ] Integration Flow 3 updated to use multi-tenant credential factory
- [ ] `src/app/api/products/route.ts` — GET: multi-store, paginated, filtered, scoped to userId
- [ ] `src/app/api/products/push/route.ts` — POST: push flow (auth → conflict check → push → PushLog)
- [ ] `src/lib/services/product-push.service.ts` — `pushToStore({ sourceProductId, targetStoreId, renames, userId })`
- [ ] Conflict check calls LIVE WooCommerce API on target store (not CRM DB)
- [ ] `PushLog` records created for every push outcome (SUCCESS / SKIPPED / FAILED / CONFLICT)
- [ ] FE: `/[lang]/products` — unified product table with bulk select + Push to Store button
- [ ] FE: Push wizard modal (5 states: confirm → check → results → resolve → summary)
- [ ] FE: Conflict resolution drawer (Skip / Rename per row)
- [ ] Playwright E2E: clean push (no conflicts) → PushLog SUCCESS (EN + VI)
- [ ] Playwright E2E: conflict → dialog → rename → PushLog SUCCESS, renamedTo set, source product name unchanged
- [ ] Playwright E2E: conflict → dialog → skip → PushLog SKIPPED

### UC5 — Product Import Module (Phase 3)

- [ ] BLOCKER: `VERCEL_BLOB_READ_WRITE_TOKEN` provisioned in Vercel
- [ ] Prisma schema: `ImportJob`, `ImportedProduct` migrated (migration: `20260614_add_importjob_importedproduct`)
- [ ] `AssetFile` model migrated (migration: `20260613_add_productimage_assetfile`)
- [ ] `src/app/api/import/route.ts` — POST: parse file → create ImportJob + ImportedProducts
- [ ] `src/app/api/import/[jobId]/route.ts` — GET: import job status + products
- [ ] `src/app/api/import/[jobId]/push/route.ts` — POST: download images → Vercel Blob → push to WooCommerce
- [ ] WooCommerce CSV parser: handles minimum required columns (Name, Regular price, In stock)
- [ ] Shopify products.json parser: handles title, variants[0].price, images
- [ ] Malformed file: returns clear error, no ImportJob created
- [ ] `@vercel/blob` integration: download image → PUT to Blob → store blobUrl in AssetFile
- [ ] FE: `/[lang]/import` — upload dropzone + import history list
- [ ] FE: `/[lang]/import/[jobId]` — preview table (valid/warning/error rows), target store selector, push progress
- [ ] Playwright E2E: WooCommerce CSV upload → preview → push → AssetFile created (EN + VI)
- [ ] Playwright E2E: Shopify JSON upload → preview → push
- [ ] Playwright E2E: malformed file → error shown, no crash
- [ ] Playwright E2E: image 404 → product pushed without image, warning shown

### UC7 — Data Integrity (Cross-Cutting, All Phases)

- [ ] All unique constraints are composite `(storeId, externalId)` — no single-column WooCommerce ID constraints
- [ ] All repository functions accept `userId` or `storeId` as required parameter
- [ ] No global `prisma.[model].findMany()` calls without tenant WHERE clause
- [ ] Route handlers return 403 (not 404) when storeId belongs to another user
- [ ] Jest unit: User A service call with User B storeId → throws FORBIDDEN
- [ ] Jest unit: orderService.listOrders(userA) returns zero User B orders
- [ ] Playwright E2E: data-isolation.spec.ts — two accounts, full isolation verification

---

## Hybrid Integration — Implementation Status

<!-- updated: hybrid-integration -->

### Flow 1 — Order Webhook (Phase 1)

- [ ] Prisma: `WooOrder`, `WooOrderLineItem`, `SyncLog`, `SyncStatus` enum migrated (migration: `20260608_add_woo_order_sync`)
- [ ] `src/lib/types/woocommerce.types.ts` — `WooCommerceOrderPayload` interface complete
- [ ] `src/lib/utils/woocommerce-signature.ts` — HMAC-SHA256 verification utility
- [ ] `src/lib/repositories/interfaces/woo-order.interface.ts` — interface defined
- [ ] `src/lib/repositories/interfaces/sync-log.interface.ts` — interface defined
- [ ] `src/lib/repositories/implementations/woo-order.repository.ts` — implementation complete
- [ ] `src/lib/repositories/implementations/sync-log.repository.ts` — implementation complete
- [ ] `src/lib/services/order-sync.service.ts` — `upsertFromWooCommerce()` implemented
- [ ] `src/app/api/webhooks/woocommerce/route.ts` — HMAC verify + QStash publish only
- [ ] `src/app/api/jobs/process-order/route.ts` — QStash sig verify + service call only
- [ ] `src/lib/jobs/process-order.job.ts` — handler function extracted
- [ ] `.test/fixtures/woocommerce-order.json` — realistic order fixture created
- [ ] `.test/fixtures/woocommerce-order-minimal.json` — minimal order fixture
- [ ] `.test/fixtures/qstash-headers.ts` — QStash signature headers factory
- [ ] `.test/mocks/handlers.ts` — MSW base handler setup
- [ ] `.test/mocks/woocommerce.handlers.ts` — WooCommerce API mock handlers
- [ ] `.test/webhooks/woocommerce-sync.spec.ts` — all 7 webhook test scenarios passing
- [ ] WooCommerce webhook registered in production WooCommerce dashboard
- [ ] `WOOCOMMERCE_WEBHOOK_SECRET` set in Vercel env (preview + production)
- [ ] `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` set in Vercel env

### Flow 2 — Order Reconciliation (Phase 1)

- [ ] Prisma: `SyncCursor` model migrated (migration: `20260608_add_sync_cursor`)
- [ ] `src/lib/utils/woocommerce-client.ts` — `getOrders()` implemented with pagination + auth header
- [ ] `src/lib/repositories/interfaces/sync-cursor.interface.ts` — interface defined
- [ ] `src/lib/repositories/implementations/sync-cursor.repository.ts` — implementation complete
- [ ] `src/lib/services/reconciliation.service.ts` — `findAndRequeueMissingOrders()` implemented
- [ ] `src/app/api/jobs/reconcile-orders/route.ts` — QStash sig verify + service call only
- [ ] `src/lib/jobs/reconcile-orders.job.ts` — handler function extracted
- [ ] `src/lib/jobs/registry.ts` — `reconcile-orders` cron entry registered
- [ ] QStash cron schedule registered: `*/5 * * * *` → `JOB_RECONCILE_ORDERS_URL`
- [ ] `JOB_RECONCILE_ORDERS_URL` set in Vercel env
- [ ] `.test/fixtures/woocommerce-orders-page.json` — paginated orders fixture
- [ ] `.test/reconciliation/reconcile-orders.spec.ts` — all 7 reconciliation scenarios passing

### Flow 3 — Product Sync Inbound (Phase 2)

- [ ] Prisma: `WooProduct`, `WooProductImage`, `WooCategory`, `WooTag`, `WooProductCategory`, `WooProductTag` migrated (migration: `20260608_add_woo_product_sync`)
- [ ] `src/lib/types/woocommerce.types.ts` — `WooCommerceProductPayload` interface added
- [ ] `src/lib/utils/woocommerce-client.ts` — `getProducts()` implemented
- [ ] `src/lib/repositories/interfaces/woo-product.interface.ts` — interface defined
- [ ] `src/lib/repositories/implementations/woo-product.repository.ts` — implementation complete
- [ ] `src/lib/services/product-sync.service.ts` — `syncFromWooCommerce()` implemented
- [ ] `src/app/api/jobs/sync-products/route.ts` — QStash sig verify + service call only
- [ ] `src/lib/jobs/sync-products.job.ts` — handler function extracted
- [ ] `src/lib/jobs/registry.ts` — `sync-products` cron entry added
- [ ] QStash cron schedule registered: `*/30 * * * *` → `JOB_SYNC_PRODUCTS_URL`
- [ ] `JOB_SYNC_PRODUCTS_URL` set in Vercel env
- [ ] `.test/fixtures/woocommerce-product.json` — full product fixture
- [ ] `.test/fixtures/woocommerce-product-minimal.json` — product with no images fixture
- [ ] `.test/fixtures/woocommerce-products-page.json` — paginated products fixture
- [ ] `.test/mocks/woocommerce.handlers.ts` — product endpoints added
- [ ] `.test/products/sync-products.spec.ts` — all 8 product sync scenarios passing (EN + VI)

### Flow 4 — Product Push Outbound (Phase 3)

- [ ] **BLOCKER: New website API contract confirmed** — PM must obtain before implementation starts
- [ ] Prisma: `PushLog`, `PushStatus` enum migrated (migration: `20260608_add_push_log`)
- [ ] `src/lib/utils/new-website-api.ts` — concrete client implemented (replaces stub)
- [ ] `src/lib/repositories/interfaces/push-log.interface.ts` — interface defined
- [ ] `src/lib/repositories/implementations/push-log.repository.ts` — implementation complete
- [ ] `src/lib/services/product-push.service.ts` — `pushPublishableProducts()` implemented
- [ ] `src/app/api/jobs/push-products/route.ts` — QStash sig verify + service call only
- [ ] `src/app/api/admin/push-products/route.ts` — ADMIN/MANAGER auth + service call
- [ ] `src/lib/jobs/push-products.job.ts` — handler function extracted
- [ ] `src/lib/jobs/registry.ts` — `push-products` cron entry added
- [ ] QStash cron schedule registered: `0 * * * *` → `JOB_PUSH_PRODUCTS_URL`
- [ ] `JOB_PUSH_PRODUCTS_URL`, `NEW_WEBSITE_API_URL`, `NEW_WEBSITE_API_KEY` set in Vercel env
- [ ] Admin UI: `/[lang]/admin/sync/products` — product table with push trigger implemented
- [ ] Admin UI: `/[lang]/admin/sync/push-log` — push log table implemented
- [ ] `JobTriggerButton` component with confirmation modal implemented
- [ ] `.test/fixtures/new-website-push-response.json` — push response fixture
- [ ] `.test/mocks/new-website.handlers.ts` — new website API mock handlers
- [ ] `.test/products/push-products.spec.ts` — all 12 push scenarios passing (EN + VI)

### Flow 5 — Error Detection (Phase 3)

- [ ] Prisma: `ErrorReport`, `IntegrationFlow` enum, `ErrorSeverity` enum migrated (migration: `20260608_add_error_report`)
- [ ] `src/lib/repositories/interfaces/error-report.interface.ts` — interface defined
- [ ] `src/lib/repositories/implementations/error-report.repository.ts` — implementation complete
- [ ] `src/lib/services/error-detection.service.ts` — `runAllChecks()` implemented
- [ ] `src/app/api/jobs/detect-errors/route.ts` — QStash sig verify + service call only
- [ ] `src/lib/jobs/detect-errors.job.ts` — handler function extracted
- [ ] `src/lib/jobs/registry.ts` — `detect-errors` cron entry added
- [ ] QStash cron schedule registered: `*/30 * * * *` → `JOB_DETECT_ERRORS_URL`
- [ ] `JOB_DETECT_ERRORS_URL` set in Vercel env
- [ ] Admin UI: `/[lang]/admin/sync` — sync dashboard with all 5 flow status cards
- [ ] Admin UI: `/[lang]/admin/sync/orders` — sync log table with retry action
- [ ] Admin UI: `/[lang]/admin/sync/errors` — error report table with resolve action
- [ ] `SyncStatusBadge` component implemented
- [ ] `SyncFlowCard` component implemented
- [ ] `ErrorSeverityBadge` component implemented
- [ ] `SyncLogTable` component implemented
- [ ] Admin API endpoints: status, orders, orders/:id/retry, errors, errors/:id — all implemented
- [ ] `.test/errors/detect-errors.spec.ts` — all 6 error detection scenarios passing

---

## Phase 2 — Order Tracking & Logistics

### Status: Not Started

*Prerequisites: Phase 1 complete and signed off by QA. Flow 3 (product sync) also complete.*

---

## Phase 3 — Email Marketing & AI Content + Product Push + Error Detection

### Status: Not Started

*Prerequisites: Phase 2 complete. New website API contract confirmed. Vendor accounts (Mailjet, Gemini) provisioned.*

---

## Phase 4 — Analytics & Reporting + Error Notifications

### Status: Not Started

*Prerequisites: Phase 3 complete. Sufficient production data for meaningful analytics.*

---

## Blocked Items 🚫

<!-- updated: multi-tenant-uc1-7 -->

| Item | Owner | Blocker Description |
|---|---|---|
| **CREDENTIAL_ENCRYPTION_KEY** | BE/DevOps | Must be generated and set in Vercel before Phase 1 ships to staging. Without it, no store can be connected. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| **Multi-tenant schema migration** | BE | All new Prisma models must be migrated before any UC1 code runs. See DATABASE_DESIGN.md §9. |
| **New website API contract** | PM | 5 questions unanswered (auth, schema, rate limits, idempotency, response format). Blocks Flow 4 + UC5 push-to-new-website. Target: confirmed before Phase 3 kickoff. |
| **VERCEL_BLOB_READ_WRITE_TOKEN** | DevOps | Must be provisioned before UC5 image download/upload is implemented. Provision via Vercel Dashboard → Storage → Blob. |
| **next-intl migration** | FE | Must complete before any Phase 1 UI ships. Package install + `next.config.ts` update + replace all `getTranslations()` imports. |
| **Zustand, next-themes** | FE | `npm install zustand next-themes` |
| **Playwright + MSW** | QA | `npm install --save-dev @playwright/test msw` |
| **@upstash/qstash, @vercel/blob** | BE | `npm install @upstash/qstash @vercel/blob` |
| **Mailjet credentials** | PM | Phase 3. Requires vendor contract. |
| **AfterShip API key** | PM | Phase 2. Requires vendor signup. |
| **Google Gemini API key** | PM | Phase 3. Requires Google Cloud project setup. |

---

## Next Actions (Priority Order)

1. `npm install next-intl next-themes zustand @upstash/qstash` + `npm install --save-dev @playwright/test msw`
2. Create `.env.example` with all integration and existing vars documented
3. Migrate i18n from custom `getTranslations()` to next-intl
4. Set up GitHub Actions CI workflow (`.github/workflows/ci.yml`)
5. Register QStash cron schedules for Flows 2 + 3 via Upstash dashboard or CLI
6. Implement Flow 1 (order webhook) — start with signature utility and SyncLog model
7. Implement Flow 2 (reconciliation) — woocommerce-client.ts + reconciliation service
8. Write Playwright tests for Flow 1 + 2 before merging to main
9. Build sync admin UI foundations (`/admin/sync` layout + SyncStatusBadge component)
10. PM: begin new website API contract inquiry (target response before Phase 3 starts)
