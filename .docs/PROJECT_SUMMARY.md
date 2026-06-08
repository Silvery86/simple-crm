# Project Summary — Simple CRM

## What Is This Project?

**Simple CRM** is a multi-store e-commerce operations platform designed for Vietnamese merchants who manage multiple WooCommerce and Shopify stores simultaneously. The platform eliminates the pain of context-switching between store admin panels by providing a single bilingual (English/Vietnamese) dashboard for product catalog management, cross-store pricing, order tracking, shipment monitoring, customer management, email marketing campaigns, and AI-powered product content generation.

**Core value proposition:** One dashboard → all stores. Unified product catalog with per-store price customisation rules. Real-time sync. Bilingual-first UX.

---

## Team Structure & Roles

| Role | Responsibility |
|---|---|
| Product Manager (PM) | Delivery phases, prioritisation, definition of done, stakeholder communication |
| Business Analyst (BA) | User stories, data modeling, business rules, acceptance criteria |
| Backend Engineer (BE) | API routes, services, repositories, database, Redis, integrations |
| Frontend Engineer (FE) | Next.js App Router pages, components, state management, i18n implementation |
| QA / Test Engineer | Playwright E2E tests, API contract tests, CI integration, quality gates |

---

## High-Level Feature List

### Phase 1 — Store & Product MVP
- **Multi-store management:** Connect WooCommerce and Shopify stores via API credentials. View all stores in a unified dashboard.
- **Shared product catalog:** Import products from stores into a normalised catalog. Detect and merge duplicates via SKU matching.
- **Product sync:** Push catalog updates (title, description, images, categories) to connected stores. Pull new products from stores.
- **Cross-store price management:** Set base price in catalog + per-store price adjustment rules (`markup %`, `fixed offset`). Preview effective price before applying.
- **Price comparison dashboard:** Side-by-side view of product prices across all stores. Spot pricing inconsistencies instantly.
- **Shopify import:** Stream-import Shopify product catalogue via Admin API. Handle rate limits gracefully.
- **Role-based access:** ADMIN sees everything. MANAGER has limited admin access. PARTNER sees only their assigned store(s).
- **Bilingual UI:** All UI available in English and Vietnamese. Toggle without losing page state.
- **Dark / Light mode:** System-default theme with user override. Persisted per user.

### Phase 2 — Order Tracking & Logistics
- **Order management:** Aggregate orders from all connected stores. Filter by store, status, date, brand.
- **Shipment tracking:** Integrate with AfterShip / 17Track to show real-time carrier status on every order.
- **Shipment event timeline:** Full event history per shipment with location and timestamp.
- **Order event audit trail:** Every status change and action on an order is logged.

### Phase 3 — Email Marketing & AI Content
- **Customer management:** Normalised customer records aggregated across stores. Deduplication by email/phone.
- **Customer segmentation:** SQL-defined segment rules. Preview segment size before sending.
- **Email templates:** MJML-based templates with WYSIWYG preview. Reusable across campaigns.
- **Campaign automation:** Schedule campaigns, track delivery/open/click/bounce via Mailjet webhooks.
- **AI content generation:** Queue Gemini-powered image and video generation jobs for products. Output stored to Google Drive and linked to catalog.

### Phase 4 — Analytics & Reporting
- Sales analytics by store, product, brand, customer segment
- Price history and adjustment audit trail
- Campaign performance metrics (open rate, CTR, conversion)
- Inventory and sync health monitoring

---

## Key Technical Documents

| Document | Path | Description |
|---|---|---|
| Architecture guide | `CLAUDE.md` | Source of truth for all architectural decisions |
| Tech specs | `.docs/PROJECT_TECH_SPECS.md` | Full stack, schema, API, infra, env vars |
| Project status | `.docs/PROJECT_STATUS.md` | Current phase, tasks, blockers |
| Design system | `.docs/DESIGN_PATTERN.md` | Colors, typography, spacing, dark/light mode |
| Component catalogue | `.docs/design/COMPONENTS_DESIGN.md` | All components with claude.design prompts |
| Prisma schema | `prisma/schema.prisma` | Database model definitions |
| Test suite | `.test/` | All Playwright E2E and API contract tests |

---

## Project Phases & Milestones

### Phase 0 — Project Bootstrap *(Current)*
- Architecture documentation (CLAUDE.md, .docs/)
- Agreed folder structure and conventions
- CI/CD pipeline setup (GitHub Actions → Vercel)
- Playwright test infrastructure in `.test/`
- `.env.example` with all required variables

### Phase 1 — Store & Product MVP
- Target: TBD — requires PM scheduling
- Deliverables: Store CRUD, Product catalog, Price comparison, Shopify import, RBAC enforcement
- Definition of Done: All critical paths covered by Playwright tests in both EN and VI

### Phase 2 — Order Tracking & Logistics
- Target: TBD
- Deliverables: Order aggregation, shipment tracking integration, event audit trail
- Definition of Done: Order status visible for all connected stores within 60s of update

### Phase 3 — Email Marketing & AI Content
- Target: TBD
- Deliverables: Campaign builder, Mailjet integration, AI job queue, Google Drive output
- Definition of Done: Full campaign lifecycle tested end-to-end

### Phase 4 — Analytics & Reporting
- Target: TBD
- Deliverables: Dashboard analytics, price history, campaign metrics
- Definition of Done: All metrics load within 2s on production data volume
