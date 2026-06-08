# Design Pattern — Simple CRM

> Visual and UX design system specification. All component implementations must comply with this document. When tokens change, update both this file and `tailwind.config.ts` + `globals.css` in the same PR.

---

## 1. Design Philosophy

Simple CRM is built on four pillars:

**Clean** — No decorative noise. Every visual element serves a purpose. Information density is balanced with whitespace. The UI steps back and lets the data speak.

**Bilingual-first** — The layout assumes Vietnamese text, which runs 20–30% longer than English equivalents. All text containers must accommodate overflow without truncating, wrapping awkwardly, or breaking adjacent layout. Language switching is a first-class interaction, not an afterthought.

**Accessible** — WCAG AA compliance as a minimum. High contrast ratios. Keyboard navigability. Meaningful focus indicators. Screen reader labels on all interactive elements.

**Dark / Light parity** — Neither mode is an afterthought. Both receive equal visual weight and polish. Dark mode uses true dark surfaces (not just gray inversions) with carefully tuned contrast.

---

## 2. Color System

### Design Principles
- Colors are defined as CSS variables and mapped to Tailwind utility classes via `tailwind.config.ts`.
- Every color token exists in both `light` and `dark` variants.
- Semantic tokens (not raw palette values) are used in components. Never use `--color-blue-500` directly in a component — use `--color-primary-500`.

### Primary Palette (Brand Blue)

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--color-primary-50` | `#eff6ff` | `#1e3a5f` | Subtle backgrounds |
| `--color-primary-100` | `#dbeafe` | `#1e40af` | Hover backgrounds |
| `--color-primary-200` | `#bfdbfe` | `#1d4ed8` | Active backgrounds |
| `--color-primary-300` | `#93c5fd` | `#2563eb` | Borders, accents |
| `--color-primary-400` | `#60a5fa` | `#3b82f6` | Secondary actions |
| `--color-primary-500` | `#3b82f6` | `#60a5fa` | **Primary actions, links** |
| `--color-primary-600` | `#2563eb` | `#93c5fd` | Hover state (primary btn) |
| `--color-primary-700` | `#1d4ed8` | `#bfdbfe` | Pressed state |
| `--color-primary-800` | `#1e40af` | `#dbeafe` | Dark text on primary bg |
| `--color-primary-900` | `#1e3a8a` | `#eff6ff` | Darkest shade |

### Secondary Palette (Slate Neutral)

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--color-secondary-50` | `#f8fafc` | `#0f172a` | Page background |
| `--color-secondary-100` | `#f1f5f9` | `#1e293b` | Card / surface background |
| `--color-secondary-200` | `#e2e8f0` | `#334155` | Borders, dividers |
| `--color-secondary-300` | `#cbd5e1` | `#475569` | Disabled elements |
| `--color-secondary-400` | `#94a3b8` | `#64748b` | Placeholder text |
| `--color-secondary-500` | `#64748b` | `#94a3b8` | Secondary text |
| `--color-secondary-600` | `#475569` | `#cbd5e1` | Body text |
| `--color-secondary-700` | `#334155` | `#e2e8f0` | Headings (secondary) |
| `--color-secondary-800` | `#1e293b` | `#f1f5f9` | Primary text |
| `--color-secondary-900` | `#0f172a` | `#f8fafc` | Darkest text / icon |

### Accent Palette (Indigo)

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--color-accent-400` | `#818cf8` | `#a5b4fc` | Active nav items |
| `--color-accent-500` | `#6366f1` | `#818cf8` | Accent highlights |
| `--color-accent-600` | `#4f46e5` | `#6366f1` | Accent hover |

### Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--color-success-50` | `#f0fdf4` | `#052e16` | Success background |
| `--color-success-500` | `#22c55e` | `#4ade80` | Success text, icon |
| `--color-success-600` | `#16a34a` | `#22c55e` | Success button hover |
| `--color-warning-50` | `#fffbeb` | `#1c1002` | Warning background |
| `--color-warning-500` | `#f59e0b` | `#fbbf24` | Warning text, icon |
| `--color-warning-600` | `#d97706` | `#f59e0b` | Warning hover |
| `--color-error-50` | `#fef2f2` | `#1a0505` | Error background |
| `--color-error-500` | `#ef4444` | `#f87171` | Error text, icon |
| `--color-error-600` | `#dc2626` | `#ef4444` | Error hover |
| `--color-info-50` | `#eff6ff` | `#0c1a33` | Info background |
| `--color-info-500` | `#3b82f6` | `#60a5fa` | Info text, icon |
| `--color-info-600` | `#2563eb` | `#3b82f6` | Info hover |

### Surface & Background Tokens

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--color-bg-base` | `#ffffff` | `#0f172a` | Root page background |
| `--color-bg-surface` | `#f8fafc` | `#1e293b` | Card / panel background |
| `--color-bg-elevated` | `#ffffff` | `#334155` | Modal, dropdown background |
| `--color-bg-overlay` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` | Modal overlay |
| `--color-border` | `#e2e8f0` | `#334155` | Default border |
| `--color-border-strong` | `#cbd5e1` | `#475569` | Focused / active border |

### CSS Variable Naming Convention

```css
--color-{palette}-{shade}
--color-{semantic}-{shade}
--color-bg-{role}
--color-border[-modifier]
```

---

## 3. Typography

### Font Families

| Role | Font | Fallback | Usage |
|---|---|---|---|
| UI Body | `Inter` | `system-ui, sans-serif` | All UI text, labels, body |
| Code / Mono | `JetBrains Mono` | `Consolas, monospace` | Code snippets, IDs, SKUs |

**Rationale for Inter:** Excellent Latin + Vietnamese character support. Variable font for flexible weight. Designed for screen readability at small sizes. Free and self-hostable via `next/font`.

### Type Scale

| Step | Size | Line Height | Usage |
|---|---|---|---|
| `text-xs` | 12px / 0.75rem | 1.5 (18px) | Labels, captions, badges |
| `text-sm` | 14px / 0.875rem | 1.5 (21px) | Secondary body, helper text |
| `text-base` | 16px / 1rem | 1.5 (24px) | Primary body text |
| `text-lg` | 18px / 1.125rem | 1.4 (25px) | Card titles, sub-headings |
| `text-xl` | 20px / 1.25rem | 1.4 (28px) | Section headings |
| `text-2xl` | 24px / 1.5rem | 1.3 (31px) | Page headings (H2) |
| `text-3xl` | 30px / 1.875rem | 1.2 (36px) | Page titles (H1) |

### Font Weights

| Weight | Class | Usage |
|---|---|---|
| 400 | `font-normal` | Body text, secondary labels |
| 500 | `font-medium` | Form labels, nav items, table headers |
| 600 | `font-semibold` | Card titles, sub-headings, button text |
| 700 | `font-bold` | Page headings, emphasis |

### Line Height & Letter Spacing

- Body text: `leading-relaxed` (1.625) for readability with Vietnamese diacritics
- Headings: `leading-tight` (1.25) — headings are shorter
- Letter spacing: default (0) for body; `tracking-tight` (-0.025em) for large headings only

### i18n Typography Consideration

Vietnamese uses diacritical marks above and below characters (tones + vowels). Ensure:
- `line-height` is at least 1.5 for body text — marks need vertical space
- Text containers are wider than their minimum English content width
- Use `min-h` not `h` for text containers to allow growth
- Never `overflow-hidden` + `whitespace-nowrap` on user-facing strings without a tooltip fallback

---

## 4. Spacing System

### Base Unit

**4px (0.25rem)** — all spacing values are multiples of 4px.

### Spacing Scale

| Token | Value | Pixels | Usage example |
|---|---|---|---|
| `spacing-0` | 0 | 0px | Reset |
| `spacing-1` | 0.25rem | 4px | Icon gap, tight padding |
| `spacing-2` | 0.5rem | 8px | Inline elements, badge padding |
| `spacing-3` | 0.75rem | 12px | Button padding (Y), input padding (Y) |
| `spacing-4` | 1rem | 16px | Card padding (compact), form field gap |
| `spacing-5` | 1.25rem | 20px | |
| `spacing-6` | 1.5rem | 24px | Card padding (default), section gap |
| `spacing-8` | 2rem | 32px | Card padding (spacious), section padding |
| `spacing-10` | 2.5rem | 40px | |
| `spacing-12` | 3rem | 48px | Page section gap |
| `spacing-16` | 4rem | 64px | Page header height, major sections |

### Padding vs Margin vs Gap

- **padding:** Internal space within an element (card padding, button padding, input padding)
- **margin:** External space pushing away from siblings — use sparingly, prefer `gap` in flex/grid
- **gap:** Space between children in flex/grid containers — preferred over margin for layout

---

## 5. Border Radius Scale

| Token | Value | Usage |
|---|---|---|
| `rounded-none` | 0 | No rounding (dividers, table cells) |
| `rounded-sm` | 2px | Subtle rounding (tags in dense tables) |
| `rounded` | 4px | Default inputs, secondary buttons |
| `rounded-md` | 6px | Primary buttons, cards |
| `rounded-lg` | 8px | Modals, dropdowns, elevated panels |
| `rounded-xl` | 12px | Feature cards, highlight panels |
| `rounded-full` | 9999px | Badges, avatars, toggle/pill buttons |

---

## 6. Shadow / Elevation Scale

### Light Mode

| Token | Value | Usage |
|---|---|---|
| `shadow-none` | none | Flat surfaces, table rows |
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle card lift |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Default cards |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)` | Dropdowns, popovers |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` | Modals |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)` | Large elevated panels |

### Dark Mode

Dark mode shadows use luminosity instead of opacity to avoid washing out the dark surface:

| Token | Dark Mode Value | Notes |
|---|---|---|
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.3)` | Stronger alpha for dark bg |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.4)` | |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.5)` | |

---

## 7. Motion & Animation Principles

### Duration Tokens

| Token | Duration | Usage |
|---|---|---|
| `duration-fast` | 100ms | Instant feedback (button press, checkbox) |
| `duration-normal` | 200ms | Most transitions (hover, show/hide, theme toggle) |
| `duration-slow` | 400ms | Larger motion (modal open, drawer slide, page transition) |
| `duration-xslow` | 600ms | Loading spinners, subtle ambient animation |

### Easing Curves

| Name | CSS Value | Usage |
|---|---|---|
| `ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default for all transitions |
| `ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations (modal open, fly-in) |
| `ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations (modal close, fly-out) |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy interactions (toggle, badge pop) |

### Reduced Motion Policy

All animations must respect `prefers-reduced-motion: reduce`. Use this pattern:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

In Tailwind, use `motion-safe:` and `motion-reduce:` variant prefixes.

---

## 8. Breakpoints & Responsive Strategy

### Mobile-First

All styles are written for mobile first. Larger breakpoints override via `sm:`, `md:`, etc.

### Breakpoint Tokens

| Token | Min Width | Typical Target |
|---|---|---|
| (default) | 0px | Mobile phones (< 640px) |
| `sm` | 640px | Large phones, small tablets |
| `md` | 768px | Tablets (portrait) |
| `lg` | 1024px | Tablets (landscape), small laptops |
| `xl` | 1280px | Desktops, large laptops |
| `2xl` | 1536px | Wide monitors |

### Responsive Strategy

- Dashboard layout: sidebar hidden on mobile (hamburger menu), visible from `lg:` upward
- Data tables: horizontally scrollable on mobile (`overflow-x-auto`), full columns from `md:`
- Cards: single column on mobile, 2-col from `md:`, 3-col from `xl:`
- Typography: headings scale down on mobile (`text-xl` on mobile → `text-3xl` on `lg:`)
- Modal width: full-screen on mobile, `max-w-lg` on `md:`, `max-w-2xl` on `lg:`

---

## 9. Grid & Layout System

### Page Layout

```
┌──────────────────────────────────────────────────────────┐
│  Navbar (height: 64px, fixed top)                         │
├──────────────────────────────────────────────────────────┤
│  Sidebar │                                                │
│  (240px  │  Main Content Area                             │
│   fixed) │  (fluid, max-w-7xl, px-6 py-8)               │
│          │                                                │
│          │  ┌─────────────────────────────────────────┐  │
│          │  │  Page Header (title + actions)           │  │
│          │  ├─────────────────────────────────────────┤  │
│          │  │  Content (cards, tables, forms)          │  │
│          │  └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- **Sidebar width:** 240px (desktop), hidden on mobile
- **Navbar height:** 64px (fixed)
- **Content max-width:** `max-w-7xl` (1280px) centered
- **Content padding:** `px-4 py-6` (mobile), `px-6 py-8` (desktop)
- **Content gap between sections:** `gap-6` (24px)

### Grid

- Card grids: `grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3`
- Stat grids: `grid grid-cols-2 gap-4 md:grid-cols-4`
- Form layouts: single column by default, `grid grid-cols-2 gap-x-6` for side-by-side fields on `md:`

---

## 10. Dark / Light Mode Implementation Guide

### CSS Variables Setup

Define all tokens in `src/app/globals.css`:

```css
:root {
  --color-bg-base: #ffffff;
  --color-bg-surface: #f8fafc;
  --color-bg-elevated: #ffffff;
  --color-border: #e2e8f0;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-primary-500: #3b82f6;
  /* ... all tokens from Section 2 */
}

.dark {
  --color-bg-base: #0f172a;
  --color-bg-surface: #1e293b;
  --color-bg-elevated: #334155;
  --color-border: #334155;
  --color-text-primary: #f8fafc;
  --color-text-secondary: #cbd5e1;
  --color-text-muted: #64748b;
  --color-primary-500: #60a5fa;
  /* ... dark variants from Section 2 */
}
```

### Tailwind Config Integration

In `tailwind.config.ts`, extend colors to consume CSS variables:

```typescript
colors: {
  bg: {
    base: 'var(--color-bg-base)',
    surface: 'var(--color-bg-surface)',
    elevated: 'var(--color-bg-elevated)',
  },
  border: {
    DEFAULT: 'var(--color-border)',
    strong: 'var(--color-border-strong)',
  },
  primary: {
    500: 'var(--color-primary-500)',
    600: 'var(--color-primary-600)',
    // ...
  },
  text: {
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    muted: 'var(--color-text-muted)',
  }
}
```

### next-themes Integration Pattern

In root layout (`src/app/layout.tsx`):

```tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- `attribute="class"` — adds `dark` class to `<html>` element
- `defaultTheme="system"` — respects OS preference by default
- `enableSystem` — allows system preference detection
- `suppressHydrationWarning` on `<html>` — prevents hydration mismatch for theme class

### Component-Level Dark Mode Guidelines

**Pattern 1 — Semantic token classes (preferred):**
```tsx
<div className="bg-bg-surface text-text-primary border-border">
```

**Pattern 2 — Tailwind dark: variant (for one-off overrides):**
```tsx
<div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
```

**Rule:** Never use hardcoded hex values or non-token Tailwind color classes (like `bg-blue-500`) in components — always use the semantic token classes so dark mode swaps automatically via CSS variables.
