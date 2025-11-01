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

## 🌐 Translation System

### Overview

The application supports bilingual UI (Vietnamese and English) with a complete translation system. All static text is translated using a centralized translation management system.

### Key Architecture

```
Component (uses t())
    ↓
LanguageProvider/useLang Hook
    ↓
API Endpoint: /api/locales/[lang]
    ↓
Locale Files: src/lib/locales/[en|vi].json
    ↓
localStorage Cache: translations_[lang]
```

### Translation Files

- **`src/lib/locales/en.json`** - English translations
- **`src/lib/locales/vi.json`** - Vietnamese translations

### Key Naming Convention

All translation keys follow this structure: `category.subcategory.type[.purpose]`

```
page.login.title              → "Sign In"
page.dashboard.welcome        → "Welcome back"
common.loading                → "Loading..."
errors.auth.invalidEmail      → "Invalid email address"
validation.required           → "This field is required"
toast.success.loginSuccess    → "Login successful"
toast.error.unknownError      → "An unknown error occurred"
```

### Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **page** | Page-specific content | `page.login.title`, `page.dashboard.welcome` |
| **common** | Shared UI elements | `common.loading`, `common.logout` |
| **errors** | Error messages | `errors.auth.invalidEmail`, `errors.api.serverError` |
| **validation** | Form validation | `validation.required`, `validation.email` |
| **toast** | Notifications | `toast.success.loginSuccess`, `toast.error.unknownError` |
| **sidebar** | Navigation items | `sidebar.dashboard`, `sidebar.orders` |
| **breadcrumb** | Breadcrumbs | `breadcrumb.home`, `breadcrumb.dashboard` |

### Usage Examples

#### 1. Page Content (Text, Headings, Labels)

```typescript
import { useLang } from '@/lib/hooks/useLang';

export default function LoginPage() {
  const { t, isLoading } = useLang();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <h1>{t('page.login.title')}</h1>
      <label>{t('page.login.emailLabel')}</label>
      <input placeholder={t('page.login.emailPlaceholder')} />
      <button>{t('page.login.loginButton')}</button>
    </div>
  );
}
```

#### 2. Toast Notifications

```typescript
import { useToast } from '@/components/ui/toast';

const toast = useToast();

// Success notification
toast.success('toast.success.title', 'toast.success.loginSuccess');

// Error notification
toast.error('toast.error.title', 'errors.auth.invalidEmail');

// Warning notification
toast.warning('toast.warning.title', 'toast.warning.sessionExpiring');
```

**Important:** Pass translation keys (not translated text) to toast functions. The toast component automatically translates keys internally.

#### 3. Error Handling

```typescript
import { handleApiError } from '@/lib/utils/error-translator';

try {
  // ... API call ...
} catch (error) {
  const errorMessage = handleApiError(error, t);
  toast.error('toast.error.title', errorMessage);
}
```

#### 4. Form Validation

```typescript
import { useForm } from 'react-hook-form';

const { register, formState: { errors } } = useForm();

<input
  {...register('email', {
    required: t('validation.required'),
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: t('validation.email')
    }
  })}
/>
```

### Adding New Translations

Follow these steps to add new translation keys:

1. **Determine category** (page, common, errors, toast, etc.)
2. **Add to `src/lib/locales/en.json`**
   ```json
   {
     "page": {
       "newPage": {
         "title": "New Page Title"
       }
     }
   }
   ```
3. **Add to `src/lib/locales/vi.json`** (same structure with Vietnamese text)
   ```json
   {
     "page": {
       "newPage": {
         "title": "Tiêu đề Trang Mới"
       }
     }
   }
   ```
4. **Use in component:** `{t('page.newPage.title')}`
5. **Test in both languages** - Clear localStorage and reload
   ```javascript
   localStorage.clear();
   location.reload();
   ```

### Language Switching

```typescript
import { useLang } from '@/lib/hooks/useLang';

export default function LanguageSwitcher() {
  const { lang, setLanguage } = useLang();

  return (
    <>
      <button onClick={() => setLanguage('en')}>English</button>
      <button onClick={() => setLanguage('vi')}>Vietnamese</button>
    </>
  );
}
```

### Translation Loading

- **First load:** Translations are fetched from `/api/locales/[lang]` and cached in localStorage
- **Subsequent loads:** Cached translations are used for instant loading
- **Language switch:** New language translations are fetched and cached

### Best Practices

✅ **DO:**
- Always add translations in pairs (both en.json and vi.json)
- Use lowercase with dots: `page.login.title` (not `PAGE_LOGIN_TITLE`)
- Use camelCase for multi-word keys: `loginSuccess` (not `login_success`)
- Group related keys together in JSON
- Wait for `isLoading` to be false before using `t()`
- Pass translation keys to toast (not translated text)
- Test with both EN and VI languages

❌ **DON'T:**
- Create only one-sided translations
- Use UPPERCASE or snake_case for keys
- Mix languages in keys
- Create deeply nested structures (>4 levels)
- Use generic names like "error" or "message"
- Call `t()` before translations are loaded

