# Technical Specifications — Simple CRM

## Full Tech Stack

| Category | Technology | Version | Notes |
|---|---|---|---|
| **Framework** | Next.js | 16.0.0 | App Router, Server Components, Server Actions |
| **Language** | TypeScript | ^5 | strict mode, no `any` |
| **Runtime** | Node.js | ≥20 LTS | Vercel managed |
| **ORM** | Prisma | ^6.18.0 | With Neon serverless driver |
| **Database** | Neon DB (PostgreSQL serverless) | latest | Connection pooling via Prisma |
| **Cache** | Upstash Redis | — | Via ioredis ^5.8.2 |
| **Job Queue** | BullMQ | ^5.62.0 | AI jobs, sync jobs, email sends |
| **Auth** | Firebase Auth | ^12.4.0 / ^13.5.0 | Client SDK / Admin SDK |
| **Validation** | Zod | ^4.1.12 | BE+FE shared schemas |
| **Forms** | React Hook Form | ^7.65.0 | + @hookform/resolvers ^5 |
| **Server State** | TanStack React Query | ^5.90.5 | API cache, mutations |
| **Client State** | Zustand | latest (TBD) | UI state, user prefs |
| **UI Primitives** | Radix UI | various | Accessible headless components |
| **Styling** | Tailwind CSS | ^4 | + tailwind-merge, clsx, cva |
| **Icons** | Lucide React | ^0.548.0 | |
| **Dark Mode** | next-themes | latest (TBD) | |
| **i18n** | Custom (src/lib/locales) | — | next-intl migration TBD |
| **E2E Testing** | Playwright | latest | All tests in `.test/` |
| **Unit Testing** | Jest + ts-jest | ^30 | Tests in `src/**/__tests__/` |
| **Linting** | ESLint | ^9 | eslint-config-next 16 |
| **Commerce** | WooCommerce REST API | v3 | Via @woocommerce/woocommerce-rest-api |
| **Commerce** | Shopify Admin API | latest | Direct REST calls |
| **Email** | Mailjet | — | Campaigns, transactional |
| **AI** | Google Gemini | — | Image + video generation |
| **Storage** | Google Drive | — | AI output storage |
| **Shipping** | AfterShip / 17Track | — | Shipment tracking webhooks |
| **Deployment** | Vercel | — | Branch-based auto-deploy |
| **CI/CD** | GitHub Actions | — | Tests on PR, deploy on merge |

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER / CLIENT                         │
│                                                                   │
│  React 19 + Next.js App Router (Client Components)               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │ React Query │  │    Zustand   │  │   next-themes        │    │
│  │ (API cache) │  │  (UI state)  │  │ (dark/light mode)    │    │
│  └─────────────┘  └──────────────┘  └──────────────────────┘    │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────────────┐
│                    VERCEL EDGE / SERVER                          │
│                                                                   │
│  Next.js App Router (Server Components + Route Handlers)         │
│                                                                   │
│  ┌──────────────────┐   ┌──────────────────────────────────┐    │
│  │  Middleware       │   │   Route Handlers (REST API)       │    │
│  │  - Locale detect │   │   /api/stores                     │    │
│  │  - Auth check    │   │   /api/products                   │    │
│  │  - Redirect      │   │   /api/orders                     │    │
│  └──────────────────┘   │   /api/campaigns                  │    │
│                          │   /api/auth                       │    │
│  ┌──────────────────┐   └──────────────┬───────────────────┘    │
│  │ Server Actions   │                  │                          │
│  │ (form mutations) │                  │                          │
│  └─────────┬────────┘                  │                          │
│            │                           │                          │
│  ┌─────────▼───────────────────────────▼─────────────────────┐  │
│  │                   SERVICE LAYER                             │  │
│  │   product.service / store.service / campaign.service       │  │
│  │   duplicate-detection.service / shopify-import.service     │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                            │                                       │
│  ┌─────────────────────────▼──────────────────────────────────┐  │
│  │              REPOSITORY LAYER (Prisma)                      │  │
│  │   product.repo / store.repo / order.repo / customer.repo   │  │
│  └───────────────────┬─────────────────────────────────────────┘  │
└──────────────────────┼──────────────────────────────────────────┘
                       │
        ┌──────────────┼───────────────┐
        │              │               │
┌───────▼──────┐  ┌───▼──────┐  ┌────▼────────┐
│   NEON DB    │  │  UPSTASH │  │  FIREBASE   │
│  PostgreSQL  │  │  REDIS   │  │  Auth       │
│  (Prisma)    │  │          │  │             │
└──────────────┘  └──────────┘  └─────────────┘

        ┌─────────────────────────────┐
        │    EXTERNAL INTEGRATIONS    │
        │  WooCommerce REST API v3    │
        │  Shopify Admin API          │
        │  Mailjet (email)            │
        │  Gemini AI (content gen)    │
        │  AfterShip / 17Track        │
        │  Google Drive               │
        └─────────────────────────────┘
```

---

## Database Schema Overview

### Entities and Relationships

```
User ──< UserRole >── Role
Store ──< StoreProductMap >── Product ──< ProductVariant
Store ──< StoreCustomerMap >── Customer
Store ──< Order >── OrderItem ── Product / ProductVariant
Order ──── Shipment ──< TrackingEvent
Order ──< OrderEvent
Brand ──< Product
Brand ──< Campaign
Campaign ──── EmailTemplate
Campaign ──< EmailSend ──< EmailEvent
Store ──< IntegrationCredential
AIJob (standalone)
```

### Entity Summary Table

| Model | Key Fields | Notes |
|---|---|---|
| User | id, email, firebaseUid, isActive | Firebase UID is the auth link |
| Role | id, name (ADMIN/MANAGER/PARTNER) | RBAC roles |
| UserRole | userId, roleId | Many-to-many junction |
| Store | id, name, platform (WOO/SHOPIFY), domain, credentials | Encrypted credentials stored separately |
| Product | id, title, handle, isShared, categories, images, rawPayload | rawPayload = full source data |
| ProductVariant | id, productId, sku, price, compareAtPrice | SKU unique — used for deduplication |
| StoreProductMap | storeId, productId, externalId, customPrice, priceAdjustment | Per-store price overrides |
| Brand | id, name, slug | Groups products and campaigns |
| Customer | id, name, emails[], phones[], acceptsMk, tags | Multi-email/phone arrays |
| Order | id, storeId, externalId, status, total, currency, rawPayload | Full order data preserved |
| OrderItem | orderId, productId, variantId, quantity, price | |
| Shipment | orderId, carrier, trackingNumber, status | One per order |
| TrackingEvent | shipmentId, status, location, occurredAt | Timeline events |
| Campaign | name, brandId, segmentSql, templateId, status, scheduledAt | SQL-defined segments |
| EmailSend | campaignId, toEmail, status, providerId | Individual sends |
| EmailEvent | emailSendId, type (OPEN/CLICK/BOUNCE...) | Provider webhook events |
| AIJob | type (IMAGE/VIDEO), status, promptIn, outputUrl, driveFileId | Async generation queue |
| IntegrationCredential | storeId, provider, data (encrypted JSON) | API keys per provider |

---

## API Layer Design

### REST Conventions

See `CLAUDE.md` Section 5 for full URL patterns, HTTP methods, and response envelope.

### Authentication Flow

```
1. Client: POST /api/auth/login { idToken: string }
2. Server: firebase-admin.verifyIdToken(idToken) → decoded user
3. Server: lookup/create User in DB, load roles
4. Server: cache decoded token in Redis (TTL 15 min, key = idToken hash)
5. Server: set HttpOnly cookie with session reference
6. Subsequent requests: middleware reads cookie → validates against Redis cache
7. If cache miss: re-verify with Firebase Admin SDK
8. Role check: service layer enforces PARTNER store restrictions
```

### Caching Strategy (Upstash Redis)

| Cache Key Pattern | TTL | Content |
|---|---|---|
| `auth:token:{hash}` | 15 min | Decoded Firebase token + user roles |
| `products:list:{storeId}:{page}` | 5 min | Product list response |
| `store:detail:{storeId}` | 10 min | Store details |
| `price:comparison:{productId}` | 2 min | Multi-store price comparison result |
| `rate:sync:{storeId}` | 60 sec | Rate limit counter for sync endpoints |

Cache invalidation: on any mutation (create/update/delete), delete related cache keys.

---

## Infrastructure

### Neon DB Setup

- **Connection mode:** Pooled connection via Neon's serverless driver + Prisma
- **DATABASE_URL:** Pooled connection string (for application queries)
- **DIRECT_URL:** Direct connection string (for `prisma migrate` — bypasses pooler)
- **Prisma datasource:**
  ```prisma
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
  }
  ```
- Connection pool: Neon manages serverless connection pooling automatically. The Prisma client uses PgBouncer-compatible pooled URLs.

### Upstash Redis Config

- Connection via `ioredis` with Upstash REST-compatible URL
- Used for: auth token caching, API response caching, rate limiting, BullMQ job queues
- BullMQ queues: `ai-jobs`, `sync-jobs`, `email-sends`

### Vercel Deployment

| Branch | Vercel Environment | URL Pattern |
|---|---|---|
| `production` | Production | `app.simplecrm.vn` (TBD) |
| `main` | Preview | `simple-crm-git-main-*.vercel.app` |
| `feature/*` | Preview (on PR) | `simple-crm-git-feature-*.vercel.app` |

- GitHub Actions runs tests before Vercel deploys (enforced via branch protection)
- Build command: `next build`
- Install command: `npm ci`
- Output directory: `.next`

---

## i18n Architecture

### Routing Strategy

- **Method:** Path-based locale prefix
- **Supported locales:** `en` (English), `vi` (Vietnamese)
- **Default locale:** `en`
- **URL structure:** `/{locale}/{page}` → `/en/dashboard`, `/vi/dashboard`
- **Middleware:** Detects `Accept-Language` header and `NEXT_LOCALE` cookie. Redirects root `/` to `/en/`.

### File Layout

```
src/lib/locales/
├── en.json      # Source language — must be complete
├── vi.json      # Target language — must match en.json structure
└── server.ts    # getTranslations(lang, namespace) server helper
```

### Translation Workflow

1. Add new key to `en.json` with English value
2. Add same key to `vi.json` with Vietnamese translation
3. Both changes must be in the same commit
4. Use dot-notation key: `feature.subfeature.elementDescription`

### Key Naming Examples

```json
{
  "auth": {
    "login": {
      "title": "Sign In",
      "emailLabel": "Email Address",
      "passwordLabel": "Password",
      "submitButton": "Sign In",
      "errorInvalidCredentials": "Invalid email or password"
    }
  },
  "products": {
    "table": {
      "header": {
        "name": "Product Name",
        "sku": "SKU",
        "price": "Price"
      }
    },
    "sync": {
      "successMessage": "Products synced successfully",
      "errorMessage": "Sync failed. Please try again."
    }
  },
  "common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "edit": "Edit"
    }
  }
}
```

---

## Environment Variables

### Full Variable Reference

| Variable | Description | Required | Env |
|---|---|---|---|
| `DATABASE_URL` | Neon DB pooled connection string | Yes | All |
| `DIRECT_URL` | Neon DB direct connection (migrations only) | Yes | All |
| `REDIS_URL` | Upstash Redis connection URL (`rediss://...`) | Yes | All |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes | All |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK service account email | Yes | All |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK private key (with `\n` escapes) | Yes | All |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client API key | Yes | All |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes | All |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID (public) | Yes | All |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes | All |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender | Yes | All |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Yes | All |
| `ENCRYPTION_KEY` | 32-byte hex key for AES credential encryption | Yes | All |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app | Yes | All |
| `MAILJET_API_KEY` | Mailjet API key | Phase 3 | All |
| `MAILJET_SECRET_KEY` | Mailjet secret key | Phase 3 | All |
| `GEMINI_API_KEY` | Google Gemini API key for AI generation | Phase 3 | All |
| `GOOGLE_DRIVE_CLIENT_ID` | Google Drive OAuth client ID | Phase 3 | All |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Google Drive OAuth client secret | Phase 3 | All |
| `AFTERSHIP_API_KEY` | AfterShip tracking API key | Phase 2 | All |
| `NODE_ENV` | Runtime environment (`development`/`production`) | Auto | All |

---

## Third-Party Services & Integrations

| Service | Purpose | Auth Method | Phase |
|---|---|---|---|
| Neon DB | Primary database | Connection string | 0 |
| Upstash Redis | Cache + queue | Connection URL | 0 |
| Firebase Auth | User authentication | Service account JSON | 0 |
| WooCommerce | Store sync (read/write) | Consumer key + secret per store | 1 |
| Shopify | Product import | Store access token per store | 1 |
| Mailjet | Email campaigns + transactional | API key + secret | 3 |
| Google Gemini | AI content generation | API key | 3 |
| Google Drive | AI output storage | OAuth 2.0 | 3 |
| AfterShip | Shipment tracking webhooks | API key | 2 |
| 17Track | Shipment tracking (alternative) | API key | 2 |
| Vercel | Hosting + CDN + edge functions | Auto (GitHub integration) | 0 |
| GitHub Actions | CI/CD | Repository secrets | 0 |

---

## Performance Targets & Constraints

| Metric | Target | Notes |
|---|---|---|
| Time to First Byte (TTFB) | < 200ms | Server Components + Vercel Edge |
| Largest Contentful Paint (LCP) | < 2.5s | Core Web Vitals target |
| API response (simple queries) | < 300ms | Cached responses < 50ms |
| API response (complex aggregation) | < 2s | Price comparison dashboard |
| Product sync (per store, 100 products) | < 30s | Background BullMQ job |
| Shopify import (1000 products) | < 5 min | Streaming with progress updates |
| Redis cache hit rate | > 80% | For repeated list queries |
| Database connection pool | ≤ 10 concurrent | Neon serverless constraint |
| Bundle size (initial JS) | < 150KB gzipped | Per route chunk |

---

## Hybrid Integration Architecture

<!-- updated: hybrid-integration -->

### Overview

The WooCommerce ↔ CRM ↔ New Website integration uses a **hybrid Webhook Push + Scheduled REST API Polling** strategy. Each data flow uses the mechanism best suited to its latency and reliability requirements. Webhook push gives real-time delivery; scheduled polling provides the safety net that guarantees no data is permanently missed even if webhooks fail (network blip, Vercel cold start, WooCommerce retry window expiry).

Upstash QStash is the job delivery layer for all async work. It delivers HTTP POST requests to Vercel Route Handlers — no persistent workers required. QStash also manages cron schedules, retry policies, and signature-based authentication for all job endpoints.

### Flow Map

```
┌───────────────────────────────────────────────────────────────────┐
│                       WOOCOMMERCE STORE                            │
│                                                                    │
│  ┌─────────────┐         ┌──────────────────────────────────┐    │
│  │ order.create│ WEBHOOK │ POST /api/webhooks/woocommerce   │    │
│  │ order.update│────────▶│ HMAC verify → QStash publish     │    │
│  └─────────────┘         └────────────────┬─────────────────┘    │
│                                           │                        │
│  WooCommerce REST API ◀──── polling ──────┼─── Flows 2, 3, 5     │
└───────────────────────────────────────────┼────────────────────────┘
                                            │
                           ┌────────────────▼────────────────┐
                           │         UPSTASH QSTASH           │
                           │                                  │
                           │  ┌──────────┐  ┌─────────────┐  │
                           │  │ Fan-out  │  │ Cron jobs   │  │
                           │  │ (Flow 1) │  │ (Flows 2–5) │  │
                           │  └────┬─────┘  └──────┬──────┘  │
                           └───────┼────────────────┼─────────┘
                                   │                │
                   ┌───────────────┴────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────────┐
│                   SIMPLE CRM (Vercel / Next.js)                   │
│                                                                   │
│  Job Processor Routes (signature verified, no auth required)      │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐   │
│  │ /api/jobs/          │  │ /api/jobs/                       │   │
│  │ process-order       │  │ reconcile-orders (every 5 min)   │   │
│  │ (Flow 1 processor)  │  │ sync-products   (every 30 min)   │   │
│  └──────────┬──────────┘  │ push-products   (every 1 hour)   │   │
│             │              │ detect-errors   (every 30 min)   │   │
│             │              └──────────────────┬───────────────┘   │
│             │                                 │                    │
│  ┌──────────▼─────────────────────────────────▼───────────────┐  │
│  │                     SERVICE LAYER                            │  │
│  │ order-sync.service  reconciliation.service                   │  │
│  │ product-sync.service  product-push.service                   │  │
│  │ error-detection.service                                      │  │
│  └───────────────────────────────┬──────────────────────────────┘  │
│                                  │                                   │
│  ┌───────────────────────────────▼──────────────────────────────┐  │
│  │               REPOSITORY LAYER (Prisma + Neon DB)             │  │
│  │  WooOrder, WooProduct, SyncLog, SyncCursor, PushLog,          │  │
│  │  ErrorReport + all existing models                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                           │
                           │ Push (Flow 4)
                           ▼
              ┌────────────────────────┐
              │    NEW WEBSITE API     │
              │  (contract TBD — stub) │
              └────────────────────────┘
```

### Flow Specifications

#### Flow 1 — Order Webhook (Real-time, Phase 1)

| Attribute | Value |
|---|---|
| Trigger | WooCommerce `order.created` or `order.updated` webhook event |
| Entry point | `src/app/api/webhooks/woocommerce/route.ts` |
| Auth | HMAC-SHA256 via `x-wc-webhook-signature` header |
| Job delivery | Publishes to QStash → delivered to `/api/jobs/process-order` |
| Service called | `orderSyncService.upsertFromWooCommerce(payload)` |
| DB models read | `SyncLog` (idempotency check) |
| DB models written | `WooOrder`, `WooOrderLineItem`, `SyncLog` |
| Error handling | Upsert catches unique constraint (duplicate wooOrderId) as no-op. Service failures → `SyncLog.status = FAILED`. QStash retries 3× on non-200 response. |
| SLA | Order in CRM DB within 5 seconds of WooCommerce event |

#### Flow 2 — Order Reconciliation (Cron, Phase 1)

| Attribute | Value |
|---|---|
| Trigger | QStash cron `*/5 * * * *` UTC |
| Entry point | `src/app/api/jobs/reconcile-orders/route.ts` |
| Auth | QStash signature (`verifySignatureAppRouter`) |
| Service called | `reconciliationService.findAndRequeueMissingOrders()` |
| External API | `woocommerceClient.getOrders({ after: lastOrderSyncAt })` |
| DB models read | `SyncCursor`, `SyncLog` |
| DB models written | `SyncCursor` (cursor update), re-publishes to QStash for Flow 1 processor |
| Error handling | WooCommerce 401 → ErrorReport CRITICAL + job exits. 429 → retry with backoff. Cursor updated only on full successful run. |
| SLA | Any missed order re-queued within 5 minutes of the missed webhook |

#### Flow 3 — Product Sync Inbound (Cron, Phase 2)

| Attribute | Value |
|---|---|
| Trigger | QStash cron `*/30 * * * *` UTC |
| Entry point | `src/app/api/jobs/sync-products/route.ts` |
| Auth | QStash signature |
| Service called | `productSyncService.syncFromWooCommerce()` |
| External API | `woocommerceClient.getProducts({ after: lastProductSyncAt })` (paginated) |
| DB models read | `SyncCursor` |
| DB models written | `WooProduct`, `WooProductImage`, `WooCategory`, `WooTag`, `SyncCursor` |
| Error handling | Zod validation per product — invalid product logged as FAILED, job continues. Cursor updated only on complete run. |
| SLA | Product data reflects WooCommerce state within 30 minutes of any change |

#### Flow 4 — Product Push Outbound (Cron + Manual, Phase 3)

| Attribute | Value |
|---|---|
| Trigger | QStash cron `0 * * * *` UTC OR manual POST `/api/admin/push-products` (ADMIN/MANAGER only) |
| Entry point | `src/app/api/jobs/push-products/route.ts` (cron) or `src/app/api/admin/push-products/route.ts` (manual) |
| Auth | QStash signature (cron) / Firebase auth + role check (manual) |
| Service called | `productPushService.pushPublishableProducts()` |
| External API | `newWebsiteApiClient.pushProduct(product)` |
| DB models read | `WooProduct` (filter publishable), `PushLog` (deduplication) |
| DB models written | `PushLog` per product (SUCCESS / FAILED / SKIPPED) |
| Error handling | 429/5xx → retry 3× exponential backoff (1s, 2s, 4s) → FAILED. Non-publishable products → SKIPPED (not an error). Existing PENDING PushLog → skip entirely. |
| SLA | Products pushed within 1 hour of change, or immediately on manual trigger |
| BLOCKER | New website API contract unknown — implementation is a stub pending contract confirmation |

#### Flow 5 — Error Detection (Cron, Phase 3)

| Attribute | Value |
|---|---|
| Trigger | QStash cron `*/30 * * * *` UTC |
| Entry point | `src/app/api/jobs/detect-errors/route.ts` |
| Auth | QStash signature |
| Service called | `errorDetectionService.runAllChecks()` |
| External API | `woocommerceClient.getOrderCount({ after: 24h ago })` (for count comparison) |
| DB models read | `SyncLog`, `WooOrder`, `WooProduct`, `PushLog`, existing `ErrorReport` |
| DB models written | `ErrorReport` (deduplicated) |
| Error handling | Each check runs independently — one check failure does not abort others. Deduplication: check for unresolved `ErrorReport` with same `flow + message hash` before inserting. |
| SLA | Errors detected within 30 minutes of occurrence |

### Prisma Schema Additions

Migration naming: `20260608_add_woo_product_sync`, `20260608_add_push_log`, `20260608_add_error_report`, `20260608_add_sync_cursor`

```prisma
// ============================================================================
// INTEGRATION FLOW ENUMS
// ============================================================================

enum SyncStatus {
  PENDING
  PROCESSING
  SUCCESS
  FAILED
  SKIPPED
}

enum PushStatus {
  PENDING
  SUCCESS
  FAILED
  SKIPPED
}

enum IntegrationFlow {
  ORDER_WEBHOOK
  ORDER_RECONCILIATION
  PRODUCT_SYNC_INBOUND
  PRODUCT_PUSH_OUTBOUND
  ERROR_DETECTION
}

enum ErrorSeverity {
  CRITICAL  // Action within 2 hours
  WARNING   // Action within 24 hours
  INFO      // Logged only, no action required
}

// ============================================================================
// FLOW 1 + 2: ORDER SYNC
// ============================================================================

model WooOrder {
  id          String   @id @default(cuid())
  wooId       Int      @unique         // WooCommerce order ID — idempotency key
  storeId     String
  status      String
  total       Decimal  @db.Decimal(10, 2)
  currency    String
  rawPayload  Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  store     Store              @relation(fields: [storeId], references: [id], onDelete: Cascade)
  lineItems WooOrderLineItem[]
  syncLog   SyncLog?

  @@index([storeId])
  @@index([status])
  @@map("woo_orders")
}

model WooOrderLineItem {
  id          String  @id @default(cuid())
  wooOrderId  String
  wooItemId   Int
  productId   Int?
  variationId Int?
  name        String
  sku         String?
  quantity    Int
  total       Decimal @db.Decimal(10, 2)

  wooOrder WooOrder @relation(fields: [wooOrderId], references: [id], onDelete: Cascade)

  @@index([wooOrderId])
  @@map("woo_order_line_items")
}

model SyncLog {
  id           String     @id @default(cuid())
  wooOrderId   String     @unique       // idempotency key — unique constraint
  storeId      String
  status       SyncStatus
  errorMessage String?
  rawPayload   Json?
  processedAt  DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@index([status])
  @@index([storeId])
  @@index([processedAt])
  @@map("sync_logs")
}

// ============================================================================
// FLOW 3 + 4: PRODUCT SYNC
// ============================================================================

model WooProduct {
  id               String   @id @default(cuid())
  wooId            Int      @unique         // WooCommerce product ID — idempotency key
  storeId          String
  title            String
  slug             String
  sku              String?
  status           String                   // publish | draft | private | trash
  description      String?
  shortDescription String?
  price            Decimal? @db.Decimal(10, 2)
  regularPrice     Decimal? @db.Decimal(10, 2)
  salePrice        Decimal? @db.Decimal(10, 2)
  stockQuantity    Int?
  stockStatus      String                   // instock | outofstock | onbackorder
  manageStock      Boolean  @default(false)
  featuredImage    String?
  rawPayload       Json
  sourceUpdatedAt  DateTime                 // WooCommerce date_modified — used as cursor
  lastSyncedAt     DateTime @default(now())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  store      Store               @relation(fields: [storeId], references: [id], onDelete: Cascade)
  images     WooProductImage[]
  categories WooProductCategory[]
  tags       WooProductTag[]
  pushLogs   PushLog[]

  @@index([storeId])
  @@index([status])
  @@index([stockStatus])
  @@index([sourceUpdatedAt])
  @@map("woo_products")
}

model WooProductImage {
  id           String @id @default(cuid())
  wooProductId String
  src          String
  alt          String?
  position     Int    @default(0)

  wooProduct WooProduct @relation(fields: [wooProductId], references: [id], onDelete: Cascade)

  @@index([wooProductId])
  @@map("woo_product_images")
}

model WooCategory {
  id      String @id @default(cuid())
  wooId   Int    @unique
  storeId String
  name    String
  slug    String

  store    Store                @relation(fields: [storeId], references: [id], onDelete: Cascade)
  products WooProductCategory[]

  @@index([storeId])
  @@map("woo_categories")
}

model WooTag {
  id      String @id @default(cuid())
  wooId   Int    @unique
  storeId String
  name    String
  slug    String

  store    Store           @relation(fields: [storeId], references: [id], onDelete: Cascade)
  products WooProductTag[]

  @@index([storeId])
  @@map("woo_tags")
}

model WooProductCategory {
  wooProductId  String
  wooCategoryId String

  wooProduct  WooProduct  @relation(fields: [wooProductId], references: [id], onDelete: Cascade)
  wooCategory WooCategory @relation(fields: [wooCategoryId], references: [id], onDelete: Cascade)

  @@id([wooProductId, wooCategoryId])
  @@map("woo_product_categories")
}

model WooProductTag {
  wooProductId String
  wooTagId     String

  wooProduct WooProduct @relation(fields: [wooProductId], references: [id], onDelete: Cascade)
  wooTag     WooTag     @relation(fields: [wooTagId], references: [id], onDelete: Cascade)

  @@id([wooProductId, wooTagId])
  @@map("woo_product_tags")
}

model PushLog {
  id             String     @id @default(cuid())
  wooProductId   String
  destinationUrl String
  status         PushStatus
  errorMessage   String?
  pushedAt       DateTime?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  wooProduct WooProduct @relation(fields: [wooProductId], references: [id], onDelete: Cascade)

  @@index([wooProductId])
  @@index([status])
  @@index([pushedAt])
  @@map("push_logs")
}

// ============================================================================
// FLOW 5: ERROR DETECTION
// ============================================================================

model ErrorReport {
  id         String          @id @default(cuid())
  flow       IntegrationFlow
  severity   ErrorSeverity
  message    String
  messageHash String                              // sha256(flow+message) for deduplication
  details    Json?
  resolvedAt DateTime?
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  @@unique([flow, messageHash, resolvedAt])       // deduplication — null resolvedAt = unresolved
  @@index([flow, severity])
  @@index([resolvedAt])
  @@index([createdAt])
  @@map("error_reports")
}

// ============================================================================
// SHARED: CURSOR MANAGEMENT
// ============================================================================

model SyncCursor {
  id        String   @id @default(cuid())
  name      String   @unique              // "lastOrderSyncAt" | "lastProductSyncAt"
  value     DateTime
  updatedAt DateTime @updatedAt

  @@map("sync_cursors")
}
```

### QStash Job Registry

| Job | Cron (UTC) | Destination Env Var | Retries | Timeout |
|---|---|---|---|---|
| `reconcile-orders` | `*/5 * * * *` | `JOB_RECONCILE_ORDERS_URL` | 3 | 30s |
| `sync-products` | `*/30 * * * *` | `JOB_SYNC_PRODUCTS_URL` | 3 | 120s |
| `push-products` | `0 * * * *` | `JOB_PUSH_PRODUCTS_URL` | 3 | 120s |
| `detect-errors` | `*/30 * * * *` | `JOB_DETECT_ERRORS_URL` | 2 | 60s |

Registered in `src/lib/jobs/registry.ts` — the single source of truth.

### WooCommerce API Client

- **Base URL:** `${WOOCOMMERCE_BASE_URL}/wp-json/wc/v3`
- **Auth:** `Authorization: Basic base64(consumer_key:consumer_secret)` header (never query params)
- **Rate limiting:** 100ms delay between pagination requests. Max `per_page=100`.
- **getOrders params:** `after` (ISO datetime cursor), `page`, `per_page`, `status`
- **getProducts params:** `after` (ISO datetime cursor), `page`, `per_page`
- **Error handling:** 4xx → typed `WooApiError` with status. 5xx/429 → retryable error (QStash handles retry).

### New Website API Client

**Status: STUB — pending API contract confirmation.** (Decision 03)

The `lib/utils/new-website-api.ts` file exports:
- `INewWebsiteApiClient` interface with `pushProduct(product: PublishableProduct): Promise<PushResult>`
- `PlaceholderNewWebsiteApiClient` concrete class that throws `NotImplementedError`

The concrete client is implemented when PM obtains answers to:
1. Auth method (API key / OAuth / JWT)
2. Product payload schema and field naming
3. Rate limits
4. Idempotency behavior on duplicate `externalId`
5. Response format (resource returned vs status code only)

### New Environment Variables

| Variable | Description | Required | Used By Flows |
|---|---|---|---|
| `WOOCOMMERCE_BASE_URL` | WooCommerce store URL (e.g. `https://mystore.com`) | Phase 1 | 1, 2, 3, 5 |
| `WOOCOMMERCE_CONSUMER_KEY` | WooCommerce REST API consumer key | Phase 1 | 2, 3, 5 |
| `WOOCOMMERCE_CONSUMER_SECRET` | WooCommerce REST API consumer secret | Phase 1 | 2, 3, 5 |
| `WOOCOMMERCE_WEBHOOK_SECRET` | HMAC secret on WooCommerce webhook | Phase 1 | 1 |
| `QSTASH_URL` | Upstash QStash publish URL | Phase 1 | All |
| `QSTASH_TOKEN` | Upstash QStash auth bearer token | Phase 1 | All |
| `QSTASH_CURRENT_SIGNING_KEY` | QStash current sig key for verification | Phase 1 | All |
| `QSTASH_NEXT_SIGNING_KEY` | QStash next sig key (key rotation support) | Phase 1 | All |
| `NEW_WEBSITE_API_URL` | New website API base URL | Phase 3 | 4 |
| `NEW_WEBSITE_API_KEY` | New website API auth key | Phase 3 | 4 |
| `JOB_RECONCILE_ORDERS_URL` | Full public URL of reconcile-orders endpoint | Phase 1 | 2 |
| `JOB_SYNC_PRODUCTS_URL` | Full public URL of sync-products endpoint | Phase 2 | 3 |
| `JOB_PUSH_PRODUCTS_URL` | Full public URL of push-products endpoint | Phase 3 | 4 |
| `JOB_DETECT_ERRORS_URL` | Full public URL of detect-errors endpoint | Phase 3 | 5 |
