# Integration Flows — Simple CRM

> Single reference for all WooCommerce ↔ CRM ↔ New Website integration work.
> A developer reading only this file should know exactly what to build, where to put it, how to test it, and what "done" looks like.
>
> All decisions referenced here are recorded in the Phase 2 Decision Log (see top of this file's git history).
> Do not add a new flow without a team discussion and a Decision Log entry.

<!-- updated: multi-tenant-uc1-7 -->

**Multi-tenant update:** All 5 flows have been updated for the multi-tenant architecture.
- WooCommerce credentials (`consumer_key`, `consumer_secret`) are NO LONGER in env vars. They are stored per-store in `StoreCredential` (encrypted). Each job payload must include `storeId`. The job processor fetches and decrypts credentials via `storeCredentialService` before making any WooCommerce API call.
- All DB writes include `storeId` scoping. No global writes.
- Model names updated: `WooOrder → Order`, `WooProduct → Product`, `WooOrderLineItem → OrderItem`.
- Webhook URL includes `?storeId={storeId}` query param so the webhook route can look up the store's webhook secret.

---

## 1. Overview — Hybrid Integration Strategy

The system uses a **Webhook Push + Scheduled Polling** hybrid. Different data flows use the mechanism best suited to their latency and reliability requirements:

| Mechanism | When to use | Flows |
|---|---|---|
| Webhook push | Time-critical, event-driven | Flow 1 (orders) |
| Scheduled polling | Safety net, slow-changing data | Flows 2, 3, 4, 5 |

**Why not webhooks for everything?** WooCommerce webhooks are unreliable: they can fail silently on network blips, Vercel cold starts can cause timeout, and WooCommerce's retry window is finite. Relying on webhooks alone guarantees missed data over time.

**Why not polling for everything?** Polling introduces lag proportional to the interval. A 5-minute polling interval means a customer's just-paid order might not appear in the CRM for up to 5 minutes — unacceptable for fulfillment workflows.

**Upstash QStash** is the delivery layer for all async work. It:
- Delivers HTTP POST requests to Vercel Route Handlers (serverless-compatible — no persistent workers)
- Manages cron schedules for polling jobs
- Provides signature-based authentication for all job endpoints
- Handles retry policies automatically

**Replacing BullMQ:** BullMQ requires persistent worker processes. Vercel is serverless. All new integration code uses QStash exclusively. Existing BullMQ code (AI jobs, email sends) is a tracked migration for Phase 3.

---

## 2. System Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WOOCOMMERCE STORE                                │
│                                                                          │
│  Events: order.created, order.updated                                   │
│  REST API: /wp-json/wc/v3/orders, /wp-json/wc/v3/products               │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
         ┌─────────────▼──────────────────────────────┐
         │             FLOW 1: WEBHOOK PUSH            │
         │  POST /api/webhooks/woocommerce             │
         │  (HMAC verify → publish to QStash)          │
         └─────────────┬──────────────────────────────┘
                       │
         ┌─────────────▼──────────────────────────────┐
         │         UPSTASH QSTASH                       │
         │                                             │
         │  Flow 1: Fan-out → /api/jobs/process-order  │
         │  Flow 2: Cron */5  → /api/jobs/reconcile-orders │
         │  Flow 3: Cron */30 → /api/jobs/sync-products    │
         │  Flow 4: Cron 0 *  → /api/jobs/push-products   │
         │  Flow 5: Cron */30 → /api/jobs/detect-errors   │
         └─────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────────────┐
│                     SIMPLE CRM (Vercel / Next.js)                        │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  JOB PROCESSOR ROUTES (QStash sig auth, no Firebase auth)        │   │
│  │  /api/jobs/process-order       → orderSyncService                │   │
│  │  /api/jobs/reconcile-orders    → reconciliationService           │   │
│  │  /api/jobs/sync-products       → productSyncService              │   │
│  │  /api/jobs/push-products       → productPushService              │   │
│  │  /api/jobs/detect-errors       → errorDetectionService           │   │
│  └───────────────────────────────────┬────────────────────────────────┘  │
│                                      │                                   │
│  ┌───────────────────────────────────▼────────────────────────────────┐  │
│  │  SERVICE LAYER                                                      │  │
│  │  order-sync.service   reconciliation.service                        │  │
│  │  product-sync.service product-push.service                          │  │
│  │  error-detection.service                                            │  │
│  └───────────────────────────────────┬────────────────────────────────┘  │
│                                      │                                   │
│  ┌───────────────────────────────────▼────────────────────────────────┐  │
│  │  REPOSITORY LAYER (Prisma + Neon DB)                                │  │
│  │  WooOrder   WooOrderLineItem   SyncLog   SyncCursor                 │  │
│  │  WooProduct WooProductImage    WooCategory WooTag                   │  │
│  │  PushLog    ErrorReport                                             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                      │                                   │
│  ADMIN UI ROUTES (Firebase auth, ADMIN/MANAGER role)                     │
│  /api/admin/push-products   → manual trigger for Flow 4                  │
│  /api/admin/sync/status     → GET all flow statuses                      │
│  /api/admin/sync/orders     → GET paginated SyncLog                      │
│  /api/admin/sync/products   → GET paginated WooProduct                   │
│  /api/admin/sync/push-log   → GET paginated PushLog                      │
│  /api/admin/sync/errors     → GET paginated ErrorReport                  │
└──────────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       │ Flow 4: outbound push
                                       ▼
                          ┌────────────────────────────┐
                          │     NEW WEBSITE API         │
                          │  (⚠ Contract TBD — stub)   │
                          └────────────────────────────┘
```

---

## 3. Flow 1 — Order Webhook

### Purpose
Real-time order data from WooCommerce into CRM. A customer pays → WooCommerce fires a webhook → CRM records the order within 5 seconds.

### Sequence Diagram

```
WooCommerce          /api/webhooks/woocommerce    QStash      /api/jobs/process-order    Neon DB
     │                         │                    │                    │                   │
     │─── POST (order event) ──▶│                    │                    │                   │
     │    x-wc-webhook-sig     │                    │                    │                   │
     │                         │── verify HMAC ──▶  │                    │                   │
     │                         │                    │                    │                   │
     │                         │── publish(payload)──▶                   │                   │
     │                         │                    │── POST (payload) ──▶                   │
     │◀── 200 OK ──────────────│                    │  + QStash sig      │                   │
     │                         │                    │                    │── verify QStash sig│
     │                         │                    │                    │── orderSyncService │
     │                         │                    │                    │── upsert order ───▶│
     │                         │                    │                    │◀── WooOrder saved ─│
     │                         │                    │◀── 200 OK ─────────│                   │
```

### Files Involved

<!-- updated: multi-tenant-uc1-7 -->

| File | Role |
|---|---|
| `src/app/api/webhooks/woocommerce/route.ts` | Entry point: reads `storeId` from query param, fetches webhook secret from Redis cache (or DB), HMAC verify, QStash publish with `{ storeId, ...payload }` |
| `src/lib/utils/woocommerce-signature.ts` | HMAC-SHA256 verification. Takes `(rawBody, signature, webhookSecret)` — secret sourced from StoreCredential, NOT env var |
| `src/app/api/jobs/process-order/route.ts` | Job processor: QStash sig verify + service call |
| `src/lib/jobs/process-order.job.ts` | Handler: `{ storeId, ...orderPayload }` — storeId is mandatory |
| `src/lib/services/order-sync.service.ts` | `upsertFromWooCommerce({ storeId, payload })` — all writes scoped to storeId |
| `src/lib/repositories/implementations/order.repository.ts` | DB writes for Order + OrderItem, `@@unique([storeId, wooOrderId])` |
| `src/lib/repositories/implementations/sync-log.repository.ts` | SyncLog upsert: `@@unique([storeId, wooOrderId])` |
| `src/lib/types/woocommerce.types.ts` | `WooCommerceOrderPayload` TypeScript interface |
| `prisma/schema.prisma` | `Order`, `OrderItem`, `SyncLog`, `SyncStatus` enum |

### Security Model

**Step 1 — WooCommerce → Webhook route:**
- Webhook URL registered in WooCommerce: `https://app.simplecrm.vn/api/webhooks/woocommerce?storeId={storeId}`
- Route reads `storeId` from query param
- Checks Redis cache `wh:creds:{storeId}` (TTL 5 min) for the encrypted webhook secret bytes
- Cache miss: fetches `StoreCredential.encryptedWebhookSecret` + `webhookSecretIv` from DB (single PK lookup)
- Decrypts webhook secret in memory
- WooCommerce sends `x-wc-webhook-signature` header: `base64(HMAC-SHA256(rawBody, webhookSecret))`
- If signatures do not match → return `401 Unauthorized` immediately. No QStash publish.
- **Must use raw body (not parsed JSON)** for HMAC verification. Use `req.text()` then parse separately.

**Step 2 — QStash → Job processor route:**
- QStash adds its own signature headers to every delivery
- `verifySignatureAppRouter` from `@upstash/qstash` validates these
- If QStash sig invalid → return `401`. This prevents anyone from hitting the job processor directly.

**No Firebase auth on job processor routes.** QStash signature IS the authentication.

### Error Handling

| Scenario | Behavior |
|---|---|
| Invalid HMAC | 401, no QStash publish, WooCommerce retries (up to 5×) |
| QStash publish fails | 500 returned to WooCommerce, WooCommerce retries |
| Duplicate `(storeId, wooOrderId)` | `SyncLog` unique constraint → treated as already-processed (no-op) |
| Service throws | `SyncLog.status = FAILED`, `errorMessage` captured. QStash retries 3× (non-200 response). |
| All 3 QStash retries fail | `SyncLog` remains FAILED. Flow 2 (reconciliation) will re-queue it. |
| `storeId` not found or no credential | 400 returned, no publish |

### How to Test Locally (ngrok Setup)

1. Install ngrok: `brew install ngrok` or download from ngrok.com
2. Start Next.js dev server: `npm run dev` (port 3000)
3. Expose it: `ngrok http 3000`
4. Connect a test store via the UI (or POST /api/stores) — note the `storeId` returned
5. Copy the ngrok HTTPS URL (e.g. `https://abc123.ngrok.io`)
6. In WooCommerce admin: WooCommerce → Settings → Advanced → Webhooks → Add webhook
   - Status: Active
   - Topic: Order Created
   - Delivery URL: `https://abc123.ngrok.io/api/webhooks/woocommerce?storeId={your-storeId}`
   - Secret: (must match what was saved as `StoreCredential.encryptedWebhookSecret` during store connection)
7. Click "Send test" — verify your local dev server receives and processes it
8. Check `.test/fixtures/woocommerce-order.json` matches the payload shape

---

## 4. Flow 2 — Order Reconciliation

### Purpose
Safety net for missed webhooks. Every 5 minutes, query WooCommerce for any orders not yet in CRM, and re-queue them for the same Flow 1 processor.

### Sequence Diagram

```
QStash (cron)    /api/jobs/reconcile-orders    WooCommerce API    SyncLog DB    QStash
     │                      │                         │                │            │
     │── POST (cron tick) ──▶│                         │                │            │
     │                      │── verify QStash sig      │                │            │
     │                      │── get lastOrderSyncAt ──────────────────▶│            │
     │                      │◀── cursor value ─────────────────────────│            │
     │                      │── GET /orders?after=cursor ──▶            │            │
     │                      │◀── orders[] ─────────────│                │            │
     │                      │                          │                │            │
     │                      │── for each order:        │                │            │
     │                      │   check SyncLog ─────────────────────────▶            │
     │                      │◀── status ───────────────────────────────│            │
     │                      │   if MISSING or FAILED:  │                │            │
     │                      │── QStash.publish(order) ─────────────────────────────▶│
     │                      │                          │                │            │
     │                      │── update SyncCursor ──────────────────────▶            │
     │◀── 200 OK ───────────│                          │                │            │
```

### Files Involved

| File | Role |
|---|---|
| `src/app/api/jobs/reconcile-orders/route.ts` | Job processor: QStash sig + service call |
| `src/lib/jobs/reconcile-orders.job.ts` | Handler function |
| `src/lib/services/reconciliation.service.ts` | `findAndRequeueMissingOrders()` |
| `src/lib/utils/woocommerce-client.ts` | `getOrders({ after, page, per_page })` |
| `src/lib/repositories/implementations/sync-cursor.repository.ts` | Read/write `lastOrderSyncAt` |
| `src/lib/repositories/implementations/sync-log.repository.ts` | Check if wooOrderId is synced |
| `src/lib/jobs/registry.ts` | Cron definition: `*/5 * * * *` |

### Cursor Management

- Read `SyncCursor` where `name = 'lastOrderSyncAt'`
- Query WooCommerce: `GET /orders?after={cursor}&status=any&per_page=100`
- For each order returned: check `SyncLog` for `wooOrderId`. If not found or status=FAILED → publish to QStash (→ Flow 1 processor)
- After all pages processed: update `SyncCursor.value` to `now()` (only on full success — not per-page)
- If any error occurs mid-run: do NOT update cursor (ensures next run covers the same window)

### How to Verify Reconciliation Caught a Missed Webhook

1. Create an order in WooCommerce
2. Temporarily disable the webhook in WooCommerce (or block the webhook URL)
3. Wait for the next 5-minute cron tick
4. Check `SyncLog` — the order should appear with `status=SUCCESS` (re-queued and processed)
5. Check `SyncCursor.lastOrderSyncAt` updated correctly

---

## 5. Flow 3 — Product Sync Inbound

### Purpose
Keep CRM's `WooProduct` table in sync with WooCommerce product catalog. Runs every 30 minutes. Only fetches products modified since the last run.

### Sequence Diagram

```
QStash (cron)    /api/jobs/sync-products    WooCommerce API    WooProduct DB    SyncCursor
     │                    │                        │                   │              │
     │── POST (cron) ─────▶│                        │                   │              │
     │                    │── verify QStash sig     │                   │              │
     │                    │── get lastProductSyncAt ─────────────────────────────────▶│
     │                    │◀── cursor ───────────────────────────────────────────────│
     │                    │── GET /products?after=cursor ──▶            │              │
     │                    │◀── products[] (page 1) ────────│            │              │
     │                    │── upsert each product ──────────────────────▶              │
     │                    │── GET /products (page 2) ──────▶            │              │
     │                    │◀── products[] ─────────────────│            │              │
     │                    │── upsert each ──────────────────────────────▶              │
     │                    │── (repeat until no more pages)  │           │              │
     │                    │── update SyncCursor ─────────────────────────────────────▶│
     │◀── 200 OK ─────────│                        │                   │              │
```

### Files Involved

| File | Role |
|---|---|
| `src/app/api/jobs/sync-products/route.ts` | Job processor |
| `src/lib/jobs/sync-products.job.ts` | Handler function |
| `src/lib/services/product-sync.service.ts` | `syncFromWooCommerce()` |
| `src/lib/utils/woocommerce-client.ts` | `getProducts({ after, page, per_page })` |
| `src/lib/repositories/implementations/woo-product.repository.ts` | Upsert by `wooId` |
| `src/lib/repositories/implementations/sync-cursor.repository.ts` | Read/write `lastProductSyncAt` |
| `src/lib/types/woocommerce.types.ts` | `WooCommerceProductPayload` interface |
| `prisma/schema.prisma` | `WooProduct`, `WooProductImage`, `WooCategory`, `WooTag` + junction tables |
| `src/lib/jobs/registry.ts` | Cron definition: `*/30 * * * *` |

### WooCommerce → Prisma Field Mapping

| WooCommerce Field | WooProduct Column | Type | Notes |
|---|---|---|---|
| `id` | `wooId` | `Int @unique` | Idempotency key |
| `name` | `title` | `String` | |
| `slug` | `slug` | `String` | |
| `sku` | `sku` | `String?` | Variable products: sku from first variation |
| `status` | `status` | `String` | publish \| draft \| private \| trash |
| `description` | `description` | `String?` | |
| `short_description` | `shortDescription` | `String?` | |
| `price` | `price` | `Decimal(10,2)?` | |
| `regular_price` | `regularPrice` | `Decimal(10,2)?` | |
| `sale_price` | `salePrice` | `Decimal(10,2)?` | |
| `stock_quantity` | `stockQuantity` | `Int?` | |
| `stock_status` | `stockStatus` | `String` | instock \| outofstock \| onbackorder |
| `manage_stock` | `manageStock` | `Boolean` | |
| `images[0].src` | `featuredImage` | `String?` | |
| `images[]` | `WooProductImage[]` | relation | All images stored |
| `categories[]` | `WooCategory[]` | via junction | Upsert by `wooId` |
| `tags[]` | `WooTag[]` | via junction | Upsert by `wooId` |
| `date_modified` | `sourceUpdatedAt` | `DateTime` | Used as cursor for next run |
| — | `rawPayload` | `Json` | Full WooCommerce payload stored |

### Pagination Strategy

- Request with `per_page=100` (WooCommerce max)
- Check response headers `X-WP-Total` and `X-WP-TotalPages`
- If `totalPages > 1`: fetch pages 2...N with 100ms delay between requests
- Cursor is updated only after all pages are successfully processed

---

## 6. Flow 4 — Product Push Outbound

### Purpose
Push CRM product catalog to the new website. Triggered by QStash cron (hourly) or manually by ADMIN/MANAGER via the CRM admin UI.

### ⚠ Current Status: Implementation Blocked

The new website API contract is unknown. The `lib/utils/new-website-api.ts` file exports a `PlaceholderNewWebsiteApiClient` that throws `NotImplementedError`. Replace with the concrete client once PM provides answers to the 5 contract questions.

### Sequence Diagram (Cron Mode)

```
QStash (cron)    /api/jobs/push-products    productPushService    WooProduct DB    NewWebsiteAPI    PushLog DB
     │                    │                        │                    │                 │               │
     │── POST (cron) ─────▶│                        │                   │                 │               │
     │                    │── verify QStash sig     │                   │                 │               │
     │                    │── pushPublishableProducts()──▶              │                 │               │
     │                    │                        │── query publishable──▶               │               │
     │                    │                        │◀── products[] ─────│                 │               │
     │                    │                        │── for each product: │                │               │
     │                    │                        │   check PushLog ───────────────────────────────────▶│
     │                    │                        │◀── status ─────────────────────────────────────────│
     │                    │                        │   if no PENDING:    │                │               │
     │                    │                        │── create PENDING ───────────────────────────────────▶│
     │                    │                        │── pushProduct(p) ───────────────────▶│               │
     │                    │                        │◀── result ─────────────────────────────             │
     │                    │                        │── update PENDING ────────────────────────────────────▶│
     │                    │                        │   → SUCCESS/FAILED │                 │               │
     │◀── 200 OK ─────────│                        │                   │                 │               │
```

### Files Involved

| File | Role |
|---|---|
| `src/app/api/jobs/push-products/route.ts` | Cron job processor (QStash sig auth) |
| `src/app/api/admin/push-products/route.ts` | Manual trigger (Firebase auth + ADMIN/MANAGER role) |
| `src/lib/jobs/push-products.job.ts` | Handler function |
| `src/lib/services/product-push.service.ts` | `pushPublishableProducts()` |
| `src/lib/utils/new-website-api.ts` | New website API client (stub until contract confirmed) |
| `src/lib/repositories/implementations/woo-product.repository.ts` | Query publishable products |
| `src/lib/repositories/implementations/push-log.repository.ts` | Read/write PushLog |
| `src/lib/jobs/registry.ts` | Cron definition: `0 * * * *` |

### Publishable Product Rules

A product is pushed to the new website if ALL conditions are true:
1. `WooProduct.status = 'publish'`
2. `WooProduct.stockStatus = 'instock'` OR (`WooProduct.manageStock = false` AND `WooProduct.status = 'publish'`)
3. `WooProduct.featuredImage IS NOT NULL`
4. `WooProduct.title IS NOT NULL AND WooProduct.title ≠ ''`
5. No active exclusion rule applies (exclusion list — future feature, currently empty)

### PushLog Lifecycle

```
[Not exists] → create PENDING → [API call] → SUCCESS or FAILED or SKIPPED

Deduplication rule: if PENDING PushLog exists for wooProductId → SKIP (do not create duplicate)
```

### Manual Trigger Flow

1. CRM operator (ADMIN or MANAGER) clicks "Kích hoạt đẩy thủ công" in `/admin/sync/products`
2. `JobTriggerButton` opens confirmation modal: "Push {count} products to the new website?"
3. Operator clicks "Đẩy ngay" (not the default focus — Cancel is)
4. `POST /api/admin/push-products` called with optional `{ storeId?, productIds? }` body
5. Route handler verifies Firebase auth → checks role → calls `productPushService.pushPublishableProducts()`
6. Response returns immediately with `{ jobId, count }` — push runs async (QStash publishes back to job processor)
7. Operator monitors progress in `/admin/sync/push-log`

### New Website API Contract — Questions for PM

Before implementing the concrete client, PM must confirm:

| # | Question | Why needed |
|---|---|---|
| 1 | Auth method? (API key header / OAuth / Bearer JWT) | Determines `newWebsiteApiClient` auth setup |
| 2 | Product payload schema + field naming (camelCase / snake_case)? | Determines `PublishableProduct` type |
| 3 | Rate limits (req/s or req/min per API key)? | Determines batching strategy |
| 4 | Idempotency: POST same externalId twice → update or reject? | Determines whether to use POST or PUT/PATCH |
| 5 | Response format: full resource returned or status code only? | Determines `PushResult` type |

---

## 7. Flow 5 — Error Detection

### Purpose
Detect silent integration failures by analyzing DB state. Runs every 30 minutes. Creates `ErrorReport` records for any anomaly found. Deduplicates reports so the same error is not reported repeatedly until resolved.

### Sequence Diagram

```
QStash (cron)    /api/jobs/detect-errors    errorDetectionService    DB queries    ErrorReport DB
     │                   │                          │                     │                │
     │── POST (cron) ────▶│                          │                    │                │
     │                   │── verify QStash sig       │                    │                │
     │                   │── runAllChecks() ─────────▶                    │                │
     │                   │                          │── checkStalePending()──▶             │
     │                   │                          │── checkFailedOrders()──▶             │
     │                   │                          │── checkOrderCountMismatch()──────────▶│
     │                   │                          │── checkPushFailureRate()─────────────▶│
     │                   │                          │── checkProductSyncLag()──────────────▶│
     │                   │                          │                    │                │
     │                   │                          │── for each finding: │                │
     │                   │                          │   check existing ───────────────────▶│
     │                   │                          │◀── existing? ───────────────────────│
     │                   │                          │   if none: create ErrorReport ───────▶│
     │                   │                          │   if exists: bump updatedAt ──────────▶│
     │◀── 200 OK ─────────│                          │                    │                │
```

### Files Involved

| File | Role |
|---|---|
| `src/app/api/jobs/detect-errors/route.ts` | Job processor |
| `src/lib/jobs/detect-errors.job.ts` | Handler function |
| `src/lib/services/error-detection.service.ts` | `runAllChecks()` — 5 independent checks |
| `src/lib/repositories/implementations/error-report.repository.ts` | Upsert with deduplication |
| `src/lib/utils/woocommerce-client.ts` | `getOrderCount()` for count comparison |
| `src/lib/jobs/registry.ts` | Cron definition: `*/30 * * * *` |

### Error Checks Performed

| Check | Severity | Condition | Error Code |
|---|---|---|---|
| Stale pending orders | CRITICAL | `SyncLog.status = PENDING AND processedAt > 2h ago` | `STALE_PENDING_ORDERS` |
| Failed order syncs | CRITICAL | `SyncLog.status = FAILED AND count > 3 in last 1h` | `FAILED_ORDER_SYNCS` |
| Order count mismatch | WARNING | WooCommerce count vs CRM count mismatch > 5% in last 24h | `ORDER_COUNT_MISMATCH` |
| Push failure rate | WARNING | `PushLog.status = FAILED` rate > 50% in last push run | `HIGH_PUSH_FAILURE_RATE` |
| Product sync lag | WARNING | `SyncCursor.lastProductSyncAt` is > 60 min ago | `PRODUCT_SYNC_LAG` |
| WooCommerce API 401 | CRITICAL | Last poll returned 401 (credentials invalid) | `WOO_API_UNAUTHORIZED` |

### Error Severity SLA

| Severity | Action Required | Notification |
|---|---|---|
| CRITICAL | Within 2 hours | In-app dashboard (Phase 3). Slack webhook (Phase 4). |
| WARNING | Within 24 hours | In-app dashboard only. |
| INFO | None | Logged only. No UI surfacing. |

### Error Lifecycle

```
Detected → ErrorReport created (resolvedAt: null) → visible in /admin/sync/errors
Operator investigates → PATCH /api/admin/sync/errors/:id { resolvedAt: now() }
ErrorReport.resolvedAt set → removed from "unresolved" filter view
If same error occurs again after resolution → new ErrorReport created (previous is resolved)
```

### Deduplication Logic

Before creating a new `ErrorReport`:
1. Compute `messageHash = sha256(flow + errorCode)`
2. Query: `ErrorReport WHERE flow = ? AND messageHash = ? AND resolvedAt IS NULL`
3. If found: `UPDATE ErrorReport SET updatedAt = now()` — do NOT insert duplicate
4. If not found: `INSERT INTO ErrorReport (...)` — new active error

---

## 8. Shared Utilities

<!-- updated: multi-tenant-uc1-7 -->

### `lib/utils/woocommerce-client.ts` — Multi-Tenant Version

Typed WooCommerce REST API client. **No longer reads env vars.** All WooCommerce calls (Flows 1–5) must go through this client — never raw `fetch()`.

**Factory pattern** — credentials are passed in, not read from env:

```typescript
import { buildWooCommerceClient } from '@/lib/utils/woocommerce-client'

// Caller (service layer) decrypts credentials first, then builds client
const client = buildWooCommerceClient({
  domain: store.domain,         // e.g. "mystore.vn"
  consumerKey: decryptedKey,    // plaintext, on call stack only
  consumerSecret: decryptedSecret
})

// Get orders modified after cursor (with pagination)
const { orders, totalPages } = await client.getOrders({
  after: '2026-06-01T00:00:00Z',
  page: 1,
  perPage: 100,
  status: 'any'
})

// Get products modified after cursor
const { products, totalPages } = await client.getProducts({
  after: '2026-06-01T00:00:00Z',
  page: 1,
  perPage: 100
})

// Validate credentials (used in UC1 store connection + UC4 status check)
const status = await client.getSystemStatus()
```

**Auth:** `Authorization: Basic base64(consumerKey:consumerSecret)` — set automatically from constructor params. Never add auth to individual calls.

**Rate limiting:** 100ms delay between pagination page requests (configurable via `WOO_PAGE_DELAY_MS` env var).

**Error types:**
- `WooApiAuthError` — 401, invalid credentials → creates CRITICAL ErrorReport
- `WooApiRateLimitError` — 429, includes `Retry-After` header → retryable, QStash handles
- `WooApiServerError` — 5xx → retryable

### `lib/services/store-credential.service.ts` — Credential Factory

```typescript
// Called by all services that need WooCommerce access
export async function buildClientForStore(storeId: string) {
  const credential = await storeCredentialRepository.findByStoreId(storeId)
  if (!credential) throw new NotFoundError('STORE_CREDENTIAL_NOT_FOUND')
  const store = await storeRepository.findById(storeId)
  const consumerKey = decryptCredential(credential.encryptedConsumerKey, credential.consumerKeyIv)
  const consumerSecret = decryptCredential(credential.encryptedConsumerSecret, credential.consumerSecretIv)
  return buildWooCommerceClient({ domain: store.domain, consumerKey, consumerSecret })
  // decryptedKey/secret live on the call stack — not returned, not cached
}
```

### `lib/utils/new-website-api.ts`

Typed outbound push client. **Currently a stub pending API contract confirmation.**

```typescript
import { newWebsiteApiClient } from '@/lib/utils/new-website-api'

// Push a product (throws NotImplementedError until contract confirmed)
const result = await newWebsiteApiClient.pushProduct({
  externalId: 'woo_42',
  title: 'Áo phông',
  price: 299000,
  // ... PublishableProduct fields
})
// result: { success: true, websiteProductId: '...' }
//      or: { success: false, errorCode: 'RATE_LIMITED', retryAfter: 60 }
```

**Retry:** 3 attempts, exponential backoff: 1s → 2s → 4s. After 3 failures, returns `{ success: false }`.

### `lib/utils/woocommerce-signature.ts`

HMAC-SHA256 verification for incoming WooCommerce webhooks.

```typescript
import { verifyWooCommerceSignature } from '@/lib/utils/woocommerce-signature'

// In webhook route handler — webhook secret is fetched from DB/Redis, NOT env var
const rawBody = await req.text()
const signature = req.headers.get('x-wc-webhook-signature')
const webhookSecret = await getWebhookSecretForStore(storeId)  // from Redis cache or StoreCredential

if (!verifyWooCommerceSignature(rawBody, signature, webhookSecret)) {
  return new Response('Unauthorized', { status: 401 })
}
```

**Important:** Always use `req.text()` before `JSON.parse()`. Parsing first changes the body and invalidates the HMAC.

### `lib/jobs/registry.ts`

Single source of truth for all QStash cron jobs. Import and use when registering or updating schedules.

```typescript
export const JOB_REGISTRY = [
  {
    name: 'reconcile-orders',
    cronExpression: '*/5 * * * *',
    destinationEnvVar: 'JOB_RECONCILE_ORDERS_URL',
    retries: 3,
    timeoutSeconds: 30,
    phase: 1,
  },
  {
    name: 'sync-products',
    cronExpression: '*/30 * * * *',
    destinationEnvVar: 'JOB_SYNC_PRODUCTS_URL',
    retries: 3,
    timeoutSeconds: 120,
    phase: 2,
  },
  {
    name: 'push-products',
    cronExpression: '0 * * * *',
    destinationEnvVar: 'JOB_PUSH_PRODUCTS_URL',
    retries: 3,
    timeoutSeconds: 120,
    phase: 3,
  },
  {
    name: 'detect-errors',
    cronExpression: '*/30 * * * *',
    destinationEnvVar: 'JOB_DETECT_ERRORS_URL',
    retries: 2,
    timeoutSeconds: 60,
    phase: 3,
  },
] as const
```

**Adding a new job:** Add entry to this registry AND register the cron in the Upstash dashboard. Both must happen in the same PR.

---

## 9. Environment Variables

### Full Integration Variable Reference

| Variable | Description | Required Phase | Used By |
|---|---|---|---|
| `WOOCOMMERCE_BASE_URL` | WooCommerce store URL (e.g. `https://mystore.com`) | 1 | Flows 1, 2, 3, 5 |
| `WOOCOMMERCE_CONSUMER_KEY` | WooCommerce REST API consumer key | 1 | Flows 2, 3, 5 |
| `WOOCOMMERCE_CONSUMER_SECRET` | WooCommerce REST API consumer secret | 1 | Flows 2, 3, 5 |
| `WOOCOMMERCE_WEBHOOK_SECRET` | HMAC-SHA256 secret from WooCommerce webhook config | 1 | Flow 1 |
| `QSTASH_URL` | Upstash QStash publish URL (`https://qstash.upstash.io/v2/publish/`) | 1 | All flows |
| `QSTASH_TOKEN` | Upstash QStash bearer auth token | 1 | All flows |
| `QSTASH_CURRENT_SIGNING_KEY` | Current QStash signing key (from Upstash dashboard) | 1 | All flows |
| `QSTASH_NEXT_SIGNING_KEY` | Next QStash signing key (supports key rotation) | 1 | All flows |
| `JOB_RECONCILE_ORDERS_URL` | Full public URL: `{APP_URL}/api/jobs/reconcile-orders` | 1 | Flow 2 |
| `JOB_SYNC_PRODUCTS_URL` | Full public URL: `{APP_URL}/api/jobs/sync-products` | 2 | Flow 3 |
| `JOB_PUSH_PRODUCTS_URL` | Full public URL: `{APP_URL}/api/jobs/push-products` | 3 | Flow 4 |
| `JOB_DETECT_ERRORS_URL` | Full public URL: `{APP_URL}/api/jobs/detect-errors` | 3 | Flow 5 |
| `NEW_WEBSITE_API_URL` | New website API base URL (TBD — pending contract) | 3 | Flow 4 |
| `NEW_WEBSITE_API_KEY` | New website API authentication key (TBD — pending contract) | 3 | Flow 4 |

### Vercel Environment Configuration

Set each variable in the Vercel dashboard under the correct environment(s):
- `Development`: local dev values (or omit — use `.env.local`)
- `Preview`: staging values (use a WooCommerce staging store)
- `Production`: live values only

**JOB_*_URL variables:** These must point to the actual deployed URL per environment. For Preview: `https://simple-crm-git-main-*.vercel.app/api/jobs/...`. For Production: `https://app.simplecrm.vn/api/jobs/...`.

---

## 10. Local Development Guide

### Simulating WooCommerce Webhooks Locally

1. Install ngrok and start it: `ngrok http 3000`
2. Copy the `https://*.ngrok.io` URL
3. Set `.env.local`:
   ```
   WOOCOMMERCE_WEBHOOK_SECRET=your_test_secret
   NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
   ```
4. Register webhook in WooCommerce: Topic=Order Created, URL=`{ngrok_url}/api/webhooks/woocommerce`, Secret=your_test_secret
5. Create a test order in WooCommerce
6. Observe the webhook received in ngrok inspector and processed in your Next.js logs

### Triggering QStash Jobs Locally

QStash provides a CLI for local development:

```bash
# Install QStash CLI
npm install -g @upstash/qstash-cli

# Publish a test message to your local job endpoint
qstash publish --url http://localhost:3000/api/jobs/reconcile-orders \
  --token $QSTASH_TOKEN \
  --body '{}'
```

Alternatively, use `curl` with a manually constructed QStash-compatible signature for local testing. See `.test/fixtures/qstash-headers.ts` for the test signature factory.

### Running Tests Without Hitting Real APIs

All tests use MSW (Mock Service Worker) to intercept API calls:

```bash
# Run all integration tests
npx playwright test .test/webhooks/ .test/reconciliation/ .test/products/ .test/errors/

# Run a specific flow's tests
npx playwright test .test/webhooks/woocommerce-sync.spec.ts
```

**CI environment variables** (set in `.github/workflows/ci.yml`):
```yaml
env:
  WOOCOMMERCE_BASE_URL: http://localhost:9001   # MSW intercepts
  NEW_WEBSITE_API_URL: http://localhost:9002    # MSW intercepts
  WOOCOMMERCE_CONSUMER_KEY: test_key
  WOOCOMMERCE_CONSUMER_SECRET: test_secret
  WOOCOMMERCE_WEBHOOK_SECRET: test_webhook_secret
  QSTASH_CURRENT_SIGNING_KEY: test_signing_key
  QSTASH_NEXT_SIGNING_KEY: test_next_signing_key
```

MSW handlers in `.test/mocks/woocommerce.handlers.ts` return fixture data from `.test/fixtures/`.

### Definition of Done — Per Flow

A flow is "done" when:
1. All route handlers, services, repositories, and utils are implemented
2. All test scenarios in `PROJECT_STATUS.md` are checked off
3. Playwright tests pass in CI (both EN and VI where applicable)
4. Environment variables are set in Vercel (preview + production)
5. QStash cron schedule is registered in Upstash dashboard
6. `src/lib/jobs/registry.ts` is updated
7. `.docs/PROJECT_STATUS.md` checklist items are all checked
