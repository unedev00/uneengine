# UNE Solutions — Consolidated Desktop UI/UX Audit

**Audit date:** 28 October 2026

**Scope:** Accessible non-Page-Builder routes and workflows reviewed in the signed-in workspace, plus the `/mail` and `/mail-admin` entry points. Page Builder is excluded as requested.

**Viewports:** Login and Mail pages were checked at 1365 × 768 CSS pixels. The existing Ace Assist browser page reported 1517 × 853 CSS pixels. Browser zoom itself was not independently verified.

**Related detailed audit:** [Setup page-by-page findings](./UNE_SETUP_DESKTOP_UI_UX_AUDIT_2026-10-28.md)

## Executive summary

The audit found a mix of functional failures, confusing context, and visual consistency issues across Setup, Records, Ace Assist, and authentication entry points. The most actionable findings are:

1. The Records Account create route fails with “Unable to load creation layout: Invalid record ID.”
2. The `/mail-admin` route redirects to the generic workspace sign-in page, whose branding and instructions do not identify the Mail Admin destination.
3. The workspace sign-in page’s Show/Hide password and Forgot password controls have no visual gap, making their labels run together. Its blue Sign in button also measures **4.02:1** white-text contrast, below the **4.5:1** WCAG AA threshold for normal-size text.
4. Ace Assist shows a calendar-specific “Week of” control on Customer, Quotation, Invoice, and CashLedger pages. Quote/invoice forms also preselect an “Unnamed record” and start with a blank zero-value line.
5. Mail Admin's “Back to workspace” action returns to the public site homepage rather than the signed-in workspace.
6. Setup has a broken Manage Users route and several dense, over-wide tables, inconsistent labels, and ambiguous disabled actions.

The findings are based on the visible states and interactions described below. No settings, records, invoices, or quotations were saved.

## Coverage and limits

| Surface | Coverage in this audit | Result / limit |
|---|---|---|
| Workspace sign-in (`/login`) | Sign-in layout, password visibility toggle, recovery entry/return, field/button styling | Password visibility and recovery view work. The user-provided support account was used to reach Mail Admin; no mailbox credentials were submitted. |
| Mail sign-in (`/mail`) | Form layout, labels, fields, primary action, Mail administration link | Mailbox sign-in screen reviewed; no mailbox credentials were submitted. |
| Mail administration (`/mail-admin`) | Signed-out redirect, post-login destination, mailbox table, domain guidance, Create/Edit/Reset-password forms | Login redirected to the generic workspace home rather than returning to Mail Admin; revisiting `/mail-admin` after sign-in opened the mailbox administration page. Forms were canceled without saving. |
| Setup | 24 Setup sidebar entries except Page Builder, Flow Trigger Explorer, and a sample Object Manager detail page | Detailed page notes and all previously recorded Setup findings are in the [Setup audit](./UNE_SETUP_DESKTOP_UI_UX_AUDIT_2026-10-28.md). Named Devices was permission-blocked; Manage Users (CRUD) fails to render. |
| Records | Account list and Account New action | New action reaches a broken creation route. Other object-specific creation routes were not exhaustively tested. |
| Ace Assist | Home, Calendar, Customer, Quotation, Invoice, CashLedger; New Appointment and create dialogs for Customer, Quotation, and Invoice | Forms were opened and canceled. No save action was used. Other installed apps and all object-specific record details were not exhaustively visited. |
| Accessibility | Visible typography and selected foreground/background pairs | The workspace Sign in button contrast was measured. This is not a full WCAG, keyboard, screen-reader, mobile, or tablet conformance audit. |

This is the broadest review supported by the available browser session, not a claim that every route, permission state, app, or responsive layout in the product has been exhaustively verified.

## Prioritized findings

| ID | Priority | Page / workflow | Finding and evidence | Recommended correction |
|---|---|---|---|---|
| F-01 | P1 | Records → Account → New | The Account New action leads to “Unable to load creation layout: Invalid record ID” instead of a usable form. | Repair the create route/layout identity and show an actionable error with Retry/Back if loading still fails. Add a smoke test for the Account New action. |
| F-02 | P1 | Setup → Users & Assignments → Manage Users (CRUD) | The route fails while loading object metadata; the prior browser run also reported a missing workspace asset and a `createRecordWorkspaceViews` TypeError. | Repair the route dependency and provide a stable error/retry state instead of an indefinite loading message. |
| F-03 | P1 | Setup → Dashboard Builder | “Create dashboard” appeared enabled but clicking it produced no visible change; related controls remained disabled without explaining why. | Make the action open the create flow, or disable it with a clear prerequisite/permission explanation. Show progress or failure feedback. |
| F-04 | P1 | Setup → Named Credentials | The 11-column table measured about 1802px wide at a 1365px viewport; essential status and row actions require horizontal scrolling. | Keep identity/status/actions visible, use responsive columns or a row-details drawer, and avoid hiding primary row actions offscreen. |
| F-05 | P1 | Setup → Flows; Flow History | The Flow Builder split view leaves a dense table too narrow. Names, types, timestamps, statuses, and IDs wrap into tall rows or disappear offscreen. Flow History rows measured about 84px high with 10px text. | Give the list more width; move long details into a row inspector; truncate long values accessibly; keep status/date columns readable. |
| F-06 | P2 | `/login` | At 1365 × 768, Show/Hide password and Forgot password controls meet with **0px gap**: the second control starts exactly where the first ends. The screenshot renders the labels together (for example, “Show passwordForgot password?”). | Add a deliberate horizontal gap or place the actions in separate aligned regions. Preserve adequate touch targets and visible focus states. |
| F-07 | P2 | `/login` | The Sign in button uses white text on `rgb(0, 122, 255)`; measured contrast is **4.02:1**, below 4.5:1 for normal-size 14px text. Sampled form labels and links pass the same text-contrast threshold. | Darken the button background or use a compliant text color, then verify the exact rendered pair at the final state. |
| F-08 | P2 | `/mail-admin` → `/login` | Signed-out direct navigation redirects to the generic “UNEENGINE WORKSPACE” sign-in page, whose supporting text describes metadata/workflows rather than Mail Admin. After successful sign-in, the browser landed at `/une/setup/home` instead of returning to `/mail-admin`; Mail Admin opened only after manually revisiting its URL. | Preserve and restore the requested destination after authentication. Make the sign-in context clear (“Sign in to Mail Administration”) and provide a clear way back to Mail. |
| F-09 | P2 | `/mail` | The mailbox sign-in form has no password-visibility control or recovery/help path. The page asks for mailbox credentials but provides no next step if they are forgotten. | Add a show-password control and an explicit recovery/admin-support path, or explain where mailbox credentials are managed. |
| F-10 | P2 | Ace Assist → Customer, Quotation, Invoice, CashLedger | A “Week of” date field remains visible in the shared page header on non-calendar pages. It has no clear purpose on these lists and competes with the page title. | Show the date selector only on Calendar/Appointment views, or relabel and explain a genuinely app-wide date filter. |
| F-11 | P2 | Ace Assist → Appointment, Quotation, Invoice, CashLedger | Empty states displayed “No accessible records.” This does not distinguish an empty list from a permissions problem. The Customer page instead loaded an “Unnamed customer” entry after its initial state. | Use distinct loading, empty, and access-denied states. For empty lists, explain that there are no records and offer the relevant New action; for denied access, name the needed permission. |
| F-12 | P2 | Ace Assist → Customer; New Appointment; New Quotation; New Invoice | The visible customer is “Unnamed customer” / “Unnamed record,” and quotation/invoice creation preselects it. This can lead users to associate a financial document or appointment with an unidentified customer. | Do not silently select an unnamed record. Require an explicit customer choice or label incomplete records clearly and prevent them from being selected without confirmation. |
| F-13 | P2 | Ace Assist → New Quotation / New Invoice | Both document forms start with a blank Item 1, Qty 1, Unit price 0, and a 0.00 total; the customer defaults to “Unnamed record.” “Save Quotation/Invoice” appears available in the empty draft, and there are no visible required markers in the form snapshot. Save-time validation was not tested. | Identify required customer/item fields, explain whether zero-value lines are allowed, and disable Save until minimum valid content is present. Replace “verified when saved by OneEngine” with user-facing guidance about automatic totals and validation. |
| F-14 | P2 | Setup → Tenant Management; Roles | New tenant opens an inline detail-pane editor whose lower fields and action extend below the fold. New Role creates a generated draft in the list without a prominent draft/discard state. | Use a clearly announced modal/drawer or structured editor with visible Cancel/Discard and a sticky primary-action footer. |
| F-15 | P2 | Setup → RBAC pages | Users, Roles, Groups, Profiles, Permission Sets, Permission Set Groups, Sharing Settings, and Sharing Rules reuse generic introductory copy. Sharing Rules also shows a Users breadcrumb. | Use page-specific headings, breadcrumbs, and descriptions while retaining consistent RBAC navigation. |
| F-16 | P2 | Setup → Company Settings → Branding | The observed view says “No logo” but the available details editor has no logo upload/replace action. | Add a dedicated logo control with requirements, preview, and save/cancel feedback, or clarify where branding is managed. |
| F-17 | P2 | Setup → Company Settings → Mobile & Offline | Users enter Object API names and record UUIDs manually; the empty state says 0 of 100 records selected, and Save selections is still visible. | Provide object and record pickers, selected counts, validation, and a clear disabled/save state. |
| F-18 | P2 | Setup → Sharing Rules | Empty-state copy invites users to create a rule, but New Sharing Rule is disabled without a reason. | Explain the missing permission/prerequisite beside the action or enable it when the empty state offers creation. |
| F-19 | P2 | Setup → Reports | The route suggests a selected report but shows an empty list; the empty state has two New Report buttons. The chooser groups the long object list under “Other Reports.” | Use a neutral report index/new state, one primary CTA, meaningful report-type categories, and clear Save/Save & Run prerequisites. |
| F-20 | P2 | Setup → Object Manager; Permission Sets; Sharing Settings; Flow History | Sampled metadata tables use 10px header/cell text; Sharing Settings rows were about 76px high, and dense permission matrices require substantial scrolling. | Increase table typography to a comfortable desktop size, reduce repeated padding, keep headers/context visible, and move secondary identifiers into compact secondary text. |
| F-21 | P2 | Ace Assist → shared header | “Live tenant Objects · OneEngine Flows” exposes implementation language rather than user value. The same copy appears on the inspected Customer, Quotation, and Invoice pages. | Replace with task-oriented context or remove it from the business UI. |
| F-22 | P3 | Ace Assist → New Customer | The Name field appears after account/status/address/number/email/reminder fields. Reminder options use technical labels such as “Email Reminders Opt In.” | Put the customer’s primary identity fields first; group addresses and reminder preferences separately and use plain-language labels. |
| F-23 | P2 | Setup → Webhook Endpoints | Selecting this item opened the Named Credentials route and heading/table rather than a webhook-specific destination. | Provide a dedicated webhook view or remove/rename the duplicate navigation item so its label matches the destination. |
| F-24 | P2 | Setup → Named Devices | The signed-in account received “Named Devices requires Read access in your Profile or Permission Set”; the protected view could not be audited. | Provide a persistent inline permission explanation and an appropriate request path instead of relying only on a transient toast. |
| F-25 | P2 | Setup → AppExchange | The Installed apps count briefly showed 0 while metadata was loading and then changed to 6. | Keep the count in a loading state until the query completes to avoid a misleading temporary zero. |
| F-26 | P3 | Setup sidebar; Setup Home | Sidebar labels break at awkward word fragments, and Object Manager, Flows, and Permission Sets are duplicated between Common setup tools and Quick access. | Widen the label area/prevent mid-word wrapping and remove or differentiate the duplicated shortcut groups. |
| F-27 | P3 | Setup → Company Settings → Contacts; Scheduled Flows | Contacts content retains a “Company details” heading; Scheduled Flows is selected while the page heading says “Automation Explorer.” | Use a view-specific heading and breadcrumb while keeping a broader parent label only where it adds context. |
| F-28 | P2 | Mail Admin → Create mailbox; Edit; Reset password | Each action expands an inline form within the page rather than opening a focused dialog. The Create mailbox form is inserted between the mailbox summary and table, pushes the table below the fold, and has no separate form heading. | Use a clearly titled drawer/dialog with Cancel and a visible primary action, or visually separate and announce the inline form while keeping the list context and actions clear. |
| F-29 | P2 | Mail Admin → Back to workspace | Clicking Back to workspace navigated to the public homepage (`/`) rather than the signed-in workspace. | Route to the authenticated workspace landing page and preserve the signed-in session. |

## Page and interaction notes

### Mail and authentication

- `/mail` renders a distinct MetaDrive Mail login with Email address, Password, Sign in, and Mail administration. At the measured 1365 × 768 CSS viewport, its inputs and button were 44px high and about 353px wide; sampled text styles were 13px. The button foreground/background pair (`#FFFFFF` on `#0B57D0`) measured 6.39:1 and passed the normal-text contrast threshold.
- `/mail-admin` redirected to `/login` while signed out. After the support account authenticated, the app landed on Setup Home rather than restoring the requested Mail Admin destination. Revisiting `/mail-admin` opened the authenticated mailbox management page.
- From Mail Admin, the Back to workspace button navigated to the public root homepage rather than the signed-in workspace; this was verified by the resulting `/` URL.
- Mail Admin shows the verified `unesolutions.co.uk` domain and explains that TXT ownership verification does not configure MX or email authentication records. The mailbox table exposes email, description, storage, created date, and per-row Edit/Reset password/Delete actions. The page extends beyond the 768px viewport; only the first three of five mailbox rows were visible in the initial viewport.
- Create mailbox, Edit, and Reset password open inline forms and were canceled. Reset password guidance explains the 12-character minimum and a possible Docker Mailserver limitation; no reset, create, edit, or delete action was submitted.
- The generic workspace form itself has a functioning Show/Hide password toggle and Forgot password flow; the recovery view gives an MFA reminder and Return to sign in action.
- Direct navigation to `/mail-admin` logged two 401 resource responses and an aborted federation-completion request in browser events. These were not exposed as a user-facing error in the sign-in form, so they are recorded as diagnostic context rather than a separate confirmed UX finding.
- Contrast calculations used the observed rendered colors and the WCAG relative-luminance formula. Only the sampled login colors were measured; this does not establish full-product contrast conformance.

### Records and app workflows

- The Account list’s New action fails before a record form loads. Treat this as a functional blocker, not only a visual defect.
- In the inspected Ace Assist pages, forms opened after explicit New actions; the user was not dropped into an unsolicited create form on entry. Appointment, Customer, Quotation, and Invoice forms were canceled without saving.
- The Appointment dialog includes an unexplained disabled Time slot until other choices are made. Add concise helper text that tells users which prerequisite enables it.
- The Customer create form is a centered dialog and has Cancel/Save. The visible fields were Account, Active, Billing Address, Customer Number, Email, Email Reminders Opt In, Name, Phone, Shipping Address, and WhatsApp Reminders Opt In; the ordering and technical labels are the concerns in F-22.
- Quote and invoice forms prepopulate the issue date and a zero-value line. No save was attempted, so server-side validation and whether zero-value documents are allowed remain unverified.

### Setup

The earlier Setup audit contains the detailed page-by-page observations for Setup Home, Tenant Management, Company Settings sections, Object Manager, App Manager/AppExchange, credentials/webhooks/devices, Flows, Reports, Dashboard Builder, and RBAC. It also records which forms were opened and canceled. Page Builder remains excluded.

## Actions taken and data safety

- Forms were opened only to inspect their layout and then canceled/closed.
- No record, tenant, role, setting, invoice, or quotation was saved.
- The user-provided support account was used to inspect the authenticated Mail Admin page. No mailbox credentials were submitted.
- Page Builder was not inspected.

## Source disposition in the fix branch

The findings above were observed in the live deployment. A follow-up check against the clean `origin/main` source found that several Setup issues had already been corrected upstream; those were not duplicated in this change.

| Findings | Disposition |
|---|---|
| F-06–F-09 | Fixed in this branch: login action spacing and contrast, Mail Admin sign-in context and return path, mailbox password visibility and recovery guidance. |
| F-10–F-13, F-21–F-22 | Fixed in this branch: Calendar-only date selection, clearer Ace Assist empty states and document requirements, named-customer selection, user-facing document guidance, and customer form ordering/labels. |
| F-14, F-28–F-29 | Fixed in this branch: Tenant and Role creation now use focused dialogs; Mail Admin domain/mailbox action forms use accessible dialogs; Back to workspace returns to Setup. |
| F-03–F-05, F-15–F-20, F-23–F-27 | Already addressed in the current source: dashboard action feedback, compact Named Credentials and Flow tables, page-specific RBAC copy, branding upload, record pickers for offline settings, sharing-rule prerequisites, report empty state, table typography, webhook routing, Named Devices access explanation, loading states, Setup navigation, and section headings. |
| F-01–F-02 | Not independently verified against a live API. The current source uses the create-layout endpoint and lazy-loaded record workspace, but the local UI test environment has no backend to reproduce the original Account and Manage Users routes. These findings are not claimed as resolved by this branch. |

The local production build passed. Authentication and metadata tests passed, including the field-security utility test. Browser checks used mocked local API responses only: the Mail Admin sign-in returned to `/mail-admin`, all four Mail Admin dialogs opened and canceled without saving, the Mail password toggle changed the input to visible text, and the workspace login actions rendered with a 12px gap and a darker sign-in background. No production service or records were changed.

## Remaining verification

To claim an exhaustive product-wide audit, the remaining work is to inspect all other installed apps and object-specific record/detail pages, permission-gated Named Devices, and all responsive breakpoints. Keyboard-only operation, focus order, screen-reader semantics, and contrast across the full dark Records UI also need dedicated checks. These areas are not represented as passed or fully audited in this report.
