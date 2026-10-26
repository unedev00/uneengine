# Ace Assist — standalone booking frontend (proposed)

Ace Assist is a **separately installable, lazy-loaded presentation application**, not a
second platform or business-services backend. Its eventual public route is
`/aceassist`; the MetaDrive host routes users to the appropriate tenant and
uses the existing authentication/session APIs for sign-in and sign-out.

## Ownership boundaries

| Capability | Owner |
| --- | --- |
| Company profile, locations, working hours, services and billing settings | MetaDrive SQL Object Manager / tenant metadata |
| User registration, roles, sessions, RBAC and OneEngine permission set | MetaDrive Core |
| App licences, installation and activation | AppExchange |
| CRUD, relationships, object- and field-level access | MetaDrive Object APIs |
| Appointment/rescheduling/completion, quotations, invoice conversion, pricing/tax and reminders | Shared metadata Flows and Actions |
| WhatsApp/SMS connectors, HTTP callouts, credentials and webhooks | Shared UNE integration/communication engine |
| Calendar, booking form, quotation and invoice presentation | Ace Assist Page Runtime + shared One components |

Never maintain parallel user, company, product, price, tax, invoice, quotation or
booking tables in the frontend. Never instantiate a new permission or Flow
engine in Ace Assist. Avoid importing Page/Flow Builders into runtime bundles.

## Required pages

1. Branded staff sign-in (delegates to MetaDrive auth; tenant/app entitlement checks)
2. Calendar (day, week, month, agenda; resource and location filtering)
3. Create/view/edit appointment and mark visit complete or reschedule via Flows
4. Customer/patient profile (limited by record/field permissions)
5. Authenticated tenant-user self-booking (no anonymous booking routes)
6. Quotations and quotation lines (versioned shared Core Object metadata)
7. Billing: Invoice and InvoiceLine, never a second billing record model

All screen definitions, events, property values and data bindings must be
published as tenant-aware SQL metadata through the standard Page Builder and
published Page Runtime. Default layouts may be installed using a versioned,
non-destructive Ace Assist app seeder, **not** hardcoded into TSX runtime.

## Reuse before extending

Use the retained shared component registry for the AceAssist calendar and common UI controls. Standard Object forms and record tables are provided by the Core metadata-driven record runtime; do not depend on removed One component registrations. Extend the reusable runtime only when requirements cannot be expressed with existing component properties and Flows.

## Reusable Core sales metadata

`apps/server/src/app-seeders/core-quotation-objects.ts` provides
`Quotation` and `QuotationLine` definitions on tenant provisioning and
existing-tenant reconciliation. It adds metadata only; no business records.

Use existing `Customer`, `Contact`, `Account`, `Product`, `Invoice` and
`InvoiceLine`. Quotation-to-invoice conversion and all calculations must be
authorable using the shared Flow engine. Do not calculate authoritative money
amounts or derive invoice balances inside frontend components.

## Non-negotiable acceptance checks

- Not installed: app route/modules and app-specific Flows do not load/run.
- Installed and licensed: only users with appropriate tenant permissions enter.
- An Object Manager field added after install becomes available in Ace Assist
  forms through metadata without redeploy, subject to field-level access.
- Shared One component properties from Page Builder drive appearance and
  events; no duplicate Ace Assist variants or hardcoded appointment business logic.
- Quotation/QuotationLine appear in Object Manager for newly provisioned and
  existing tenants after core reconciliation. Existing customisations survive
  reruns. Invoice/InvoiceLine remain unchanged.
- All mutating actions are server-authorised and audited as applicable.
- Tenant isolation, authenticated-user booking boundaries, app deactivation/uninstall,
  server-side double-booking prevention, duplicate webhook delivery and timezone
  / daylight-saving transitions are tested.

## Installed tenant seed and login entry

- Public staff route: `/aceassist` — branded independent frontend, shared MetaDrive auth.
- SQL AppExchange ID: `AceAssist`; default published page: `AceAssist_Calendar`.
- Default components: `OneText` title/status and `OneCalendar` empty calendar.
- The default calendar deliberately has no dummy appointments or made-up bookings.
- Permissions: assign `AceAssistUser` with OneEngine. No user assignments are created by seeder.
- App installation reuses the shared `AppRuntime.install` licence/dependency lifecycle.
- SQL metadata seeder: `apps/server/src/app-seeders/aceassist-app.ts`.
- Explicit install after entitlement: `METADRIVE_TARGET_TENANT_SLUG=<slug> node apps/server/dist/scripts/install-aceassist.js` (with standard secured DATABASE_URL).
- Running server never imports app seeder automatically; optional apps are lazy and independent.
- The current `unesolutions-dev` tenant was populated in SQL via an authorised installation.
- A landing calendar is present for permission/routing testing, **not a completed booking workflow**.
  Appointments, confirmations, rescheduling and billing actions still require configured
  Objects, authorised published Flows and live integration testing.

Do not replace customer-customised tenant landing metadata during reinstall.


## Flow-powered operations

The custom Ace Assist frontend now reads and mutates records **only via authorised
Autolaunched Flows**. It does not invoke Object CRUD APIs directly.

For each installed tenant and each existing Object (`Appointment`, `Customer`,
`Quotation`, `QuotationLine`, `Invoice`, `InvoiceLine`), the independent app
seeder adds missing `AceAssistLoad<Object>`, `AceAssistCreate<Object>`,
`AceAssistUpdate<Object>`, and `AceAssistDelete<Object>` Flow metadata.
Existing tenant-authored definitions, versions and business records are preserved.

- Assign the `AceAssistUser` permission set to staff who should perform CRUD.
  The seeder **never** assigns staff automatically.
- **Company Settings → Business Settings:** configure the tenant's organisation
  IANA time zone, seven-day opening/closing windows, and holidays.
  The current tenant had no saved business calendar at implementation time;
  appointment creation/editing therefore fails closed until configured.
- The calendar executes `AceAssistLoadAppointment` (Get Records) and displays
  the resulting appointments within the selected week.
- The server's reusable declarative `businessCalendarGuard` rejects scheduling
  requests outside business hours and on holidays; the custom frontend checks
  the same time window for immediate guidance.
- Lookup choices for linked Customers, Quotations and Invoices are loaded via
  their authorised Get Records Flows. No placeholder/dummy records are inserted.

**Limitations requiring real tenant validation:** Multiple-staff double-booking
conflict handling, appointment notification/reminder Flows, quotation→invoice
conversion, payment collection and financial posting remain separate tenant
workflows. These are not simulated in the frontend.

## V3 internal booking and document workflows

AceAssist is **not a public booking portal**. A valid tenant session, active app entitlement
and OneEngine permissions are mandatory. Staff assignments default to the signed-in user.
All booking writes call `AceAssistCreateV3Appointment` or `AceAssistUpdateV3Appointment`;
the UI fails closed if those safer Flows are absent.

The independent app seeds `BookableResource`, `StaffAvailability` and
`AvailabilityException` as reusable SQL Objects. The built-in record `OwnerId`
represents the staff user for recurring shifts and time off; there is no parallel user
directory. Configure staff schedule/time-off records through authorised generic Object
Records interfaces. Existing tenant business hours remain the fallback when a staff
member has not configured recurring shifts.

The frontend may preview time slots from authorised Get Records Flows, but it never
promises that a slot has been reserved. A transaction-scoped generic overlap guard
checks every assigned staff member and resource, while a metadata-based availability
guard checks configured shifts and time-off. Legacy unmodified booking Flows may
still lack these guards and must not be used for production booking.

`Quotation.DocumentNumber` and `Invoice.DocumentNumber` use the existing shared
SQL Auto Number Field engine. Prefixes and formats are editable through Object Manager.
Draft `DocumentNumber` values are allocated at creation. An authenticated `AceAssistIssueInvoice` Flow independently allocates the final `InvoiceNumber` when it issues a verified draft, within the SQL transaction. Existing historical numbers remain untouched.

The app provides four **inactive draft** send templates, supporting both quotation
and invoice email and WhatsApp transport. A tenant developer must set the actual
SMTP/HTTPS Named Credential, permitted sender, recipient mapping, WhatsApp template,
consent/policy constraints, attachment or document rendering requirements, publish
and verify the Flow. Drafts never deliver messages automatically.

`AceAssistConvertQuoteToInvoice` verifies the accepted quotation, checks source lines, and copies related lines into a linked draft Invoice. `AceAssistIssueInvoice` validates its financial lines and sets issuance-time InvoiceNumber. OneEngine's separately assignable `AceAssistFinanceIssuer` policy controls issuing.

A shared `Payment` Object and cashier-only `AceAssistRecordCashPayment` Flow validate manual cash receipts against the remaining numbered invoice balance and track part/full payment. Bank/card provider settlement remains unverified until a signed provider webhook and reconciliation are configured; no UI action claims card payment without that evidence.

Record-triggered scheduled reminder Flows provide a live internal 24-hour reminder and draft email/WhatsApp reminders, which require explicitly configured Named Credentials, communication consent and approved provider templates.

A shared read-only document component lets authorised users print or use the browser's **Save as PDF** facility for Flow-loaded quotations and invoices. This is not a server-generated email attachment; attachment rendering and automated PDF delivery still require a reusable document service.\n\nNot yet completed: generated email/PDF attachments, verified outbound provider delivery and inbox booking conversations, card-provider reconciliation/refunds, and live tenant/browser regression tests.


## AceAssist Booking — WhatsApp appointment conversation

The independent AceAssist seeder now supplies an **inactive draft** Flow named
**AceAssist Booking** (`AceAssistBooking`) and a tenant-scoped
`AceAssistBookingSession` Object. It listens to verified, inbound, newly
created WhatsApp `Communication` records. A message saying `BOOKING`
starts a conversation; subsequent messages from the same phone continue the
session through the shared Record-Triggered Flow engine.

The editable welcome template offers **1 TODAY**, **2 TOMORROW**, or
**DD/MM/YY**. It computes only currently available slots from authorised
`StaffAvailability`, `AvailabilityException`, the tenant's business
calendar and existing appointments. A reply with one of the offered times
revalidates the slot under shared availability and transactional overlap
guards, matches/creates a Customer, creates an Appointment, and queues an
editable confirmation SMS: **Your Booking is confirmed**. Conversation
state, date, offered slots and appointment link are stored as SQL Records,
not browser state. Sending uses the shared encrypted HTTPS HTTP Callout
outbox; system-owned Communication remains append-only.

**Before activation:** configure a tenant WhatsApp HTTPS Named Credential and
public phone-number ID, an SMS provider credential and request path, business
hours, staff shifts, the explicitly assigned AceAssistBookingAutomation OneEngine permission set for the webhook execution account,
and applicable messaging consent. The seeded temporary assignee comes from
`md_tenant_developer_accounts`. The default developer identity is disabled:
the reusable availability guard **does not permit disabled staff bookings**.
Authorise an enabled staff assignee or explicitly enable the developer through
the tenant security policy before testing. End-to-end WhatsApp/SMS delivery,
retry/failure handling and published Flow permissions must be verified; no
live booking is claimed from the draft.

## Mobile workspace — current implementation

The standalone phone UI uses real **AceAssistLoadAppointment**, **AceAssistLoadCustomer**,
**AceAssistLoadInvoice**, User and Product lookups, plus the existing authorised
V3 booking and atomic V1 document Flows. There is no synthetic data source,
separate finance engine, or front-end direct Object CRUD. The mobile footer
provides Home, Calendar, Billing, Customers and More navigation.

- Home appointments and unpaid-invoice cards are computed from accessible Flow
  outputs only. Missing permissions disable quick actions and prevent restricted
  data from being loaded. Mixed-currency balances are not summed into a false
  single-currency total.
- Calendar day/week/month views show tenant-local appointment times. Staff and
  service filters use authorised User/Product lookup Flows; day navigation and
  create/edit booking keep the same V3 guard checks.
- Quotations and invoices use the unified FinancialDocumentEditor already
  on main. Header and line changes are saved in one authorised
  AceAssistCreateDocumentV1 / AceAssistUpdateDocumentV1 Flow transaction.
  The mobile dashboard's document shortcuts open that same editor.
- Parent and line totals are verified by the shared financial Flow and
  RecordEngine guards. Finalised documents stay locked.
- Responsive mobile dialogs use the same authorised metadata form fields as
  desktop. The actual permission boundary remains the OneEngine API, not
  a disabled browser control.

**Still to validate before deployment:** tenant-installed Flow discovery and field
permissions for representative doctors, salons and barbers; mobile browser
layouts on physical devices; legitimate timezone/DST boundaries; and cash
settlement. Card payments and outbound message delivery are not simulated:
they require their existing provider/credential and verification workflows.
The mobile app is intentionally a generic service-business UI; industry-specific
record schemas remain centrally defined through tenant Objects.
