# Design Brief: NNS Technical Review Hub

## Overview
Institutional Minimalist aesthetic for deep IC governance transparency. Dark-first design (deep obsidian #0D0D0D) with light mode support. Inter typeface. Card-based UI with minimal borders and pill badges.

## Color Palette (OKLCH)
| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|-----------|-------|
| background | 0.13 0 0 | 1.0 0 0 | Page surfaces |
| card | 0.16 0 0 | 1.0 0 0 | Component containers |
| foreground | 0.92 0 0 | 0.25 0 0 | Primary text |
| muted-foreground | 0.6 0 0 | 0.5 0 0 | Secondary text |
| border | 0.25 0 0 | 0.9 0 0 | Subtle dividers |
| accent-adopt | 0.65 0.15 145 | 0.4 0.15 145 | Adopt recommendation |
| accent-reject | 0.6 0.2 25 | 0.5 0.2 25 | Reject recommendation |

## Typography
- Display: Inter 700 (headers, titles)
- Body: Inter 400/500 (content)
- Mono: Menlo/Monaco (principals, URLs)

## Structural Zones
| Zone | Treatment | Purpose |
|------|-----------|---------|
| Header/Nav | Card bg, subtle border | Global navigation context |
| Content | Background surface | Main information area |
| Tables | Zebra striping, sticky headers | Dense data presentation |
| Footer | Muted background, divider | Secondary actions |

## Audit Log Table Design
**Problem:** Details column (forum URLs 80+ chars) overflowed, forced horizontal scroll, action badges lacked visibility.

**Solution:**
- Responsive table layout with percentage-based column widths on lg+ (desktop)
- Details cell: truncates URLs, clickable with "View full" expansion modal
- Action badges: distinct colors (green=add, red=remove, blue=edit, grey=fix) with uppercase labels
- Sticky table headers (z-index 10) — content scrolls beneath
- Zero horizontal overflow — all columns fit viewport width
- Mobile: card-based layout (unchanged, working well)
- Monospace URLs with external link icon on hover

## Component Patterns
- **Badges:** Pill-shaped, uppercase, semantic colors (adopt=green, reject=red)
- **Buttons:** Outlined, subtle fill on hover, monospace text for principals
- **Truncation:** Smart truncation + expand modals for data overflow
- **Links:** Underline on hover, title tooltips for full text

## Motion & Interaction
- Smooth transitions on all interactive elements (0.2s ease)
- Hover effects: text underline, badge background shift
- Expand/collapse animations: fade-in (0.3s)

## Responsive Breakpoints
- Mobile (< 768px): Card layout, full-width inputs, stacked navigation
- Tablet (768px–1023px): Table hybrid, increased padding
- Desktop (≥1024px): Full table layout, optimized column widths

## Dark Mode Enhancements
- Card backgrounds elevated slightly (#141414) to reduce flatness
- Text contrast maintained (E5E5E5 on #0D0D0D achieves WCAG AAA)
- Borders subtle but visible (#222222)
- Badge backgrounds use muted tones, text remains bright

## Constraints
- No horizontal scroll on any breakpoint
- All principals truncated with hover tooltips
- URLs in Details column: max 32 chars visible, expandable
- No generic Bootstrap blue — semantic colors only
- Mobile card layout takes priority over table on small screens

## Implementation Notes for Audit Log Table

### CSS Changes (✅ Complete)
File: `src/frontend/src/index.css`
- Added `.audit-log-table-container` for table wrapper
- Added `.audit-log-table` with sticky headers and semantic column widths
- Added `.audit-action-badge` variants for each action type (add/remove/edit/fix)
- Added `.audit-details-cell` with truncation and expansion styles
- All colors use CSS variables (OKLCH) for theme support

### React Component Changes (Pending in `src/frontend/src/pages/AuditLogPage.tsx`)

#### 1. Imports
- Remove `Badge` component (replaced with semantic divs)
- Remove `ArrowRight` (replaced with `ExternalLink`)
- Add `ExternalLink` from lucide-react

#### 2. Helper Functions
- Add `truncateUrl(url: string, max = 32)` after `truncateTitle`
- Replace `actionBadgeVariant()` with `getActionBadgeClass()` returning CSS class names
- Update `actionLabel()` to return shorter strings: "Edited Link", "Fixed Status"

#### 3. DetailsCell Component
New implementation required:
- Accept `beforeValue` and `afterValue` as arrays or strings
- Truncate all strings to ~32 chars
- Show arrow (→) between before/after values
- Add "View full" / "View all" button for strings > 32 chars
- Expand to show full text in bordered modal
- Detect URLs (startsWith("http")) and make them clickable links
- Show ExternalLink icon on hover for URLs
- Use monospace font for all details content

#### 4. Desktop Table
Replace `<Table>` shadcn component with semantic `<table>` element:
- Use `<thead>`, `<tbody>`, `<tr>`, `<td>`, `<th>` tags
- Apply class `audit-log-table` to `<table>`
- Rows: `className={index % 2 === 0 ? "table-row-even" : "table-row-odd"}`
- Action column: `<div className={getActionBadgeClass(...)}>...</div>`
- Details column: `<DetailsCell entry={entry} />`

#### 5. Mobile Card Layout
- Replace Badge component with semantic div using `getActionBadgeClass()`
- Keep card structure identical otherwise
- DetailsCell component works for mobile too

### Testing Recommendations
1. Desktop: Table width fills container, no horizontal scroll
2. Sticky: Header stays visible scrolling down rows
3. URLs: Truncate at ~32 chars, clickable, expand to full text
4. Badges: Green (add), red (remove), blue (edit), grey (fix) — uppercase text
5. Mobile: Card layout renders correctly with new badge styling
6. Themes: Both dark/light modes readable with proper contrast
7. Performance: No additional API calls, all truncation client-side
