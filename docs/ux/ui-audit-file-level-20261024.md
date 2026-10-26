# MetaDrive UI file-level audit — reconciliation and implementation

Source: user-supplied **MetaDrive UI Audit Report — File-Level Fix Guide** (code-only audit; no authenticated screenshots). This status is not a claim of complete UI acceptance.

## 1. Shared design system (P1/P2)
- **Implemented here:** use the existing `design-system.css` colour/type/spacing tokens; raise the smallest core text token to 12px; add missing soft-surface and text-muted aliases.
- **Implemented here:** replace all six cited legacy Core workspace colours with semantic design tokens (354 legacy literal occurrences).
- **Requires browser validation:** light/dark, tenant accents and high contrast. Other colours used intentionally by product surfaces must not be flattened indiscriminately.

## 2. Workspace shell (P0/P1/P2)
- **Implemented here:** 320px minimum canvas, token-sized toolbar icons, menu, object controls, quick search and quick actions; notification panel viewport bounds; semantic focus rings, coarse-pointer minima and reduced-motion rules.
- **Requires browser validation:** 320/390/768/1024 widths, overlays, zoom and branded variants. The code change alone cannot establish no horizontal overflow.

## 3. Shared One component base (P0/P1/P2)
- **Implemented here:** control/tab sizes 40px (desktop) / 44px (coarse pointer), semantic token bridge, readable compact text, focus indicators and reduced-motion control.
- **Compatibility:** keep shared base for surviving One components and existing published placements; do **not** resurrect components retired in PR #981 or migrate app screens to UNE here.

## 4. Records list/cards (P0/P1)
- **Implemented here:** control tokens and coarse-pointer hit targets, card field labels at least 12px, card body restricted to up to three metadata-labelled fields (plus record title). Retain current permission-filtered field source.
- **Coordination:** PR #984 is modifying the phone Records UI independently; verify both branches together before merging. Keep 1–4-field iOS phone row behavior of PR #984 separate from the standard card acceptance rule.

## 5. Page and Flow Builders (P0)
- **Implemented here:** Page Builder header and resize-handle sizes, palette add/favourite hit areas, inspector controls and focus rings.
- **Already present on inspected main:** Page Builder's labelled `Add … to canvas` button is a click/tap alternative to drag; component selection supports keyboard activation; tablet properties panel has responsive-open class. Flow Builder has responsive panel work from PR #898/#899.
- **Requires interaction validation:** select → inspect → edit → save/reopen, tablet portrait slide-over and focus restoration, pointer resize versus scrolling, Flow Builder tap-to-add.

## 6. Legacy component file map
- PR #981 retires numerous legacy One implementations. Apply the report's accessibility requirements to current shared One base and active page/record runtimes. Treat removed OneTable/OneRecordForm/OneNavigation and similar implementation filenames as **superseded**, not tasks to reintroduce retired modules.
- **Implemented here:** existing OneCalendar day cells are at least 44px, narrow grids scroll horizontally and month/day controls have screen-reader labels. **Requires browser validation:** focus traps/Escape, sticky form actions with virtual keyboard, conversation composer targets and accessible menus. Some are already implemented; presence is not end-to-end proof.

## 7. Other Core surfaces
- **Implemented here:** installed app menu focus/accessibility and 320px constraints, standalone runtime tokens and touch/keyboard targets, Flow reference picker focus.
- **Previously implemented:** Company Settings, App Manager and setup visual updates in merged PRs #617/#898/#899.
- **Requires validation:** standalone published tenant pages must retain intended metadata styles; no global tenant-page restyling is authorised.

## 8. Behavioural acceptance and security
- **Must validate with authorised tenant sessions:** phone navigation labels/More/Back, Page/Flow Builder additive paths and properties, record empty/loading/error/no-permission states, keyboard-visible Save/Cancel, destructive confirmation with Cancel, permission-aware menus and no inaccessible destinations.
- **No scope change here:** app installation, server RBAC, SQL seeders, Flows, user metadata, existing pages and customer records are unchanged.

## 9. Automated evidence
- Extend `scripts/check-ui-design-tokens.mjs` with explicit legacy palette, 320px, control/touch, Records field count, builder resize/action and tap-to-add contracts.
- Existing CI `frontend-visual-contract` should be run on the exact PR head. Browser screenshots are evidence for visual surfaces only; real tenant data and native devices still need acceptance testing.

## 10. Exit gate
**Not audit-ready until** all supplied acceptance criteria pass with evidence: viewports 320/390/768/1024, no essential hover-only action, 44px touch, visible focus, builder select/inspect/save on tablet portrait, Records phone card mode, Core token dominance and no published-page visual regression.

**Parallel PR collision:** #984 changes `design-system.css`, `styles.css`, `recordsListToolbar.css` and `recordWorkspaceViews.tsx`; merge/rebase coordination is required and neither branch should silently overwrite the other.
