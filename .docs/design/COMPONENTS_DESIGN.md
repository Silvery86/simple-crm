# Components Design Catalogue — Simple CRM

> Full component catalogue with specifications and claude.design prompts. Every component listed here must have a corresponding implementation in `src/components/` before it can be used in production pages.
>
> Design tokens referenced here are defined in `.docs/DESIGN_PATTERN.md`.

---

## ATOMS

Atoms are the smallest indivisible UI elements. They live in `src/components/ui/`.

---

### Button

**Category:** Atom
**File:** `src/components/ui/button.tsx`

**Purpose:** The primary interactive control for triggering actions. Used everywhere: forms, toolbars, modals, empty states, page headers.

**Props / Variants:**

| Prop | Values | Default |
|---|---|---|
| `variant` | `primary`, `secondary`, `ghost`, `danger`, `icon-only` | `primary` |
| `size` | `sm`, `md`, `lg` | `md` |
| `disabled` | `boolean` | `false` |
| `loading` | `boolean` — shows spinner, disables interaction | `false` |
| `leftIcon` | `ReactNode` | — |
| `rightIcon` | `ReactNode` | — |
| `fullWidth` | `boolean` | `false` |

**Variant Descriptions:**
- `primary` — filled blue (`--color-primary-500`), white text. Main CTA.
- `secondary` — outlined with primary border, primary-colored text. Secondary CTA.
- `ghost` — no border, no background. Hover reveals subtle background. Used in toolbars.
- `danger` — filled red (`--color-error-500`), white text. Destructive actions only.
- `icon-only` — square button with icon, no text. Must always have `aria-label`.

**Size Specs:**
- `sm`: `h-8 px-3 text-sm rounded gap-1.5`
- `md`: `h-10 px-4 text-sm rounded-md gap-2`
- `lg`: `h-12 px-6 text-base rounded-md gap-2`

**States:** default, hover, active/pressed, focus-visible (ring), disabled, loading

**Dark mode:** All variants adapt via CSS variable tokens. Primary remains blue in both modes.

**i18n:** Button labels use `t()`. Ensure button width expands for longer Vietnamese labels — use `min-w` not `w`.

**Accessibility:** `aria-disabled` when disabled. `aria-busy` when loading. Icon-only requires `aria-label`.

**claude.design prompt:**
> "Design a Button component for a professional B2B web application dashboard. Show all 5 variants (primary, secondary, ghost, danger, icon-only) at all 3 sizes (sm, md, lg) in a grid layout. Primary variant uses a rich blue (#3b82f6 light / #60a5fa dark). Danger variant uses #ef4444. Secondary and ghost use transparent backgrounds with appropriate borders and text. Show both light mode and dark mode variants side by side with a clear divider. Include all states for the primary/md variant: default, hover (slightly darker fill), active (scale 0.98), focus-visible (2px blue ring offset 2px), disabled (40% opacity, cursor-not-allowed), loading (spinner replaces left icon, text fades to 60%). Button uses Inter font, font-weight 500 (medium), border-radius 6px (md). Loading spinner is 14px white spinning circle. Icon-only variant is square. Vietnamese label example: 'Lưu thay đổi' must fit without overflow. Style: clean, flat, no gradients, no shadows except subtle 0 1px 2px on primary. Output: production-ready component spec with pixel measurements annotated."

---

### Input

**Category:** Atom
**File:** `src/components/ui/input.tsx`

**Purpose:** Text entry for forms, search fields, filters. Used across all data-entry flows.

**Props / Variants:**

| Prop | Values | Default |
|---|---|---|
| `type` | `text`, `password`, `search`, `number`, `email`, `tel` | `text` |
| `size` | `sm`, `md`, `lg` | `md` |
| `state` | `default`, `focus`, `error`, `disabled`, `readonly` | `default` |
| `leftIcon` | `ReactNode` | — |
| `rightIcon` | `ReactNode` or `ReactNode[]` (e.g., clear + eye toggle) | — |
| `placeholder` | `string` | — |
| `errorMessage` | `string` — shown below input when state=error | — |
| `fullWidth` | `boolean` | `true` |

**Size Specs:**
- `sm`: `h-8 px-3 text-sm`
- `md`: `h-10 px-3 text-sm`
- `lg`: `h-12 px-4 text-base`

**States:**
- `default`: `border-border bg-bg-surface`
- `focus`: `border-primary-500 ring-2 ring-primary-500/20`
- `error`: `border-error-500 ring-2 ring-error-500/20`
- `disabled`: `bg-secondary-100 text-secondary-400 cursor-not-allowed`
- `readonly`: `bg-secondary-50 cursor-default`

**Dark mode:** Background uses `--color-bg-surface`. Border uses `--color-border`. Text uses `--color-text-primary`.

**i18n:** Placeholder text must use `t()`. Input width must accommodate longer VI placeholder strings — never clip placeholder text.

**Accessibility:** Always paired with `<label>`. Use `aria-describedby` for error messages. `aria-invalid="true"` on error state.

**claude.design prompt:**
> "Design an Input component for a professional B2B dashboard. Show all 4 types (text, password, search, number) at the default md size, plus all 5 states (default, focus, error, disabled, readonly) for the text input. Show both light and dark mode side by side. Light mode: white background (#ffffff), slate border (#e2e8f0), blue focus ring (#3b82f6 at 20% opacity, 2px ring). Dark mode: dark surface background (#1e293b), slate-700 border, same blue focus ring. Error state: red border (#ef4444), light red ring. Disabled: gray background, muted text, not-allowed cursor. Search type shows magnifying glass icon on left, clear × button on right when text is present. Password type shows eye/eye-off toggle on right. Height 40px (md), 12px horizontal padding, 14px Inter text, 4px border-radius. Vietnamese placeholder text example: 'Nhập tên sản phẩm hoặc mã SKU...' — container must not clip. Annotate with pixel measurements. Style: clean, no decorative borders, subtle shadows only on focus."

---

### Textarea

**Category:** Atom
**File:** `src/components/ui/textarea.tsx`

**Purpose:** Multi-line text entry. Used for descriptions, notes, SQL segment definitions, MJML template content.

**Props:**
- `rows`: number (default: 4)
- `resize`: `none`, `vertical`, `both` (default: `vertical`)
- `state`: `default`, `focus`, `error`, `disabled`
- `maxLength`: number — shows character count indicator

**Dark mode:** Same token approach as Input.

**claude.design prompt:**
> "Design a Textarea component for a B2B dashboard. Show 4 rows default height, vertical-resize-only handle visible. States: default, focus (blue ring), error (red ring + error message below), disabled (gray, locked). Light and dark mode side by side. Character counter appears bottom-right when maxLength is set (e.g., '247 / 500'). Vietnamese example content shown to demonstrate diacritical rendering. Border radius 6px, 12px padding. Same visual language as the Input component."

---

### Select / Dropdown

**Category:** Atom
**File:** `src/components/ui/select.tsx`

**Purpose:** Single-value selection from a predefined list. Used for store platform, currency, status filters, role assignment.

**Built on:** Radix UI Select (`@radix-ui/react-select`).

**Props:**
- `options`: `{ label: string; value: string; disabled?: boolean }[]`
- `placeholder`: string
- `size`: `sm`, `md`, `lg`
- `state`: `default`, `error`, `disabled`
- `searchable`: boolean (shows filter input inside dropdown)

**Dark mode:** Dropdown panel uses `--color-bg-elevated`. Selected item uses primary color highlight.

**i18n:** Option labels rendered via `t()`. Dropdown panel must expand horizontally if Vietnamese options are longer.

**Accessibility:** Full keyboard navigation (arrow keys, Enter, Escape). `aria-expanded`, `aria-haspopup="listbox"`. Selected option has `aria-selected`.

**claude.design prompt:**
> "Design a Select/Dropdown component (single select) for a B2B dashboard. Show: closed state (looks like an Input with a chevron-down icon on right), open state (dropdown panel below with option list), selected state, error state, disabled state. Dropdown panel has max-height 240px with scroll. Hovered option: primary blue background. Selected option: primary blue text + check icon on right. Searchable variant shows a search input at the top of the dropdown. Light and dark mode side by side. Dark dropdown panel: #334155 background, white text, hover: primary-500 bg. Border radius on panel: 8px, shadow-md. Options: 14px, 36px height each, 12px horizontal padding. Vietnamese option text example: 'Đang hoạt động' — options expand width to fit. Annotate measurements."

---

### Checkbox

**Category:** Atom
**File:** `src/components/ui/checkbox.tsx`

**Built on:** Radix UI Checkbox (`@radix-ui/react-checkbox`).

**Purpose:** Boolean toggle in forms. Multi-select in data tables. Permission/setting toggles.

**States:** unchecked, checked, indeterminate (partial selection in table header), disabled, focus.

**Sizes:** `sm` (14px), `md` (16px, default), `lg` (20px)

**Dark mode:** Checked fill uses primary-500. Unchecked border uses `--color-border`.

**Accessibility:** `aria-checked="true/false/mixed"`. Keyboard: Space to toggle.

**claude.design prompt:**
> "Design a Checkbox component for a B2B dashboard. Show all states: unchecked, checked (blue fill + white checkmark), indeterminate (blue fill + white horizontal dash), disabled-unchecked, disabled-checked, focus-visible (blue ring). Show sm/md/lg sizes. Include a FormField variant with label to the right and optional helper text below. Light and dark mode. Checked state: #3b82f6 fill with white SVG checkmark. Transition: 150ms ease for the check appearing. 16px default size, 2px border-radius, 1.5px border. Label: 14px Inter medium, #0f172a light / #f8fafc dark."

---

### Radio Button

**Category:** Atom
**File:** `src/components/ui/radio.tsx`

**Purpose:** Mutually exclusive selection within a group. Used for store platform selection, role assignment, export format.

**States:** unselected, selected, disabled, focus.

**Props:**
- `size`: `sm`, `md`, `lg`
- Typically used inside a `RadioGroup` wrapper.

**Dark mode:** Selected dot uses primary-500.

**claude.design prompt:**
> "Design a Radio Button component for a B2B dashboard. Show a RadioGroup with 3 options: unselected, selected (with blue inner dot), and disabled. Selected state: outer ring in primary-500, inner filled circle 8px primary-500. Show focus-visible ring. Include label to the right of each radio. sm/md/lg sizes. Light and dark mode. 16px outer circle default, 2px border. Transition 150ms for dot appearing. Used in 'Store Platform' selection: WooCommerce / Shopify / Other."

---

### Toggle / Switch

**Category:** Atom
**File:** `src/components/ui/toggle.tsx`

**Purpose:** Binary on/off state. Used for: store active/inactive, product shared/private, feature flags, notification preferences.

**Props:**
- `size`: `sm` (32×18px), `md` (44×24px, default), `lg` (56×30px)
- `checked`, `onCheckedChange`, `disabled`, `loading`

**States:** off, on, disabled, focus.

**Dark mode:** Off state thumb: white. Track off: `--color-secondary-300`. Track on: `--color-primary-500`.

**Accessibility:** Role `switch`. `aria-checked`. Keyboard: Space to toggle.

**claude.design prompt:**
> "Design a Toggle/Switch component for a B2B dashboard. Show sm/md/lg sizes in both off and on states, plus disabled and focus-visible. On state: primary blue (#3b82f6) track, white thumb with drop shadow. Off state: slate-300 track (#cbd5e1 light / #475569 dark), white thumb. Thumb slides with 200ms ease spring animation. Light and dark mode. md size: 44px wide × 24px tall track, 20px thumb diameter. Rounded-full. Show label to the right: 'Hiển thị công khai' (Vietnamese). Loading state: spinner on thumb. Clean, no inner text."

---

### Badge / Tag

**Category:** Atom
**File:** `src/components/ui/badge.tsx`

**Purpose:** Status indicators, category tags, count displays. Used in tables, cards, product variants, order status.

**Props:**
- `variant`: `default`, `primary`, `success`, `warning`, `error`, `info`, `outline`
- `size`: `sm`, `md` (default)
- `dot`: boolean — shows colored dot before text
- `removable`: boolean — shows × button (for filter tags)

**Dark mode:** All variants use semantic color tokens. Background lightens in dark mode for readability.

**i18n:** Label uses `t()`. Min-width not fixed — expands for longer text.

**claude.design prompt:**
> "Design a Badge/Tag component for a B2B dashboard. Show all 7 variants (default/gray, primary/blue, success/green, warning/amber, error/red, info/blue-light, outline) at sm and md sizes. Also show: dot variant (colored dot + text), removable variant (text + × button). Light and dark mode side by side. Badges are pill-shaped (rounded-full), 12px horizontal padding, 4px vertical padding (sm) / 6px (md). Font: 12px (sm) / 13px (md), font-medium. Background: 10% opacity of the semantic color. Text: the semantic color itself at full opacity (so contrast is maintained). Example: success badge = light green bg + dark green text. Dark mode: slightly stronger bg opacity. Removable × button: 14px, muted color, hover: error color."

---

### Avatar

**Category:** Atom
**File:** `src/components/ui/avatar.tsx`

**Purpose:** User identity display. Navigation profile menu, comment authors, assigned-to fields.

**Props:**
- `src`: string (image URL)
- `alt`: string
- `fallback`: string (1–2 initials, shown when image fails or not provided)
- `size`: `xs` (24px), `sm` (32px), `md` (40px, default), `lg` (56px)
- `online`: boolean — green status dot bottom-right

**Dark mode:** Fallback background uses `--color-secondary-200` (light) / `--color-secondary-700` (dark). Initials text adapts.

**Accessibility:** `alt` text describes the person. If decorative, `alt=""`.

**claude.design prompt:**
> "Design an Avatar component for a B2B dashboard. Show all 4 sizes (xs 24px, sm 32px, md 40px, lg 56px) in 3 states: with image (photo), with initials fallback (blue background, white initials), with loading skeleton. Show online status dot variant on md size (green 10px dot, white border, bottom-right corner). Light and dark mode. Initials background: primary-100 light / primary-900 dark. Initials text: primary-700 light / primary-300 dark. Font: Inter semibold. Circular (border-radius 100%). Avatar with image: object-cover. Used in dashboard navbar showing 'NV' for 'Nguyễn Văn'."

---

### Icon

**Category:** Atom
**File:** `src/components/ui/icon.tsx`

**Purpose:** Wrapper around Lucide React icons for consistent sizing and accessibility.

**Props:**
- `name`: Lucide icon name (e.g., `"Store"`, `"Package"`, `"ChevronRight"`)
- `size`: `xs` (12px), `sm` (16px), `md` (20px, default), `lg` (24px), `xl` (32px)
- `aria-hidden`: boolean (default: `true` when decorative)
- `aria-label`: string (required when icon is the only content)

**Note:** Icons inherit text color from parent — always set color via parent's `text-*` class.

**claude.design prompt:**
> "Design an Icon usage guide for a B2B dashboard using Lucide React icons. Show a grid of 16 common icons (Store, Package, ShoppingCart, Users, BarChart2, Settings, Bell, Search, Plus, Edit, Trash2, ChevronRight, ArrowLeft, Check, X, AlertCircle) at all 5 sizes (12/16/20/24/32px). Show icons in primary, secondary-muted, success, error, and warning colors. Light and dark mode. Demonstrate: icon standalone, icon as button prefix, icon in badge (dot replacement). Clean grid layout, 8px gap, labeled with icon name below each."

---

### Spinner / Loader

**Category:** Atom
**File:** `src/components/ui/spinner.tsx`

**Purpose:** Loading state indicator. Used in buttons, full-page loading, table skeleton, API fetch pending states.

**Props:**
- `size`: `xs` (12px), `sm` (16px), `md` (20px, default), `lg` (32px), `xl` (48px)
- `variant`: `default` (primary color), `white` (for dark button backgrounds), `muted` (gray, for subtle loading)
- `label`: string — `aria-label` for screen readers (default: `"Loading..."` / `"Đang tải..."`)

**Animation:** CSS `animate-spin` on an SVG arc. Respects `prefers-reduced-motion`.

**claude.design prompt:**
> "Design a Spinner/Loader component for a B2B dashboard. Show all 5 sizes (12/16/20/32/48px) in 3 color variants: primary blue, white (for colored backgrounds), and gray/muted. Show in context: inside a primary button (white spinner on blue bg), as page-level loading overlay (centered lg spinner + 'Đang tải...' label), as table skeleton (rows of gray shimmer lines). Spinning animation: SVG circle stroke-dasharray arc, 0.8s ease-in-out infinite. Light and dark mode. Reduced motion: static dashed ring instead of spinning."

---

### Divider

**Category:** Atom
**File:** `src/components/ui/divider.tsx`

**Purpose:** Visual separation between sections, menu items, form sections.

**Props:**
- `orientation`: `horizontal` (default), `vertical`
- `label`: string — optional text label centered on divider (for "or" separators in auth forms)
- `spacing`: `sm` (8px), `md` (16px, default), `lg` (24px) — margin around divider

**Dark mode:** Uses `--color-border` token. Label uses `--color-text-muted`.

**claude.design prompt:**
> "Design a Divider component for a B2B dashboard. Show: horizontal divider (full-width 1px line), horizontal with centered text label ('hoặc' / 'or' auth separator with text breaking the line), vertical divider (for toolbar separators). Light mode: #e2e8f0. Dark mode: #334155. Label: 13px muted text, background matches parent (prevents line from showing through text). Show in context: between form sections, inside a toolbar between button groups, in the auth login form as 'or continue with Google' separator."

---

### Tooltip

**Category:** Atom
**File:** `src/components/ui/tooltip.tsx`

**Built on:** Radix UI Tooltip.

**Purpose:** Contextual help for icon-only buttons, truncated text, abbreviated values.

**Props:**
- `content`: string | ReactNode
- `side`: `top` (default), `right`, `bottom`, `left`
- `delay`: number ms (default: 400ms)

**Dark mode:** Tooltip panel uses inverse of current theme (dark tooltip in light mode, light tooltip in dark mode) for maximum contrast.

**Accessibility:** Triggered on focus AND hover. Never blocks content. WCAG requires tooltips to be dismissable with Escape.

**claude.design prompt:**
> "Design a Tooltip component for a B2B dashboard. Show all 4 positions (top, right, bottom, left) with arrow pointer. Content: dark panel (#1e293b) in light mode, light panel (#f1f5f9) in dark mode — inverted from current theme. Text: 13px, max-width 240px, word-wrap. Arrow: 6px equilateral triangle. Padding: 6px 10px. Border-radius: 6px. Fade-in: 150ms, delay 400ms. Show tooltip on an icon-only button ('Sync products' tooltip on sync icon button). Vietnamese text: 'Đồng bộ sản phẩm từ WooCommerce' fits within max-width. Show stacking for multiple tooltips."

---

## MOLECULES

Molecules combine atoms into functional units. They live in `src/components/forms/` or `src/components/ui/`.

---

### Form Field

**Category:** Molecule
**File:** `src/components/forms/form-field.tsx`

**Purpose:** The standard form control wrapper. Combines Label + Input/Select/Textarea + helper text + error message into a consistent unit. Used in every form across the app.

**Props:**
- `label`: string
- `required`: boolean — adds asterisk to label
- `helperText`: string — shown below input (informational)
- `errorMessage`: string — shown below input when error (overrides helperText)
- `children`: ReactNode (the Input/Select/Textarea/etc.)

**i18n:** All strings via `t()`. Error message container must accommodate multi-line Vietnamese error text.

**Accessibility:** Label `htmlFor` linked to input `id`. Error message linked via `aria-describedby`.

**claude.design prompt:**
> "Design a FormField molecule for a B2B dashboard. Show 4 states: default (label + text input), with helper text below (gray, 12px), with error (red error message below + red input border), disabled (label muted, input disabled state). Label: 14px Inter medium, #0f172a light / #f8fafc dark. Required asterisk: red (#ef4444), after label text. Helper text: 12px #64748b. Error: 12px #ef4444 with small alert-circle icon prefix. All states light and dark mode. Vietnamese error example: 'Tên cửa hàng không được để trống' — must wrap neatly to 2 lines without breaking layout. Vertical spacing: 6px between label and input, 4px between input and helper/error."

---

### Search Bar

**Category:** Molecule
**File:** `src/components/forms/search-bar.tsx`

**Purpose:** Filtered search input used in data tables, product catalogs, store selectors.

**Props:**
- `placeholder`: string
- `value`, `onChange`
- `onClear`: handler — shown when value is non-empty
- `loading`: boolean — shows spinner inside input
- `debounceMs`: number (default: 300ms)

**Layout:** Search icon (left) + Input + Clear × button (right, visible when non-empty) + loading spinner (replaces clear when loading).

**claude.design prompt:**
> "Design a SearchBar molecule for a B2B dashboard. Full-width, 40px height, 12px padding, search icon on left (16px lucide Search icon, muted color), text input in center, clear × button on right (appears only when text is present, hover: error-500). Loading state: spinner replaces × button. All states: empty (placeholder shown), typing (× visible), loading (spinner visible). Light and dark mode. Vietnamese placeholder: 'Tìm kiếm sản phẩm, SKU, tên thương hiệu...'. Used at top of data tables. Show in context inside a table toolbar (alongside filter dropdowns and action buttons)."

---

### Pagination

**Category:** Molecule
**File:** `src/components/ui/pagination.tsx`

**Purpose:** Navigate between pages of large data sets. Used in product tables, order lists, customer lists.

**Props:**
- `page`: current page (1-indexed)
- `totalPages`: number
- `pageSize`: number
- `total`: number — total record count
- `onPageChange`: handler
- `onPageSizeChange`: handler

**Layout:** `[< Prev]  [1] [2] ... [5] [6] [7] ... [12]  [Next >]`  + `"Showing 21–40 of 142 results"` summary.

**Mobile:** Shows only Prev/Next + current page number.

**i18n:** Summary text: `"Hiển thị 21–40 trong tổng số 142 kết quả"`.

**claude.design prompt:**
> "Design a Pagination molecule for a B2B dashboard. Show: full desktop layout (prev/next buttons, page number buttons, ellipsis for skipped pages, current page highlighted in primary blue). Mobile layout (condensed: prev/next + 'Trang 3 / 12'). Include rows-per-page selector (20/50/100 options). Page count summary text below or beside pagination. Light and dark mode. Current page button: filled primary blue, white text. Other page buttons: ghost, hover primary bg. Prev/Next: outlined ghost buttons with arrow icons. Disabled prev on page 1, disabled next on last page. Vietnamese summary: 'Hiển thị 21–40 trong tổng số 142 kết quả'. 36px button height, 36px min-width for page numbers."

---

### Breadcrumb

**Category:** Molecule
**File:** `src/components/layout/breadcrumb.tsx`

**Purpose:** Wayfinding. Shows current location in the app hierarchy. Used at top of all dashboard pages.

**Props:**
- `items`: `{ label: string; href?: string }[]` — last item is current page (no href)

**Layout:** `Dashboard / Stores / My Store / Edit`

**i18n:** All labels via `t()`. Vietnamese breadcrumb labels can be significantly longer — ellipsis truncation at `max-w-[160px]` for non-last items on mobile.

**claude.design prompt:**
> "Design a Breadcrumb molecule for a B2B dashboard. Show: 3-level breadcrumb (Dashboard > Cửa hàng > Chỉnh sửa cửa hàng). Separator: '/' or chevron-right icon (16px, muted). Non-active items: muted text, underline on hover, link cursor. Current item: medium weight, non-link. Truncation: items beyond max-width get ellipsis (...) with tooltip on hover showing full text. Light and dark mode. 14px Inter, leading-none. Spacing: 8px between items and separator. Vietnamese example: 'Bảng điều khiển / Sản phẩm / Chi tiết sản phẩm'. Entire breadcrumb wraps gracefully on small screens."

---

### Alert / Notification Banner

**Category:** Molecule
**File:** `src/components/ui/alert.tsx`

**Purpose:** Persistent inline feedback. Used for: sync warnings, validation errors above forms, success after save, info notices about system state.

**Props:**
- `variant`: `success`, `warning`, `error`, `info`
- `title`: string
- `description`: string
- `dismissible`: boolean
- `icon`: ReactNode (defaults to variant icon)
- `action`: `{ label: string; onClick: () => void }` — optional action button

**Dark mode:** Background uses 10% semantic color tint with appropriate dark mode token. Border uses semantic color at 20% opacity.

**claude.design prompt:**
> "Design an Alert/Notification Banner molecule for a B2B dashboard. Show all 4 variants (success/green, warning/amber, error/red, info/blue) with: title, description text (2 lines), leading icon (check-circle, alert-triangle, x-circle, info), optional dismiss × button top-right, optional action button (ghost style). Light mode: very light tinted background (10% semantic color), semantic-colored left border (4px) or border around. Dark mode: darker tint, same border color. Width: full-width of container. Border-radius: 8px. Padding: 16px. Vietnamese description: 'Đồng bộ hoàn tất — 47 sản phẩm đã được cập nhật thành công. 3 sản phẩm bị bỏ qua do lỗi SKU trùng lặp.' Must wrap to multiple lines gracefully."

---

### Toast Notification

**Category:** Molecule
**File:** `src/components/ui/toast.tsx`

**Purpose:** Ephemeral feedback for completed actions. Appears in bottom-right corner, auto-dismisses after 4s.

**Props:**
- `variant`: `success`, `error`, `warning`, `info`
- `title`: string
- `description`: string (optional)
- `duration`: number ms (default: 4000)
- `action`: optional action button

**Behavior:** Stack up to 3 toasts. Slide-in from right (200ms). Fade-out with slight scale-down. Dismiss on × or swipe-right.

**claude.design prompt:**
> "Design a Toast Notification molecule for a B2B dashboard. Show 4 variants (success, error, warning, info) stacked in bottom-right corner. Each toast: 320px wide, rounded-lg, shadow-lg, white background light / #334155 dark. Left colored accent border (4px) matching variant. Icon on left (20px). Title: 14px semibold. Description: 13px muted. Dismiss × button top-right. Stack with 8px gap between toasts. Newest on top. Slide-in animation from right (translateX: 320px → 0, 200ms ease-decelerate). Auto-dismiss progress bar at bottom of card (thin, semantic color, empties over 4s). Vietnamese toast: 'Cập nhật thành công — Giá sản phẩm đã được lưu và đồng bộ tới 3 cửa hàng.'"

---

### Dropdown Menu

**Category:** Molecule
**File:** `src/components/ui/dropdown-menu.tsx`

**Built on:** Radix UI DropdownMenu.

**Purpose:** Contextual action menus. Used for: row actions in tables (Edit/Delete/Sync), navbar user menu, overflow menus.

**Props:**
- `trigger`: ReactNode — the button that opens the menu
- `items`: array of `{ label, icon?, onClick, destructive?, disabled?, separator? }`

**Layout:** Trigger → Panel (below-left aligned by default) with list of items.

**Dark mode:** Panel uses `--color-bg-elevated`. Hover: `--color-secondary-100` light / `--color-secondary-700` dark. Destructive item: red text.

**Accessibility:** Arrow key navigation. Escape closes. `aria-expanded` on trigger.

**claude.design prompt:**
> "Design a Dropdown Menu molecule for a B2B dashboard. Show: closed state (icon-only '...' trigger button), open state (panel with 5 items: 'Chỉnh sửa' with edit icon, 'Đồng bộ' with refresh icon, separator, 'Xem chi tiết' with external-link icon, 'Xóa cửa hàng' with trash icon in red/danger). Panel: 200px min-width, white bg light / #334155 dark, shadow-md, rounded-lg, 8px padding (vertical). Item height: 36px, 12px horizontal padding, 14px text. Icon: 16px, muted color. Destructive item: error-500 text + icon. Hover: subtle bg highlight. Separator: 1px border. Animation: fade-in + scale 0.95→1 (100ms). Light and dark mode."

---

### Navigation Link Item

**Category:** Molecule
**File:** `src/components/layout/nav-link.tsx`

**Purpose:** Individual sidebar and navbar navigation items. Shows active state, icon, label, optional badge.

**Props:**
- `href`: string
- `icon`: ReactNode
- `label`: string
- `active`: boolean
- `badge`: string | number (e.g., unread count)
- `collapsed`: boolean — icon-only mode when sidebar is collapsed

**Dark mode:** Active: primary-500 bg tint + primary text. Inactive: transparent, secondary text. Hover: subtle bg.

**claude.design prompt:**
> "Design a Navigation Link Item molecule for a B2B sidebar. Show: active state (primary blue background tint + primary blue icon + primary blue text, left indicator bar), inactive state (transparent bg, muted icon + text, hover reveals subtle bg), collapsed sidebar state (icon only, tooltip on hover showing label). Badge variant: small badge (red count badge, or gray text count) on the right of the label. 40px height, 12px horizontal padding, 16px gap between icon and label. Icon: 20px Lucide icon. Label: 14px Inter medium. Active indicator: 3px left border primary-500. Light and dark mode. Vietnamese label: 'Quản lý sản phẩm' must fit without overflow in standard sidebar width (240px)."

---

### Card

**Category:** Molecule
**File:** `src/components/ui/card.tsx`

**Purpose:** Container for grouped content. Used for dashboard stats, form sections, detail views, feature highlights.

**Props:**
- `variant`: `default`, `elevated`, `bordered`, `interactive` (hover effect)
- `padding`: `sm`, `md` (default), `lg`
- `header`: ReactNode — optional title bar
- `footer`: ReactNode — optional footer action bar

**Dark mode:** `--color-bg-surface` background. `--color-border` border. Elevated: `shadow-md`.

**claude.design prompt:**
> "Design a Card molecule for a B2B dashboard. Show all 4 variants: default (white bg, 1px border, subtle shadow), elevated (white bg, shadow-md, no border), bordered (white bg, colored primary border top, stronger all-around border), interactive (hover: slight shadow increase + translateY(-1px) lift). Each variant in 3 sizes (sm/md/lg padding). Show Card with header (title + optional action button), body content (text + icon list), footer (primary + ghost buttons). Light and dark mode. Default: #ffffff light / #1e293b dark. Border-radius: 8px. Header: 16px semibold title, separator from body. Vietnamese card title: 'Thống kê tổng quan'. Padding md: 24px."

---

### Data Table Row

**Category:** Molecule
**File:** `src/components/ui/table-row.tsx`

**Purpose:** A single row in a data table. Handles row selection, hover state, action menu trigger.

**Props:**
- `selected`: boolean
- `onClick`: handler — for row click (navigate to detail)
- `actions`: ReactNode — dropdown menu anchor
- `cells`: Cell[] — each with content + optional width

**Dark mode:** Hover: `--color-secondary-100` light / `--color-secondary-800` dark. Selected: primary-50 bg.

**claude.design prompt:**
> "Design a Data Table Row molecule for a B2B dashboard. Show: default row (white/transparent bg), hover state (light blue tint #eff6ff light / #1e3a5f dark), selected row (checkbox checked, stronger blue tint, primary border-left 3px), row with action menu open (row has active tint, '...' button highlighted). Row height: 52px. Columns shown: checkbox (40px), product name + image thumbnail (flex-1), SKU (120px), price (100px), status badge (120px), action button (48px). Cell text: 14px. Vietnamese product name: 'Áo phông in hình cờ Việt Nam size M'. Alternate row shading variant (subtle gray on even rows). Light and dark mode."

---

### Modal / Dialog

**Category:** Molecule
**File:** `src/components/ui/dialog.tsx`

**Built on:** Radix UI Dialog.

**Purpose:** Focused task completion. Used for: confirm delete, create/edit forms, image preview, import progress.

**Props:**
- `open`, `onOpenChange`
- `title`: string
- `description`: string (optional subtitle)
- `size`: `sm` (400px), `md` (560px, default), `lg` (720px), `xl` (960px), `full`
- `footer`: ReactNode — action buttons

**Dark mode:** Overlay: `rgba(0,0,0,0.5)` light / `rgba(0,0,0,0.7)` dark. Panel: `--color-bg-elevated`.

**Accessibility:** Focus trap inside dialog. Escape closes. `aria-labelledby` pointing to title. Scroll within panel, not page.

**claude.design prompt:**
> "Design a Modal/Dialog molecule for a B2B dashboard. Show: overlay (semi-transparent dark backdrop), dialog panel centered with header (title + × close button), scrollable body (with content area that shows scroll indicator when content overflows), footer (primary action button right + cancel ghost button left). Show 3 sizes side-by-side: sm (confirm delete, compact), md (edit store form), lg (import progress with table). Header: 18px semibold title, separator. Footer: separator + 16px padding + buttons right-aligned. Animation: fade-in overlay (150ms) + scale-in dialog (0.96→1, 200ms ease-decelerate). Light and dark mode. Vietnamese title: 'Xác nhận xóa cửa hàng'. Full-screen on mobile."

---

## ORGANISMS

Organisms are full sections of UI. They live in `src/components/layout/` or `src/components/[feature]/`.

---

### Navigation Bar

**Category:** Organism
**File:** `src/components/layout/header.tsx`

**Purpose:** Top application bar, persistent across all dashboard pages. Brand identity, navigation, user actions.

**Content (left to right):**
1. Logo / brand name (mobile: hamburger menu toggle)
2. Current page title or breadcrumb (desktop)
3. Spacer (flex-1)
4. Search (global, optional)
5. Notification bell with unread badge
6. Language switcher (EN | VI)
7. Theme toggle (sun/moon)
8. User avatar + dropdown trigger

**Height:** 64px. Fixed to top. `z-50`.

**Dark mode:** `--color-bg-surface` background. Subtle bottom border `--color-border`.

**claude.design prompt:**
> "Design a full Navigation Bar organism for a professional B2B dashboard. Fixed top, 64px height, full viewport width. Left: compact logo icon (32px) + 'Simple CRM' wordmark in 18px semibold — on mobile this area shows a hamburger menu icon instead. Center (desktop only): current page title '📦 Sản phẩm' in 16px medium. Right group (8px gaps): global search icon button, notification bell (with red badge '3' for unread), language switcher pill (EN | VI toggle), theme toggle icon button (sun/moon animated), user avatar (32px with online dot) that opens user dropdown. Background: white light / #1e293b dark. Bottom border: 1px #e2e8f0 light / #334155 dark. Show hover states on all right-group buttons. Show mobile layout (< 768px): logo + page title + avatar only, hamburger on far left. Light and dark mode full-width mockup."

---

### Sidebar Navigation

**Category:** Organism
**File:** `src/components/layout/sidebar.tsx`

**Purpose:** Primary navigation. Fixed left side, groups features into sections.

**Content:**
- Logo area (links to dashboard)
- Nav sections with labels:
  - **Tổng quan** / Overview: Dashboard
  - **Sản phẩm** / Products: Products, Catalog, Shopify Import
  - **Cửa hàng** / Stores: All Stores, Price Comparison
  - **Đơn hàng** / Orders: Orders, Shipments
  - **Marketing**: Customers, Campaigns, Email Templates
  - **AI & Nội dung** / Content: AI Jobs
  - **Cài đặt** / Settings: Store Credentials, Users & Roles
- Bottom: user avatar mini + name + logout

**Width:** 240px (expanded), 64px (collapsed icon-only). Toggle button on edge.

**claude.design prompt:**
> "Design a full Sidebar Navigation organism for a professional B2B dashboard. 240px width, full viewport height, fixed left. White bg light / #1e293b dark, right border 1px. Top: 64px logo area matching navbar height. Navigation sections with section labels (10px uppercase, muted, 16px top margin). Nav items (40px height, 16px h-padding, 20px icon, 12px gap, 14px label). Active item: primary-500 left 3px indicator, primary-50 bg light / primary-900/20 dark, primary text + icon. Hover: secondary-50 light / secondary-800 dark. Sections: Overview (1 item), Products (3 items), Stores (2 items), Orders (2 items), Marketing (3 items), AI Content (1 item), Settings (2 items). Bottom: pinned user section (avatar 32px + name + role badge + logout icon). Collapsed variant (64px): icon only, section labels hidden, section separators remain, tooltip on hover. Light and dark mode. Vietnamese labels throughout."

---

### Data Table

**Category:** Organism
**File:** `src/components/[feature]/[feature]-table.tsx`

**Purpose:** The primary data display pattern. Used for products, stores, orders, customers, campaigns.

**Content (top to bottom):**
1. Toolbar: SearchBar + Filter dropdowns + Action buttons (Export, Import, Add)
2. Table: thead with sortable column headers + checkbox | tbody with rows | tfoot (optional summary)
3. Pagination

**Features:** Sorting (click header), filtering (per-column dropdowns), row selection (checkbox), bulk actions (appear when rows selected), empty state, loading skeleton.

**Dark mode:** Table head: `--color-bg-surface` tinted. Row hover: subtle. Selected rows: primary tint.

**Accessibility:** `role="table"`. Sortable headers: `aria-sort`. Checkboxes: `aria-label="Select row"`.

**claude.design prompt:**
> "Design a complete Data Table organism for a B2B dashboard showing a product list. Full-page width. Top toolbar: SearchBar (flex-1) + 'Nền tảng' select filter + 'Trạng thái' select filter + divider + 'Nhập' ghost button + 'Xuất' ghost button + 'Thêm sản phẩm' primary button. Table header: sticky, background secondary-50 light / secondary-800 dark, 48px height, columns: checkbox (40px), Tên sản phẩm (flex-1), SKU (120px), Thương hiệu (120px), Giá (100px right-aligned), Trạng thái (120px), Hành động (48px). 5 data rows shown: alternate row shading, hover state, 1 selected row. Empty state: centered illustration + 'Chưa có sản phẩm' + 'Thêm sản phẩm đầu tiên' button. Loading: skeleton rows (3 animated gray bars per row). Bulk action bar (appears when rows selected): 'Đã chọn 3 sản phẩm' + Sync / Export / Delete actions. Bottom: Pagination with page info. Light and dark mode full mockup."

---

### Form (Multi-field)

**Category:** Organism
**File:** `src/components/[feature]/[feature]-form.tsx`

**Purpose:** Data entry for creating/editing entities (stores, products, campaigns). Full validation, loading states, error summary.

**Layout:** Card container with header (title + description) + form body (sections of FormFields) + sticky footer (Cancel + Save buttons).

**Features:** React Hook Form integration. Zod validation. Field-level errors. Form-level error summary at top. Loading state on submit (spinner in Save button). Unsaved changes prompt before navigate-away.

**claude.design prompt:**
> "Design a multi-field Form organism for a B2B dashboard — specifically an 'Add Store' form. Card container (max-w-2xl, centered). Header: 'Thêm cửa hàng mới' (20px semibold) + 'Kết nối cửa hàng WooCommerce hoặc Shopify của bạn' (14px muted). Form body: 2 sections. Section 1 'Thông tin cơ bản': Store Name (full-width), Platform (radio: WooCommerce / Shopify), Domain URL (full-width), Description (textarea, 3 rows). Section 2 'Thông tin xác thực' — appears conditionally when WooCommerce selected: Consumer Key (password input, eye toggle), Consumer Secret (password input, eye toggle). Error summary box at top (red bg, lists all field errors). Submit footer (sticky bottom of card): 'Hủy' ghost button left + 'Lưu cửa hàng' primary button right (loading state: spinner + 'Đang lưu...'). Light and dark mode."

---

### Page Header

**Category:** Organism
**File:** `src/components/layout/page-header.tsx`

**Purpose:** Top section of every dashboard page. Establishes context and primary actions.

**Content:** Breadcrumb (top) + Page title (h1) + Page description (optional) + Action buttons (right-aligned).

**Props:**
- `title`: string
- `description`: string (optional)
- `breadcrumb`: items[]
- `actions`: ReactNode

**claude.design prompt:**
> "Design a Page Header organism for a B2B dashboard. Full content area width. Breadcrumb on top (14px, muted, 'Bảng điều khiển / Sản phẩm'). Title row: H1 title left ('Quản lý sản phẩm', 28px semibold, tight leading) + action buttons right ('Thêm sản phẩm' primary + 'Đồng bộ tất cả' secondary). Description: 14px muted below title ('Quản lý danh mục sản phẩm trên tất cả các cửa hàng kết nối.'). Bottom margin 24px before content. Light and dark mode. Mobile: actions stack below title, full-width."

---

### Empty State

**Category:** Organism
**File:** `src/components/ui/empty-state.tsx`

**Purpose:** Shown when a list or section has no data. Guides the user toward the next action.

**Props:**
- `icon`: ReactNode — large illustrative icon (48px+)
- `title`: string
- `description`: string
- `action`: `{ label: string; onClick: () => void; icon?: ReactNode }` (optional)
- `secondaryAction`: `{ label: string; href: string }` (optional — link to docs/help)

**claude.design prompt:**
> "Design an Empty State organism for a B2B dashboard. Centered vertically and horizontally in content area. Large muted icon (64px, primary-200 color, e.g., Package icon for products). Title: 'Chưa có sản phẩm nào' (20px semibold). Description: 'Kết nối cửa hàng WooCommerce hoặc Shopify để bắt đầu đồng bộ sản phẩm, hoặc thêm sản phẩm thủ công.' (14px muted, max-width 360px, centered). Primary action button: 'Thêm sản phẩm đầu tiên'. Secondary link: 'Xem hướng dẫn kết nối →'. Show both light and dark mode. Vertical spacing: icon → 16px → title → 8px → description → 24px → buttons. Show 3 variants: no-data, no-search-results (with search term shown), no-access (lock icon, different message for PARTNER with no assigned stores)."

---

### Error State

**Category:** Organism
**File:** `src/components/ui/error-state.tsx`

**Purpose:** Full-page or section-level error display. For 404, 500, auth errors, and network failures.

**Props:**
- `type`: `404`, `500`, `auth`, `network`
- `title`: string (optional override)
- `description`: string (optional override)
- `retryAction`: handler (for 500/network)

**claude.design prompt:**
> "Design an Error State organism for a B2B dashboard. Show all 4 variants: 404 (large '404' number in primary-100, 'Trang không tồn tại', 'Trang bạn tìm kiếm không tồn tại hoặc đã bị xóa.', 'Về trang chủ' button), 500 (warning icon, 'Lỗi máy chủ', retry button + 'Liên hệ hỗ trợ' link), auth-error (lock icon, 'Không có quyền truy cập', 'Bạn không có quyền xem trang này.', 'Đăng nhập lại' + 'Về trang chủ'), network-error (wifi-off icon, 'Mất kết nối', 'Kiểm tra kết nối internet và thử lại.', 'Thử lại' retry button). Each variant centered, max-width 400px. Light and dark mode. Same spacing as Empty State."

---

### Auth Form

**Category:** Organism
**File:** `src/components/auth/login-form.tsx`

**Purpose:** Login page. Only auth screen currently needed (no self-registration — admin creates users).

**Content:**
- Logo centered at top
- Title: `"Đăng nhập"` / `"Sign In"`
- Email input + Password input (with show/hide toggle)
- `"Quên mật khẩu?"` link
- Submit button (full-width primary)
- Language toggle (EN | VI) at bottom
- Error alert above form

**claude.design prompt:**
> "Design an Auth Login Form organism for a bilingual B2B dashboard. Centered card on page, max-width 400px, no sidebar/navbar. White card light / #1e293b card dark with shadow-xl. Top: centered logo (48px icon + 'Simple CRM' wordmark). Title: 'Đăng nhập vào hệ thống' (22px semibold, centered). Form: Email field (full-width, with mail icon), Password field (full-width, with lock icon + eye toggle), 'Ghi nhớ đăng nhập' checkbox, 'Quên mật khẩu?' right-aligned link. 'Đăng nhập' primary button (full-width, 44px height). Error alert above form (red banner: 'Email hoặc mật khẩu không đúng'). Bottom: language switcher 'English | Tiếng Việt' centered. Light and dark mode. Show loading state on submit button. Page background: secondary-50 light / secondary-900 dark with subtle grid pattern."

---

### Language Switcher

**Category:** Organism
**File:** `src/components/ui/language-switcher.tsx`

**Purpose:** Switch between EN and VI. Appears in navbar and auth form. Updates locale prefix in URL.

**Props:**
- `locale`: `"en"` | `"vi"` — current locale
- `variant`: `"dropdown"` (navbar) | `"inline"` (auth form)

**Behavior:** Navigates to same page in opposite locale (`/en/dashboard` → `/vi/dashboard`). Preserves scroll position.

**Accessibility:** `lang` attribute communicates language. Button has `aria-label="Switch to Vietnamese"`.

**claude.design prompt:**
> "Design a Language Switcher component in 2 variants. Variant 1 — Dropdown (for navbar): ghost button showing current locale flag emoji + code ('🇺🇸 EN' or '🇻🇳 VI') with chevron-down, opens dropdown with both options (active one has check mark). Variant 2 — Inline (for auth page): pill toggle with 'English' and 'Tiếng Việt' side by side, active gets primary bg + white text, inactive ghost. Both variants light and dark mode. Dropdown: 140px wide, rounded-md, shadow-md. Inline: pill shape, rounded-full, full options visible. Smooth 150ms transition on switch. Show hover states."

---

### Theme Toggle

**Category:** Organism
**File:** `src/components/ui/theme-toggle.tsx`

**Purpose:** Toggle between light and dark mode. Lives in navbar.

**Props:**
- `theme`: `"light"` | `"dark"` | `"system"` — current theme

**Behavior:** Cycles through system → light → dark. Updates `next-themes` and persists preference.

**Animation:** Sun↔Moon icon morphs with 200ms rotation + scale animation.

**claude.design prompt:**
> "Design a Theme Toggle button for a B2B dashboard navbar. Ghost icon button, 36px square, rounded-md. Shows Sun icon in dark mode (click → switch to light), Moon icon in light mode (click → switch to dark). Icon: 18px Lucide Sun/Moon. Animation: on toggle, old icon scales down (0.8) and rotates -180deg while new icon scales up from 0.8 and rotates from 180deg to 0 — both over 200ms ease-standard. Show all 3 states: light mode (moon icon shown), dark mode (sun icon shown), hover (subtle bg). Tooltip: 'Chuyển sang chế độ sáng' / 'Chuyển sang chế độ tối'. Clean, minimal, no border."

---

### User Profile Menu

**Category:** Organism
**File:** `src/components/layout/user-menu.tsx`

**Purpose:** User identity and account actions. Trigger in top-right navbar. Dropdown with profile info and links.

**Content:**
- Trigger: Avatar (32px) + name (desktop only) + chevron-down
- Dropdown panel:
  - User info header: Avatar (48px) + name + email + role badge
  - Divider
  - Menu items: Profile Settings, Notification Preferences, Keyboard Shortcuts
  - Divider
  - Logout (red, with log-out icon)

**claude.design prompt:**
> "Design a User Profile Menu organism for a B2B dashboard navbar. Trigger: 32px avatar + 'Nguyễn Văn A' name (desktop, 14px medium, max-width 120px truncated) + chevron-down icon. Dropdown panel: 240px wide, rounded-lg, shadow-xl, white light / #334155 dark, 8px padding. Header section (non-clickable): 48px avatar + name (16px semibold) + email (12px muted) + role badge ('ADMIN' primary badge). Divider. Menu items (36px each, 12px h-pad): 'Cài đặt cá nhân' + settings icon, 'Thông báo' + bell icon, 'Phím tắt' + keyboard icon. Divider. 'Đăng xuất' + log-out icon in error-500 red. Panel animates: scale 0.95→1 + opacity 0→1 (150ms, origin top-right). Light and dark mode."

---

## Sync Admin Components

<!-- updated: hybrid-integration -->

> These components are used exclusively in the integration admin UI under `/[lang]/admin/sync/`. They are designed to surface the health and history of all 5 integration flows to CRM operators.

---

### SyncStatusBadge

**Category:** Atom
**File:** `src/components/ui/sync-status-badge.tsx`

**Purpose:** Displays the current health status of an integration flow. Used in SyncFlowCard and the sync dashboard summary row.

**Props / Variants:**

| Prop | Values | Notes |
|---|---|---|
| `status` | `ok`, `warning`, `error`, `syncing`, `unknown` | Maps to semantic colors |
| `size` | `sm`, `md` (default) | |
| `showIcon` | boolean (default: `true`) | Prefix icon |
| `showLabel` | boolean (default: `true`) | Text label via `t()` |

**Color mapping:**
- `ok` → success green (`--color-success-500`)
- `warning` → warning amber (`--color-warning-500`)
- `error` → error red (`--color-error-500`)
- `syncing` → primary blue with spinning animation (`--color-primary-500`)
- `unknown` → muted gray (`--color-secondary-400`)

**i18n:** Labels via `sync.status.*` keys. Both EN and VI must render without overflow in the pill.

**Accessibility:** `role="status"`, `aria-label` describes the flow and its status.

**claude.design prompt:**
> "Design a SyncStatusBadge atom for an integration admin dashboard. Show all 5 states: ok (green check-circle icon + 'Bình thường'), warning (amber alert-triangle + 'Cảnh báo'), error (red x-circle + 'Lỗi'), syncing (spinning primary blue loader + 'Đang đồng bộ...'), unknown (gray help-circle + 'Không rõ'). Show sm and md sizes. Pill shape (rounded-full), 10% opacity background of the semantic color, full-opacity semantic text and icon. sm: 12px text, 14px icon, 6px h-pad. md: 13px text, 16px icon, 8px h-pad. Light and dark mode — backgrounds adjust opacity for legibility. Syncing state: icon spins at 1s linear infinite. Vietnamese labels are 20–30% longer than English — min-width must accommodate both. Show in context inside a table row and inside a card header."

---

### ErrorSeverityBadge

**Category:** Atom
**File:** `src/components/ui/error-severity-badge.tsx`

**Purpose:** Displays an error's severity tier. Used in the ErrorReport table and error detail panels.

**Props:**

| Prop | Values |
|---|---|
| `severity` | `CRITICAL`, `WARNING`, `INFO` |
| `size` | `sm`, `md` (default) |

**Color mapping:**
- `CRITICAL` → error red — high contrast, draws the eye
- `WARNING` → warning amber
- `INFO` → secondary muted

**i18n:** Labels via `sync.errors.severity.*` keys.

**Accessibility:** Severity must not be communicated by color alone. Each badge includes a recognizable icon (flame for CRITICAL, alert-triangle for WARNING, info-circle for INFO).

**claude.design prompt:**
> "Design an ErrorSeverityBadge atom for an integration error dashboard. Show 3 variants: CRITICAL (red flame icon + 'Nghiêm trọng', strong red bg 15% opacity, red text), WARNING (amber alert-triangle + 'Cảnh báo', amber bg 15%, amber text), INFO (slate info-circle + 'Thông tin', slate bg 10%, muted text). Pill shape, rounded-full. Font: 13px Inter medium. Icon: 14px. Light and dark mode — same hue but darker bg in dark mode. Show sm (12px, no icon) and md (13px, with icon). Used inside a data table row — must not dominate the row height (fit within 52px rows). Vietnamese 'Nghiêm trọng' is 10+ chars — pill must expand to fit without clipping."

---

### SyncFlowCard

**Category:** Molecule
**File:** `src/components/sync/sync-flow-card.tsx`

**Purpose:** Dashboard card for one integration flow. Shows last run time, status, key metric, and optional action. Five instances of this card appear on the `/admin/sync` dashboard page.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `flowName` | string | Translated flow name |
| `status` | SyncStatus | Current flow health |
| `lastRunAt` | Date \| null | When the flow last ran |
| `metric` | `{ label: string; value: string \| number }` | Key count to display |
| `action` | `{ label: string; onClick: () => void; loading?: boolean }` \| undefined | Optional CTA |
| `description` | string | One-line description of what the flow does |

**Layout:** Card with header (flow name + SyncStatusBadge) + metric display (large number + label) + last run timestamp + optional action button.

**Dark mode:** Uses `--color-bg-surface` card background. Status badge provides color.

**i18n:** All strings via props passed from server with `t()`. Timestamps formatted per locale (VI uses DD/MM/YYYY, EN uses MM/DD/YYYY).

**claude.design prompt:**
> "Design a SyncFlowCard molecule for an integration admin dashboard. Card size: 280px wide, auto height, rounded-lg, white bg light / #1e293b dark, border 1px, shadow-sm. Header: flow name left ('Webhook đơn hàng', 14px semibold) + SyncStatusBadge right. Body: large metric number center (48px semibold primary blue, e.g. '247') + metric label below (13px muted, e.g. 'Đơn hàng hôm nay'). Footer: 'Chạy lần cuối: 2 phút trước' (12px muted, clock icon prefix) + optional action button right ('Đẩy thủ công', ghost sm). Show all 5 status variants on 5 cards in a grid. Show loading skeleton variant (pulsing gray bars). Light and dark mode. Card grid: 3 columns on desktop, 2 on tablet, 1 on mobile."

---

### JobTriggerButton

**Category:** Molecule
**File:** `src/components/sync/job-trigger-button.tsx`

**Purpose:** Button that triggers a manual job with a mandatory confirmation step before execution. Used for the manual product push trigger. Prevents accidental mass operations.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `label` | string | Button text (from `t()`) |
| `confirmTitle` | string | Confirmation modal title |
| `confirmDescription` | string | What will happen + count (e.g. "Push 47 products?") |
| `confirmLabel` | string | Confirm button text |
| `onConfirm` | `() => Promise<void>` | Async action to run after confirmation |
| `variant` | `primary`, `secondary`, `ghost` | Button variant |
| `disabled` | boolean | |
| `size` | `sm`, `md`, `lg` | |

**Behavior flow:**
1. User clicks trigger button
2. Confirmation modal opens showing `confirmTitle` + `confirmDescription`
3. User must click the confirm button (clicking outside or Cancel aborts)
4. `onConfirm()` is called; trigger button shows loading state
5. On resolution: modal closes, success/error toast shown

**i18n:** All strings via props. Confirmation modal must show correct product count from server before rendering.

**Accessibility:** Modal traps focus. Confirm button is NOT the default focused element — Cancel is. This prevents accidental keyboard confirmation.

**claude.design prompt:**
> "Design a JobTriggerButton molecule for a B2B integration admin dashboard. Show 2 states: idle (primary button 'Kích hoạt đẩy thủ công' with play-circle icon left, 40px height) and loading (same button with spinner, disabled, text 'Đang đẩy...'). When clicked, shows a confirmation Dialog: title 'Xác nhận đẩy sản phẩm', description 'Thao tác này sẽ đẩy 47 sản phẩm lên website mới. Hành động này không thể hoàn tác.' (warning icon + amber text for the irreversible note), Cancel ghost button (default focus) + 'Đẩy ngay' danger/primary button. Show the loading state of the confirm button after clicking. Dialog: max-w-md, centered. Light and dark mode. Vietnamese confirmation text must wrap gracefully at max-w-md."

---

### SyncLogTable

**Category:** Organism
**File:** `src/components/sync/sync-log-table.tsx`

**Purpose:** Specialized data table for the order sync log. Extends the base DataTable pattern with a Retry action column and a Payload Viewer modal for debugging.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `logs` | `SyncLog[]` | Page of sync log entries |
| `pagination` | PaginationMeta | Current page + totals |
| `onPageChange` | handler | |
| `onRetry` | `(logId: string) => Promise<void>` | Retry a failed sync |
| `onViewPayload` | `(log: SyncLog) => void` | Opens payload viewer modal |
| `filters` | FilterState | Active status + date filters |
| `onFilterChange` | handler | |

**Columns:** Status badge | WooCommerce Order ID (link) | Processed At | Error message (truncated, full in tooltip) | Actions (Retry for FAILED, View Payload for all)

**Retry behavior:** `onRetry` is called; row shows spinner in place of retry button; on success row status updates inline; on error, toast shown.

**i18n:** All column headers via `sync.orders.columns.*`. Status badges via `sync.orders.status.*`. Both EN and VI column headers tested.

**claude.design prompt:**
> "Design a SyncLogTable organism for an integration admin dashboard. Full-width table. Toolbar: status filter dropdown (All / Pending / Processing / Success / Failed / Skipped) + date range picker + search by order ID. Table columns (52px row height): SyncStatusBadge (80px), WooCommerce Order ID as link (#12345, 120px, primary color, underline on hover), Processed At (timestamp, 160px, 13px muted), Error Message (flex-1, truncated at 40 chars, full text in tooltip on hover), Actions (80px right: 'Thử lại' ghost-danger button for FAILED rows, 'Xem' ghost button for all). 5 rows shown: 2 SUCCESS, 1 FAILED (red error message visible), 1 PENDING (no processedAt, no actions except view), 1 SKIPPED. Empty state: 'Chưa có nhật ký đồng bộ' + filter suggestions. Loading skeleton: 5 pulsing rows. Pagination at bottom. Light and dark mode."
