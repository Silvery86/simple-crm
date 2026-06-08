# Database Design — Simple CRM

<!-- updated: multi-tenant-uc1-7 -->

> Single reference for anyone working with the database.
> A developer reading only this file should be able to build the entire Prisma schema,
> understand all data ownership rules, implement any query correctly, and know
> what they must NEVER do.

---

## 1. Tenancy Model

Simple CRM is a **multi-tenant SaaS platform**. Every record in the database belongs to exactly one user through the following ownership chain:

```
User
 └── Store (many per user)
      ├── StoreCredential (one per store — encrypted)
      ├── Order (many per store)
      │    ├── OrderItem (many per order)
      │    └── Customer (many per store, one per order)
      ├── Product (many per store)
      │    ├── ProductImage (many per product)
      │    ├── ProductCategory (many per store)
      │    └── ProductTag (many per store)
      ├── SyncLog (many per store)
      ├── SyncCursor (many per store — one per cursor type)
      ├── ErrorReport (many per store)
      └── PushLog (as target store)

User (also owns):
 ├── ImportJob (many per user)
 │    └── ImportedProduct (many per job)
 │         └── ProductImage (many per imported product)
 └── AssetFile (many per user — from imports)
```

**No record is global.** There are no "shared" orders, products, or customers across tenants. A product named "Blue T-Shirt" on Store A and a product named "Blue T-Shirt" on Store B are two separate, independent records. They do not know about each other.

**Cross-store push does not copy records.** When a user pushes Product P from Store A to Store B, the Product record stays in Store A. A `PushLog` record is created referencing `sourceProductId=P` and `targetStoreId=B`. Store B gets a new product created via its WooCommerce API — the CRM does not create a new `Product` DB record for Store B.

---

## 2. Complete Entity-Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                   USER                                            │
│  id · firebaseUid (unique) · email (unique) · name · role (ADMIN|USER|VIEWER)   │
└────────────────────────────────────┬─────────────────────────────────────────────┘
                                     │ 1:N
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                           │
          ▼ 1:N                      ▼ 1:N                      ▼ 1:N
   ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
   │    Store     │           │  ImportJob   │           │  AssetFile   │
   │ userId FK    │           │  userId FK   │           │  userId FK   │
   │ domain       │           │  sourceType  │           │  blobUrl     │
   │ platform     │           │  status      │           │  originalUrl │
   │ status       │           └──────┬───────┘           └──────┬───────┘
   └──────┬───────┘                  │ 1:N                      │ referenced by
          │                          ▼                           │
          │                  ┌──────────────────┐               │
          │                  │ ImportedProduct   │               │
          │                  │ importJobId FK    │               │
          │                  │ name, sku, price  │               │
          │                  │ status            │               │
          │                  └──────────┬────────┘               │
          │                             │ 1:N (images)           │
          │                             ▼                        │
          │ ┌─────────────────────────────────────────────────── │ ─┐
          │ │              ProductImage                           │   │
          │ │ productId? FK | importedProductId? FK              │   │
          │ │ assetFileId? FK ──────────────────────────────────►│   │
          │ │ sourceUrl | storageType (URL|UPLOADED)             │   │
          │ └────────────────────────────────────────────────────┘   │
          │
          ├── 1:1 StoreCredential
          │       storeId FK (unique)
          │       encryptedConsumerKey · consumerKeyIv
          │       encryptedConsumerSecret · consumerSecretIv
          │       encryptedWebhookSecret? · webhookSecretIv?
          │
          ├── 1:N Order
          │       storeId FK
          │       customerId? FK ──► Customer (storeId FK)
          │       wooOrderId (unique per store)
          │       └── 1:N OrderItem
          │               orderId FK
          │               productId? FK ──► Product
          │
          ├── 1:N Product
          │       storeId FK
          │       wooProductId (unique per store)
          │       ├── 1:N ProductImage (storageType=URL)
          │       ├── N:M ProductCategory (via ProductToCategory junction)
          │       ├── N:M ProductTag (via ProductToTag junction)
          │       └── 1:N PushLog (as sourceProduct)
          │
          ├── 1:N ProductCategory
          │       storeId FK
          │       wooCategoryId (unique per store)
          │
          ├── 1:N ProductTag
          │       storeId FK
          │       wooTagId (unique per store)
          │
          ├── 1:N Customer
          │       storeId FK
          │       wooCustomerId? (unique per store when not null)
          │       email (unique per store — app-layer enforced for guests)
          │
          ├── 1:N SyncLog
          │       storeId FK
          │       wooOrderId? (unique per store when not null)
          │
          ├── 1:N SyncCursor
          │       storeId FK
          │       name (unique per store — e.g. "lastOrderSyncAt")
          │
          ├── 1:N ErrorReport
          │       storeId FK
          │
          └── N:N PushLog (as targetStore)
                  targetStoreId FK
                  sourceProductId? FK ──► Product (XOR)
                  importedProductId? FK ──► ImportedProduct (XOR)
```

---

## 3. Complete Prisma Schema

This is the canonical schema. The `prisma/schema.prisma` file must match this exactly.

```prisma
// ============================================================================
// DATASOURCE + GENERATOR
// ============================================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================================================
// ENUMS
// ============================================================================

enum UserRole {
  ADMIN   // Platform superuser — can view all users and data
  USER    // Store owner — can only see their own stores and data
  VIEWER  // Read-only delegate — deferred to Phase 2
}

enum StorePlatform {
  WOOCOMMERCE
  WORDPRESS
}

enum StoreStatus {
  ONLINE      // HTTP 200 + WooCommerce API 200
  DEGRADED    // Reachable but API errors or slow (>3s response)
  OFFLINE     // DNS failure, SSL error, or timeout
  AUTH_ERROR  // Reachable but WooCommerce API returns 401
  UNKNOWN     // Never checked, or check errored
}

enum ProductStatus {
  PUBLISH
  DRAFT
  PRIVATE
  TRASH
}

enum ImageStorageType {
  URL       // UC3: source URL stored only, file never downloaded
  UPLOADED  // UC5: file downloaded to Vercel Blob, then pushed to target store
}

enum SyncStatus {
  PENDING
  SUCCESS
  FAILED
  SKIPPED
}

enum PushStatus {
  PENDING
  SUCCESS
  FAILED
  SKIPPED
  CONFLICT
}

enum ConflictResolution {
  RENAMED
  CANCELLED
}

enum ImportSourceType {
  WOOCOMMERCE_CSV
  SHOPIFY_JSON
}

enum ImportJobStatus {
  PENDING
  PROCESSING
  DONE
  FAILED
}

enum ImportedProductStatus {
  PENDING
  PUSHED
  FAILED
  SKIPPED
}

enum ErrorSeverity {
  CRITICAL  // Action required within 2 hours
  WARNING   // Action required within 24 hours
  INFO      // Logged only
}

// ============================================================================
// USER + AUTH
// ============================================================================

model User {
  id          String   @id @default(cuid())
  firebaseUid String   @unique
  email       String   @unique
  name        String?
  role        UserRole @default(USER)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  stores     Store[]
  importJobs ImportJob[]
  assetFiles AssetFile[]

  @@index([firebaseUid])
  @@map("users")
}

// ============================================================================
// STORE + CREDENTIALS
// ============================================================================

model Store {
  id            String        @id @default(cuid())
  userId        String
  domain        String
  displayName   String?
  platform      StorePlatform
  status        StoreStatus   @default(UNKNOWN)
  lastCheckedAt DateTime?
  lastSyncedAt  DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  credential       StoreCredential?
  orders           Order[]
  products         Product[]
  productCategories ProductCategory[]
  productTags      ProductTag[]
  customers        Customer[]
  syncLogs         SyncLog[]
  syncCursors      SyncCursor[]
  errorReports     ErrorReport[]
  pushLogsAsTarget PushLog[]         @relation("TargetStore")
  assetFiles       AssetFile[]       @relation("StoreAssets")

  @@unique([userId, domain])
  @@index([userId])
  @@map("stores")
}

model StoreCredential {
  id                     String   @id @default(cuid())
  storeId                String   @unique
  encryptedConsumerKey   String
  consumerKeyIv          String
  encryptedConsumerSecret String
  consumerSecretIv       String
  encryptedWebhookSecret  String?  // null if webhook not configured for this store
  webhookSecretIv        String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@map("store_credentials")
}

// ============================================================================
// ORDERS + CUSTOMERS
// ============================================================================

model Order {
  id               String    @id @default(cuid())
  storeId          String
  customerId       String?
  wooOrderId       Int
  orderNumber      String
  status           String
  trackingNumber   String?
  currency         String    @default("VND")
  total            Decimal   @db.Decimal(10, 2)
  totalTax         Decimal   @default(0) @db.Decimal(10, 2)
  shippingTotal    Decimal   @default(0) @db.Decimal(10, 2)
  billingEmail     String?
  billingFirstName String?
  billingLastName  String?
  billingPhone     String?
  rawPayload       Json
  wooCreatedAt     DateTime
  wooPaidAt        DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  store    Store      @relation(fields: [storeId], references: [id], onDelete: Cascade)
  customer Customer?  @relation(fields: [customerId], references: [id], onDelete: SetNull)
  items    OrderItem[]

  @@unique([storeId, wooOrderId])
  @@index([storeId, status])
  @@index([storeId, wooCreatedAt])
  @@index([storeId, billingEmail])
  @@map("orders")
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  wooItemId Int
  productId String?
  name      String
  sku       String?
  quantity  Int
  price     Decimal @db.Decimal(10, 2)
  subtotal  Decimal @db.Decimal(10, 2)
  total     Decimal @db.Decimal(10, 2)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  order   Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product? @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@unique([orderId, wooItemId])
  @@index([orderId])
  @@map("order_items")
}

model Customer {
  id            String   @id @default(cuid())
  storeId       String
  wooCustomerId Int?     // null for guest orders
  email         String
  firstName     String?
  lastName      String?
  phone         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  store  Store   @relation(fields: [storeId], references: [id], onDelete: Cascade)
  orders Order[]

  // DB enforces unique registered customers per store; guest dedup is app-layer by (storeId, email)
  @@unique([storeId, wooCustomerId])
  @@index([storeId])
  @@index([storeId, email])
  @@map("customers")
}

// ============================================================================
// PRODUCTS
// ============================================================================

model Product {
  id               String        @id @default(cuid())
  storeId          String
  wooProductId     Int
  name             String
  slug             String
  sku              String?
  status           ProductStatus
  description      String?       @db.Text
  shortDescription String?       @db.Text
  price            Decimal?      @db.Decimal(10, 2)
  regularPrice     Decimal?      @db.Decimal(10, 2)
  salePrice        Decimal?      @db.Decimal(10, 2)
  stockQuantity    Int?
  stockStatus      String
  manageStock      Boolean       @default(false)
  rawPayload       Json
  sourceUpdatedAt  DateTime
  lastSyncedAt     DateTime      @default(now())
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  store      Store               @relation(fields: [storeId], references: [id], onDelete: Cascade)
  images     ProductImage[]
  categories ProductToCategory[]
  tags       ProductToTag[]
  pushLogs   PushLog[]           @relation("SourceProduct")
  orderItems OrderItem[]

  @@unique([storeId, wooProductId])
  @@index([storeId, status])
  @@index([storeId, name])
  @@index([storeId, sourceUpdatedAt])
  @@map("products")
}

model ProductCategory {
  id            String @id @default(cuid())
  storeId       String
  wooCategoryId Int
  name          String
  slug          String

  store    Store               @relation(fields: [storeId], references: [id], onDelete: Cascade)
  products ProductToCategory[]

  @@unique([storeId, wooCategoryId])
  @@index([storeId])
  @@map("product_categories")
}

model ProductToCategory {
  productId  String
  categoryId String

  product  Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  category ProductCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([productId, categoryId])
  @@map("products_to_categories")
}

model ProductTag {
  id       String @id @default(cuid())
  storeId  String
  wooTagId Int
  name     String
  slug     String

  store    Store          @relation(fields: [storeId], references: [id], onDelete: Cascade)
  products ProductToTag[]

  @@unique([storeId, wooTagId])
  @@index([storeId])
  @@map("product_tags")
}

model ProductToTag {
  productId String
  tagId     String

  product Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag     ProductTag @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
  @@map("products_to_tags")
}

// ============================================================================
// PRODUCT IMAGES + ASSET FILES
// ============================================================================

model ProductImage {
  id                String           @id @default(cuid())
  productId         String?          // set for UC3 (synced from store)
  importedProductId String?          // set for UC5 (from import job)
  assetFileId       String?          // set only when storageType = UPLOADED
  sourceUrl         String           // always set — original image URL
  storageType       ImageStorageType
  sortOrder         Int              @default(0)
  createdAt         DateTime         @default(now())

  product          Product?          @relation(fields: [productId], references: [id], onDelete: Cascade)
  importedProduct  ImportedProduct?  @relation(fields: [importedProductId], references: [id], onDelete: Cascade)
  assetFile        AssetFile?        @relation(fields: [assetFileId], references: [id], onDelete: SetNull)

  // XOR constraint: exactly one of productId or importedProductId must be set.
  // Enforced at application layer in productImageService.
  @@index([productId])
  @@index([importedProductId])
  @@map("product_images")
}

model AssetFile {
  id          String   @id @default(cuid())
  userId      String
  originalUrl String
  filename    String
  mimeType    String
  sizeBytes   Int
  blobUrl     String   // Vercel Blob persistent URL (never expires)
  uploadedUrl String?  // URL on target WooCommerce store after push (set post-push)
  createdAt   DateTime @default(now())

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  productImages ProductImage[]

  // Optional: link to the store where this asset was eventually uploaded
  uploadedToStoreId String?
  uploadedToStore   Store? @relation("StoreAssets", fields: [uploadedToStoreId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@map("asset_files")
}

// ============================================================================
// IMPORT JOBS
// ============================================================================

model ImportJob {
  id               String          @id @default(cuid())
  userId           String
  sourceType       ImportSourceType
  originalFilename String
  status           ImportJobStatus @default(PENDING)
  totalRows        Int             @default(0)
  processedRows    Int             @default(0)
  errorMessage     String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  importedProducts ImportedProduct[]

  @@index([userId])
  @@index([status])
  @@map("import_jobs")
}

model ImportedProduct {
  id               String                @id @default(cuid())
  importJobId      String
  name             String
  sku              String?
  price            Decimal?              @db.Decimal(10, 2)
  regularPrice     Decimal?              @db.Decimal(10, 2)
  salePrice        Decimal?              @db.Decimal(10, 2)
  stockQuantity    Int?
  description      String?               @db.Text
  shortDescription String?               @db.Text
  status           ImportedProductStatus @default(PENDING)
  rawData          Json
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  importJob ImportJob      @relation(fields: [importJobId], references: [id], onDelete: Cascade)
  images    ProductImage[]
  pushLogs  PushLog[]

  @@index([importJobId])
  @@index([status])
  @@map("imported_products")
}

// ============================================================================
// PUSH LOGS
// ============================================================================

model PushLog {
  id                 String              @id @default(cuid())
  sourceProductId    String?             // from Product (UC3 cross-store push) — XOR with importedProductId
  importedProductId  String?             // from ImportedProduct (UC5 import push) — XOR with sourceProductId
  targetStoreId      String
  status             PushStatus
  conflictResolution ConflictResolution?
  renamedTo          String?             // name used when user chose Rename
  errorMessage       String?
  pushedAt           DateTime?
  createdAt          DateTime            @default(now())

  sourceProduct   Product?         @relation("SourceProduct", fields: [sourceProductId], references: [id], onDelete: SetNull)
  importedProduct ImportedProduct? @relation(fields: [importedProductId], references: [id], onDelete: SetNull)
  targetStore     Store            @relation("TargetStore", fields: [targetStoreId], references: [id], onDelete: Cascade)

  @@index([sourceProductId])
  @@index([importedProductId])
  @@index([targetStoreId])
  @@index([status])
  @@map("push_logs")
}

// ============================================================================
// SYNC INFRASTRUCTURE
// ============================================================================

model SyncLog {
  id              String     @id @default(cuid())
  storeId         String
  wooOrderId      Int?       // null for non-order sync jobs
  jobType         String     // "order_webhook" | "order_reconciliation" | "initial_sync_orders" | etc.
  qstashMessageId String?
  status          SyncStatus
  errorMessage    String?
  processedAt     DateTime?
  createdAt       DateTime   @default(now())

  store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)

  // Composite unique prevents duplicate processing of same order from same store
  @@unique([storeId, wooOrderId])
  @@index([storeId, status])
  @@index([storeId, wooOrderId])
  @@map("sync_logs")
}

model SyncCursor {
  id        String   @id @default(cuid())
  storeId   String
  name      String   // "lastOrderSyncAt" | "lastProductSyncAt" | "lastCustomerSyncAt"
  value     DateTime
  updatedAt DateTime @updatedAt

  store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@unique([storeId, name])
  @@index([storeId])
  @@map("sync_cursors")
}

model ErrorReport {
  id          String        @id @default(cuid())
  storeId     String
  flow        String        // "order_webhook" | "order_reconciliation" | etc.
  severity    ErrorSeverity
  message     String
  messageHash String        // sha256(storeId + flow + errorCode) for deduplication
  details     Json?
  resolvedAt  DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@index([storeId, severity])
  @@index([storeId, resolvedAt])
  @@map("error_reports")
}
```

---

## 4. Unique Constraints and Idempotency Keys

| Model | Unique Constraint | Purpose |
|---|---|---|
| `User` | `firebaseUid` | Firebase UID is globally unique — auth link |
| `User` | `email` | Prevents duplicate accounts |
| `Store` | `(userId, domain)` | One store per domain per user; different users may own same domain |
| `StoreCredential` | `storeId` | One credential set per store |
| `Order` | `(storeId, wooOrderId)` | Idempotency key — prevents duplicate order records from retried webhooks |
| `OrderItem` | `(orderId, wooItemId)` | Idempotency for order line items |
| `Customer` | `(storeId, wooCustomerId)` | Registered customer dedup per store (nulls are distinct — guests allowed) |
| `Product` | `(storeId, wooProductId)` | Idempotency key — prevents duplicate product records from retried syncs |
| `ProductCategory` | `(storeId, wooCategoryId)` | One category record per WooCommerce category per store |
| `ProductTag` | `(storeId, wooTagId)` | One tag record per WooCommerce tag per store |
| `SyncLog` | `(storeId, wooOrderId)` | Prevents SyncLog spam on webhook retries (nulls distinct — non-order logs allowed) |
| `SyncCursor` | `(storeId, name)` | One cursor value per cursor type per store |

**Critical note on null uniqueness in PostgreSQL:** `@@unique([storeId, wooOrderId])` with a nullable `wooOrderId` allows multiple rows with the same `storeId` and `wooOrderId = NULL` because PostgreSQL treats NULLs as distinct in UNIQUE constraints. This is intentional: SyncLog entries for non-order jobs can coexist without conflict.

---

## 5. Indexes

| Model | Index | Queries It Supports |
|---|---|---|
| `User` | `firebaseUid` | Auth middleware: lookup user by Firebase UID on every request |
| `Store` | `userId` | Dashboard: load all stores for current user |
| `Order` | `(storeId, status)` | Order table filter by status |
| `Order` | `(storeId, wooCreatedAt)` | Order table sort by date; reconciliation cursor query |
| `Order` | `(storeId, billingEmail)` | Order table search by customer email |
| `Customer` | `storeId` | Customer list per store |
| `Customer` | `(storeId, email)` | Guest customer dedup lookup before insert |
| `Product` | `(storeId, status)` | Product table filter by status; publishable product filter |
| `Product` | `(storeId, name)` | Product search by name |
| `Product` | `(storeId, sourceUpdatedAt)` | Product sync cursor query (incremental polling) |
| `OrderItem` | `orderId` | Eager-load order items for order detail view |
| `SyncLog` | `(storeId, status)` | Error detection: find PENDING or FAILED sync logs |
| `SyncLog` | `(storeId, wooOrderId)` | Order idempotency check during reconciliation |
| `SyncCursor` | `storeId` | Load all cursors for a store (initial sync progress) |
| `ErrorReport` | `(storeId, severity)` | Dashboard: load CRITICAL errors per store |
| `ErrorReport` | `(storeId, resolvedAt)` | Filter unresolved errors (resolvedAt IS NULL) |
| `ImportJob` | `userId` | Load all import jobs for current user |
| `ImportJob` | `status` | Filter active/pending import jobs for progress polling |
| `ImportedProduct` | `importJobId` | Load all products for an import job |
| `AssetFile` | `userId` | Load assets owned by current user |
| `PushLog` | `sourceProductId` | Load push history for a product |
| `PushLog` | `targetStoreId` | Load push history targeting a specific store |
| `PushLog` | `status` | Filter by push outcome |

---

## 6. Credential Encryption

### Algorithm

AES-256-GCM (Authenticated Encryption with Associated Data). This algorithm:
- Encrypts the value (confidentiality)
- Produces an authentication tag (tamper detection)
- Uses a random IV (nonce) per encryption (same plaintext → different ciphertext each time)

### Implementation

File: `src/lib/utils/credential-encryption.ts`

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_BYTES = 32
const IV_BYTES = 16
const AUTH_TAG_BYTES = 16

function getMasterKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!key) throw new Error('CREDENTIAL_ENCRYPTION_KEY is not set')
  const buf = Buffer.from(key, 'base64')
  if (buf.length !== KEY_BYTES) throw new Error(`Key must be ${KEY_BYTES} bytes`)
  return buf
}

export function encryptCredential(plaintext: string): { encrypted: string; iv: string } {
  const key = getMasterKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encryptedData = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Store: authTag (16 bytes) + encryptedData, base64-encoded
  const combined = Buffer.concat([authTag, encryptedData])
  return { encrypted: combined.toString('base64'), iv: iv.toString('base64') }
}

export function decryptCredential(encrypted: string, iv: string): string {
  const key = getMasterKey()
  const ivBuf = Buffer.from(iv, 'base64')
  const combined = Buffer.from(encrypted, 'base64')
  const authTag = combined.subarray(0, AUTH_TAG_BYTES)
  const encryptedData = combined.subarray(AUTH_TAG_BYTES)
  const decipher = createDecipheriv(ALGORITHM, key, ivBuf)
  decipher.setAuthTag(authTag)
  try {
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString('utf8')
  } catch {
    throw new Error('Credential decryption failed: key mismatch or data corrupted')
  }
}
```

### Key Management

- **Key generation:** `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- **Key storage:** `CREDENTIAL_ENCRYPTION_KEY` environment variable, set in Vercel Dashboard (never in code)
- **Key rotation:** Requires a migration:
  1. Generate new key
  2. Run migration script that decrypts all StoreCredential rows with old key, re-encrypts with new key
  3. Swap CREDENTIAL_ENCRYPTION_KEY in Vercel Dashboard
  4. Verify one store connection works
  5. Remove old key
- **Key rotation is a breaking operation** — schedule during maintenance window

### Absolute Rules (enforced by code review and CLAUDE.md)

- The plaintext credential value MUST NOT appear in: API response bodies, server logs (`console.log`, `logger.*`), error messages sent to client, Prisma query results returned directly
- `StoreCredential` rows MUST NEVER be returned from repository functions that return `Store` data to route handlers
- Decryption happens ONLY inside service functions, immediately before an outbound API call
- Decrypted strings live on the call stack only — never assigned to module-scope variables

---

## 7. Image Storage

### storageType Discriminator

Every `ProductImage` record has a `storageType` field that determines how the image is stored.

| `storageType` | Source | `sourceUrl` | `assetFileId` | Use case |
|---|---|---|---|---|
| `URL` | WooCommerce sync (UC3) | WooCommerce image URL | null | Product synced from store — image not downloaded |
| `UPLOADED` | Import push (UC5) | Original source URL | set | Image downloaded to Vercel Blob, re-uploaded to target store |

**Rule:** An `UPLOADED` image MUST have an `assetFileId`. A `URL` image MUST have `assetFileId = null`. Violation throws at application layer in `productImageService.create()`.

### AssetFile Lifecycle (UC5 Push)

```
1. Import: ProductImage created with storageType=URL, sourceUrl=originalUrl, assetFileId=null
2. Push triggered: productPushService iterates ProductImages on selected ImportedProducts
3. For each image:
   a. GET sourceUrl → image bytes (in-memory, Vercel function)
   b. PUT to Vercel Blob → { url: blobUrl }
   c. CREATE AssetFile { userId, originalUrl: sourceUrl, blobUrl, filename, mimeType, sizeBytes }
   d. UPDATE ProductImage { storageType: UPLOADED, assetFileId: assetFile.id }
4. Build WooCommerce payload: images[].src = blobUrl
5. POST to target WooCommerce /products → WooCommerce fetches image by URL
6. UPDATE AssetFile.uploadedUrl = WooCommerce-returned image URL from response body
```

If step 3a fails (404 / timeout): skip this image. Product is pushed without image. ProductImage stays `storageType=URL`. No AssetFile created. PushLog captures `imageDownloadFailed: true`.

If step 3b fails (Vercel Blob error): skip image. Same handling as 3a failure.

If step 5 fails: AssetFile.uploadedUrl stays null. PushLog.status = FAILED. Row shows error in import summary.

---

## 8. Row-Level Security — Enforcement Pattern

**Chosen approach: Application-layer enforcement (D04).**

### The Rule

Every repository function that accesses tenant data MUST accept a `userId` parameter and scope all queries through the Store ownership chain. No exceptions.

### Correct Pattern

```typescript
// Repository: storeId scope
async function findOrdersByStore(storeId: string, userId: string, params: PaginationParams) {
  // Always verify ownership first
  const store = await prisma.store.findFirst({
    where: { id: storeId, userId }  // ← userId filter is MANDATORY
  })
  if (!store) throw new ForbiddenError('STORE_ACCESS_DENIED')

  return prisma.order.findMany({
    where: { storeId },  // ← storeId scope is MANDATORY
    ...params
  })
}

// Repository: cross-store user scope
async function findAllOrdersForUser(userId: string, params: PaginationParams) {
  return prisma.order.findMany({
    where: {
      store: { userId }  // ← Always filter through the Store ownership chain
    },
    include: { store: true, customer: true },
    ...params
  })
}
```

### Forbidden Patterns

```typescript
// ❌ FORBIDDEN: No tenant scope
prisma.order.findMany()

// ❌ FORBIDDEN: Unverified storeId from request
prisma.order.findMany({ where: { storeId: req.params.storeId } })

// ❌ FORBIDDEN: Returning StoreCredential fields to route handlers
prisma.store.findUnique({ include: { credential: true } })
// (If you need the credential, use the credential factory in the service layer only)
```

### Route Handler Verification Pattern

```typescript
// Every route handler that receives a storeId MUST do this:
export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const session = await getServerSession()          // 1. Authenticate
  if (!session) return forbidden('UNAUTHORIZED')

  const { storeId } = params
  const store = await storeService.getStoreForUser(storeId, session.userId)
  // getStoreForUser throws ForbiddenError if storeId does not belong to session.userId
  // Route handler returns 403 — NEVER 404 — to avoid leaking existence of another user's store

  // Now safe to proceed with storeId
  const data = await orderService.listOrders({ storeId, ...filters })
  return ok(data)
}
```

---

## 9. Migration Conventions

- **Naming:** `YYYYMMDD_short_description` — e.g., `20260610_add_multi_tenant_schema`
- **Run migrations:** `npx prisma migrate dev` (development), `npx prisma migrate deploy` (production via CI)
- **DIRECT_URL** must be set for migrations — migrations bypass PgBouncer via the direct connection
- **Never edit an existing migration file** — always create a new migration
- **Rollback:** Prisma does not support automatic rollback. Write manual rollback SQL in a comment at the top of the migration file for any destructive change.
- **Destructive changes** (column rename, type change, constraint removal): require a two-phase migration:
  - Phase 1: add new column/constraint alongside old one
  - Phase 2 (after deploy): remove old column/constraint

### Migration Order for Multi-Tenant Schema

```
20260610_add_user_store_credential
20260611_add_order_customer_orderitem
20260612_add_product_category_tag
20260613_add_productimage_assetfile
20260614_add_importjob_importedproduct
20260615_add_pushlog
20260616_add_synclog_synccursor_errorreport
```

Each migration covers logically related models. Run them in sequence.

---

## 10. Seed Data

**Location:** `prisma/seed/` directory. Run with `npm run seed`.

### Available Seeds

| Seed File | Contents | When to Use |
|---|---|---|
| `prisma/seed/01-users.ts` | 2 users: admin@simplecrm.test (ADMIN), owner@simplecrm.test (USER) | Always |
| `prisma/seed/02-stores.ts` | 2 stores for the USER: store-a.test, store-b.test | Always |
| `prisma/seed/03-products.ts` | 20 products on store-a, 15 on store-b | For product/push testing |
| `prisma/seed/04-orders.ts` | 50 orders on store-a, 30 on store-b, various statuses | For order testing |
| `prisma/seed/05-import.ts` | 1 complete ImportJob with 10 ImportedProducts | For UC5 testing |

**Reset:** `npx prisma migrate reset` (drops all data + re-runs migrations + seed).

**Test isolation:** Playwright E2E tests that need clean state use `beforeEach` to truncate tables via the seed API endpoint `POST /api/test/reset` (enabled only when `NODE_ENV=test`).

---

## 11. Known Query Patterns

### UC2 — Unified order table (paginated, filtered, multi-store)

```sql
-- Indexes used: (storeId, wooCreatedAt), (storeId, status)
SELECT o.*, s.domain, c.email, c.first_name, c.last_name
FROM orders o
JOIN stores s ON s.id = o.store_id AND s.user_id = $userId
LEFT JOIN customers c ON c.id = o.customer_id
WHERE s.user_id = $userId
  AND ($storeId IS NULL OR o.store_id = $storeId)
  AND ($status IS NULL OR o.status = $status)
  AND ($dateFrom IS NULL OR o.woo_created_at >= $dateFrom)
  AND ($dateTo IS NULL OR o.woo_created_at <= $dateTo)
ORDER BY o.woo_created_at DESC
LIMIT 50 OFFSET ($page - 1) * 50;
```

### UC3 — Unified product table (paginated, filtered, multi-store)

```sql
-- Indexes used: (storeId, status), (storeId, name)
SELECT p.*, s.domain
FROM products p
JOIN stores s ON s.id = p.store_id AND s.user_id = $userId
WHERE s.user_id = $userId
  AND ($storeId IS NULL OR p.store_id = $storeId)
  AND ($status IS NULL OR p.status = $status)
ORDER BY p.created_at DESC
LIMIT 50 OFFSET ($page - 1) * 50;
```

### UC3 — Conflict check (live API — not a DB query)

The conflict check is NOT a DB query. It calls the live target store's WooCommerce API:
`GET {targetStoreDomain}/wp-json/wc/v3/products?search={normalizedTitle}&per_page=5`

### Flow 2 — Order reconciliation (find missing orders)

```sql
-- Indexes used: (storeId, wooCreatedAt), (storeId, wooOrderId)
SELECT woo_order_id
FROM sync_logs
WHERE store_id = $storeId
  AND woo_order_id IS NOT NULL
  AND status IN ('SUCCESS', 'PENDING');
-- Compare against WooCommerce API result — IDs not in this set are missing
```

### Flow 3 — Product sync (incremental, cursor-based)

```sql
-- Read cursor
SELECT value FROM sync_cursors WHERE store_id = $storeId AND name = 'lastProductSyncAt';
-- Upsert product
INSERT INTO products (...) ON CONFLICT (store_id, woo_product_id) DO UPDATE SET ...;
-- Update cursor
UPDATE sync_cursors SET value = $now WHERE store_id = $storeId AND name = 'lastProductSyncAt';
```

### UC4 — Store status check

```typescript
// Not a DB query at check time — results written to DB after check
await prisma.store.update({
  where: { id: storeId },
  data: { status: derivedStatus, lastCheckedAt: new Date() }
})
```
