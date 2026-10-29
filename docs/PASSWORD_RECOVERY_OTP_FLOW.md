# MetaDrive password recovery: OTP and delivery channels

## Architecture

The public Forgot Password page sends only the tenant-scoped account email and a stable
`email`, `sms` or `whatsapp` action value. Labels can be renamed without affecting
routing. The same Core `PasswordResetService` issues, verifies and consumes all OTP
challenges. It does not expose arbitrary tenant Flow execution to anonymous users.

Tenants configure their recovery workflow through **Company Settings → Security & Recovery →
Password Recovery Flow**. The configuration is in relational SQL
(`md_password_recovery_flow`, `md_password_recovery_channel_actions`).
The API requires existing `Security:read`/`Security:manage` RBAC; writes audit policy
changes and use revisions to reject stale editor saves. Existing email recovery
templates and link preferences are copied without overwrite during migration.

The executable steps are:
1. Find a tenant-local enabled user by registered email. Return the same public
   acknowledgement for unknown accounts, unconfigured channels and delivery errors.
2. Generate 6-digit cryptographically random OTP (configurable 4 digits). The
   deployment-owned HMAC signs the tenant/user/challenge/code; SQL stores only the
   digest, never the code. Default expiry 10 minutes and maximum five attempts;
   4-digit mode restricts expiry to five minutes and three attempts.
3. Dispatch through platform SMTP (email) or the existing RBAC-protected HTTPS
   Named Credential HTTP Callout (WhatsApp/SMS). Both phone channels remain off
   until deliberately enabled and configured by an authorised administrator.
4. Verify the one-time code server-side under a challenge lock, count attempts,
   and exchange it for a separate high-entropy one-time password-reset grant.
5. Enforce password policy and password history, update the password, consume
   all outstanding reset/MFA challenges, revoke sessions, and audit reset completion.

An older email LINK method remains available to avoid breaking existing tenants.
Email is always delivered by the platform-owned sender, never arbitrary tenant SMTP.

## Deployment requirements

- Apply the additive versioned SQL migration
  `20261220-password-recovery-otp-channels.sql` once with the regular migration runner;
  it can be replayed and retains existing tenant data/settings.
- Configure the existing platform SMTP environment variables, including
  `METADRIVE_PLATFORM_SMTP_FROM_EMAIL=noreply@unesolutions.co.uk`. Set SPF, DKIM
  and DMARC for the sender domain; verify deliverability before production.
- Set `METADRIVE_PASSWORD_RESET_OTP_SECRET` to a unique server-only random secret
  of at least 32 bytes, identical on every API node and backed up in a secret
  manager. Never put the secret in SQL, browser settings, Flow resources or logs.
  A missing secret disables numeric OTP issuance and public channel readiness.
- For WhatsApp, configure a tenant HTTPS Named Credential (for example Meta's
  WhatsApp Cloud API) and its POST path/body in the Security recovery editor.
  SMSGate uses its own HTTPS Named Credential and editable JSON request body.
  Templates support `{!Recovery.Phone}`, `{!Recovery.Code}` and
  `{!Recovery.Message}` in HTTP request mappings.
- Assign a dedicated, enabled tenant service user only the central
  `NamedCredential:read` and `HTTPCallout:execute` permissions needed for
  approved outbound delivery; the existing HTTP transport keeps its credential
  vault, bounded URL checks and integration audit behavior.
- Recovery SMS and WhatsApp may be enabled only for numbers proven to belong
  to the account and stored in `md_user_recovery_phones` with `verified_at`.
  **There is not yet an authenticated phone-ownership enrollment UI**; do not
  mark unverified phone numbers as verified or import CRM phone fields directly.

## Outstanding limitations before production approval

This is a Security Settings **editable recovery Flow configuration**, not yet
a published/editable graph inside the generic Flow Builder. The reusable
password-reset service and outbound HTTP runtime are used; exposing arbitrary
tenant Flow execution to an anonymous login page would violate the Core
authentication boundary. A dedicated, restricted Flow capability and secure
graph publication contract remain to be implemented.

A dedicated verified-phone enrollment/check and provider approval policy must
be implemented before production WhatsApp/SMS recovery. Because administrators
can otherwise edit outbound payloads, a vetted provider/destination mapping is
needed to ensure verification codes cannot be redirected to third parties.

Verify on an isolated SQL database and actual tenant domains: seeder idempotence,
cross-tenant access, timing/privacy behavior, CAPTCHA/rate controls, the 4-digit
security tradeoff, all credential/RBAC combinations, email, SMS and WhatsApp
provider delivery failures, reset history/session revocation and the complete
frontend/server checks. No live provider deliveries or database migrations have
been performed as part of this change.
