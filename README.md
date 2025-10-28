# Simple CRM

A comprehensive customer relationship management system built on Next.js 14, integrated with e-commerce platforms and logistics services.

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Next.js Route Handlers (REST API), Prisma ORM, PostgreSQL
- **Auth**: Firebase Auth with custom claims (admin/manager/partner)
- **Background Jobs**: BullMQ + Redis
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form + Zod validation
- **Integrations**: WooCommerce, AfterShip, 17Track, Mailjet, Google Drive

## 📁 Folder Structure

```
simple-crm/
├── public/                           # Static assets
├── prisma/                           # Database schema and migrations
│   └── schema.prisma                 # Prisma database schema
├── src/
│   ├── app/                          # Next.js 14 App Router
│   │   ├── (dashboard)/              # Dashboard route group (protected)
│   │   │   ├── orders/               # Order management
│   │   │   ├── stores/               # Store management
│   │   │   ├── customers/            # Customer management
│   │   │   ├── analytics/            # Reports and analytics
│   │   │   ├── settings/             # System settings
│   │   │   └── page.tsx              # Dashboard homepage
│   │   ├── api/                      # REST API Route Handlers
│   │   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── stores/               # Store management API
│   │   │   ├── orders/               # Order management API
│   │   │   ├── webhooks/             # Webhook handlers (WooCommerce, AfterShip)
│   │   │   └── health/               # Health check endpoint
│   │   ├── globals.css               # Global styles and Tailwind imports
│   │   ├── layout.tsx                # Root layout with providers
│   │   └── page.tsx                  # Landing page
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui base components
│   │   │   ├── button.tsx            # Button component
│   │   │   ├── card.tsx              # Card components
│   │   │   ├── input.tsx             # Input components
│   │   │   ├── dialog.tsx            # Modal/Dialog components
│   │   │   └── ...                   # Other UI components
│   │   ├── forms/                    # Form components with validation
│   │   │   ├── order-form.tsx        # Order create/edit form
│   │   │   ├── store-form.tsx        # Store create/edit form
│   │   │   └── ...                   # Other form components
│   │   └── layout/                   # Layout components
│   │       ├── sidebar.tsx           # Navigation sidebar
│   │       ├── header.tsx            # Top header/navbar
│   │       ├── breadcrumb.tsx        # Breadcrumb navigation
│   │       └── container.tsx         # Page containers
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-auth.ts               # Firebase auth hook
│   │   ├── use-local-storage.ts      # Local storage hook
│   │   └── use-api.ts                # API calling hooks
│   ├── lib/                          # Shared libraries and utilities
│   │   ├── db/                       # Database layer
│   │   │   ├── client.ts             # Prisma client setup
│   │   │   ├── index.ts              # Database exports
│   │   │   └── repositories/         # Repository pattern (REQUIRED)
│   │   │       ├── base.repo.ts      # Base repository interface
│   │   │       ├── store.repo.ts     # Store operations
│   │   │       ├── order.repo.ts     # Order operations
│   │   │       ├── product.repo.ts   # Product operations
│   │   │       └── user.repo.ts      # User operations
│   │   ├── integrations/             # External service integrations
│   │   │   ├── commerce-adapter.ts   # Common commerce interface
│   │   │   ├── woo/                  # WooCommerce integration
│   │   │   │   └── woo.adapter.ts    # WooCommerce API client
│   │   │   └── shopify/              # Shopify integration (future)
│   │   │       └── shopify.adapter.ts
│   │   ├── shipments/                # Shipping and tracking
│   │   │   ├── providers/            # Tracking providers
│   │   │   │   ├── aftership.ts      # AfterShip API integration
│   │   │   │   └── track17.ts        # 17Track API integration
│   │   │   └── service.ts            # Unified shipment service
│   │   ├── queue/                    # Background job management
│   │   │   ├── index.ts              # BullMQ setup and exports
│   │   │   └── jobs/                 # Job definitions
│   │   │       ├── sync-orders.ts    # Order sync job types
│   │   │       └── update-tracking.ts # Tracking update job types
│   │   ├── utils/                    # Utility functions
│   │   │   ├── auth.ts               # Firebase auth utilities
│   │   │   ├── errors.ts             # Error handling classes
│   │   │   ├── logger.ts             # Logging utilities
│   │   │   ├── validation.ts         # Common validation helpers
│   │   │   └── index.ts              # Common utility functions
│   │   └── zod/                      # Zod validation schemas
│   │       ├── api.ts                # API request/response schemas
│   │       ├── auth.ts               # Authentication schemas
│   │       ├── orders.ts             # Order related schemas
│   │       └── forms.ts              # Form validation schemas
│   ├── types/                        # TypeScript type definitions
│   │   ├── api.ts                    # API response types
│   │   ├── auth.ts                   # Authentication types
│   │   ├── database.ts               # Database model types
│   │   └── global.ts                 # Global type definitions
│   └── worker/                       # Background worker processes
│       ├── index.ts                  # Worker initialization and management
│       └── jobs/                     # Job processors
│           ├── sync-orders.job.ts    # Order synchronization processor
│           ├── update-tracking.job.ts # Tracking update processor
│           └── email-notifications.job.ts # Email notification processor
├── .env                              # Environment variables
├── .env.example                      # Environment variables template
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts               # TailwindCSS configuration
├── tsconfig.json                    # TypeScript configuration
├── prisma.config.ts                 # Prisma configuration
├── copilot.instruction.md           # GitHub Copilot coding standards
└── package.json                     # Dependencies and scripts
```

## 🎯 Folder Usage Guidelines

### `/src/app/` - Next.js App Router
- **`(dashboard)/`**: Protected routes requiring authentication
- **`api/`**: REST API endpoints, each route must have English docblocks
- **Layout files**: Contains providers (Query, Auth, Theme)

### `/src/components/` - React Components
- **`ui/`**: shadcn/ui base components, reusable across app
- **`forms/`**: Form components with React Hook Form + Zod validation
- **`layout/`**: Layout-specific components (sidebar, header, containers)

### `/src/lib/db/repositories/` - Repository Pattern (MANDATORY)
- **All database operations MUST go through repository layer**
- **API routes MUST NOT call Prisma directly**
- Each Prisma model has 1 corresponding repository
- Repository implements CRUD + business-specific queries

### `/src/lib/integrations/` - External Services
- **`woo/`**: WooCommerce API integration
- **`shopify/`**: Shopify integration (future)
- Each integration has its own adapter pattern

### `/src/lib/shipments/` - Logistics Integration
- **`providers/`**: Tracking service adapters (AfterShip, 17Track)
- **`service.ts`**: Unified shipment tracking service

### `/src/lib/queue/` - Background Jobs
- **BullMQ job definitions and queue setup**
- **Jobs folder**: Job payload types and queue configurations

### `/src/worker/` - Background Processing
- **Job processors running in separate process**
- **Must use repository pattern, NO direct Prisma calls**

### `/src/hooks/` - Custom React Hooks
- **Firebase auth integration**
- **API calling with TanStack Query**
- **Local state management helpers**

### `/src/types/` - TypeScript Definitions
- **Shared type definitions across app**
- **API contracts and response types**
- **Database model extensions**
