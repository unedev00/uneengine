# UNE Engine web UI — deep audit & recommendations

**Date:** 29 October 2026  
**Based on:** design system, workspace shell, and desktop UI audits (28 Oct 2026)

This is a product-level UI review: what works, what’s hurting users, and what to change first.

## 1. What’s already strong

| Area | Strength |
| ---- | -------- |
| Design tokens | Shared `--md-*` system (color, type, space, radius, control height) in `design-system.css` |
| Focus / a11y hooks | Focus rings, reduced-motion, forced-colors, scroll regions |
| Phone vocabulary | Separate iOS-like tokens under 599px (44px controls, larger body type) |
| App vs platform split | Setup shell, Records, and installed apps are separated; mobile sheets exist |
| Density mode | `desktopDense.css` deliberately shrinks chrome on fine-pointer desktops |

You are not starting from zero. The problems are consistency of application, information density, and task clarity — not a missing design language.

## 2. Core UX problems (cross-cutting)

### A. “Salesforce-like density” vs readable work

`desktopDense.css` previously set body text to 11px and some tokens to 10px on desktop. That fights productivity:

* Hard to scan long metadata tables (Flows, Named Credentials, Permission matrices)
* Small targets on “dense” rows (even when height is large from wrapping)
* Inconsistent with the base system (`--md-fs-body: 14px` before density)

**Recommendation:** Treat density as optional (user preference: Comfortable / Compact), not global. Defaults:

* Body ≥ 13px, table cells ≥ 12–13px
* Compact mode only for power users who opt in

**Status (this PR):** Raised floors in `desktopDense.css` (body 13px, sm 12px, no 10px interactive text). Full Comfortable/Compact preference toggle is a follow-up.

### B. Tables are the main UI bottleneck

Repeated pattern: many columns → horizontal scroll → status/actions off-screen.

**UI pattern to standardize:**

1. Primary columns only (name, status, updated) in the main table
2. Sticky first column + sticky actions
3. Row drawer / side panel for secondary fields (IDs, timestamps, JSON-ish detail)
4. One primary row action visible; rest in a ⋯ menu

Apply this once as a shared MetadataTable / RecordsTable contract and reuse everywhere (Setup, Flows, Credentials, Object Manager).

### C. Loading, empty, and error states are blurred

Examples from the audit:

* “No accessible records” (empty vs permission-denied)
* AppExchange “Installed apps 0” then 6
* Create dashboard enabled but no effect
* Account New → “Invalid record ID”

**Recommendation — three explicit states everywhere:**

| State | UI |
| ----- | -- |
| Loading | Skeleton or spinner; no fake zeros |
| Empty | Plain language + one primary CTA |
| Denied | Name the permission; link to who can grant it |
| Error | Message + Retry / Back |

Never show a live count of 0 until the query finishes.

### D. Navigation labels vs destinations

* Webhook Endpoints → Named Credentials
* Sharing Rules breadcrumb “Setup / Users”
* Generic RBAC intro copy on every security page
* Ace Assist header: “Live tenant Objects · OneEngine Flows”

**Recommendation:** Every nav item must pass a label = destination check. Page H1 + breadcrumb must name the selected view, not a parent bucket.

### E. Forms and drafts

Inline editors (tenant, role, quotation) drop actions below the fold; drafts appear in lists without clear Discard; zero-value line items look “ready to save.”

**Recommendation:** Prefer modal or right drawer for create/edit with:

* Sticky footer: Cancel | Save
* Explicit draft badge
* Required fields marked; Save disabled until minimum valid

## 3. Priority roadmap

### P0 — Broken or trust-breaking (fix first)

| Item | Change |
| ---- | ------ |
| Account (and object) New route | Fix layout/ID; error with Retry/Back |
| Manage Users (CRUD) | Fix route/chunk; never infinite “Loading object metadata…” |
| Dashboard “Create” | Open create flow or disable with reason |
| Auth return URL | `/mail-admin` (and any deep link) must return after login |
| Login contrast + spacing | Sign-in button ≥ 4.5:1; gap between Show password and Forgot password |

### P1 — Daily productivity

| Item | Change |
| ---- | ------ |
| Metadata tables | Responsive column set + row drawer + sticky actions |
| Typography defaults | Raise dense mode floors; optional Compact preference |
| Empty vs denied | Distinct copy and CTAs |
| Ace Assist context | Hide “Week of” off calendar; remove engine jargon from business headers |
| Unnamed / zero drafts | Don’t preselect “Unnamed”; block Save on invalid docs |

### P2 — Polish & cohesion

| Item | Change |
| ---- | ------ |
| Setup sidebar | No mid-word wrap; tooltips when collapsed; dedupe Home shortcuts |
| RBAC pages | Unique intro + correct breadcrumbs per page |
| Branding | Logo upload in Branding, or remove the dead “No logo” state |
| Mobile & Offline | Object/record pickers, not raw API names/UUIDs |
| Page navigation load | Keep previous page visible; optional subtle top progress bar |

### P3 — Differentiation

| Item | Change |
| ---- | ------ |
| App launcher | Prefer icon grid / searchable launcher over a header `<select>` on desktop |
| Visual hierarchy | One primary button per view; secondary as outline/ghost |
| Dark mode | If Records supports dark, formalize tokens so Setup/Ace Assist match |
| Motion | Short transitions on drawers/panels only; respect prefers-reduced-motion |

## 4. Design-system recommendations

1. **Single source of truth** — Prefer `--md-*` everywhere; reduce parallel `.lightning` / `.one-ui` overrides that fight density.
2. **Component inventory** — Document and enforce: Button (primary/secondary/danger), Table, EmptyState, ErrorState, Drawer, PageHeader (eyebrow + title + actions).
3. **Spacing scale** — Stick to 4/8/12/16/24; avoid one-off padding that makes Setup cards uneven.
4. **Type scale for product UI**
   - Page title: 20–24px
   - Section: 16px
   - Body: 13–14px
   - Meta/helper: 12px
   - Avoid 10px for any interactive or tabular content
5. **Contrast** — Formal pass on primary buttons, links on soft surfaces, and dark Records themes.

## 5. Suggested delivery order

| Sprint | Focus |
| ------ | ----- |
| 1 — Trust | Broken create/list routes, login return URL, login contrast/spacing, empty vs error states; **density floors (this PR)** |
| 2 — Tables | Shared responsive table + drawer; apply to Named Credentials, Flows, Object Manager |
| 3 — Density & type | User preference Comfortable (default) / Compact; Setup sidebar labels |
| 4 — App UX | Ace Assist header/filters, form validation before Save, pickers instead of API/UUID fields |
| 5 — Shell | App launcher upgrade, RBAC copy, Branding logo control, page-nav loading polish |

## 6. What not to do

* Don’t add more one-off CSS files for each page; extend tokens and shared components.
* Don’t shrink type further to “fit more columns”; reduce columns instead.
* Don’t show platform/engine language in end-user apps.
* Don’t enable primary actions that no-op.

## Bottom line

Highest-leverage UI work:

1. Fix broken create/list/auth return paths
2. One table + empty/error pattern used everywhere
3. Readable default type (optional compact)
4. Task-oriented labels (nav, headers, Ace Assist)
5. Forms that only save when valid, with clear draft/cancel

See also: [UNE_FULL_DESKTOP_UI_UX_AUDIT_2026-10-28.md](./UNE_FULL_DESKTOP_UI_UX_AUDIT_2026-10-28.md)
