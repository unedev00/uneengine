# One-click read-only Mail Admin access

MetaDrive Mail Admin provides an Open Mailbox action for same-tenant active mailboxes.
It opens the selected mailbox in a separate tab without resetting or revealing the user's password.

## Security

* Requires Mailbox:manage and a currently enabled actor, checked again on every read.
* A one-use ticket lasts 60 seconds; the exchanged in-memory session lasts 15 minutes.
* Only SHA-256 hashes of session tokens are stored in SQL.
* Ticket links use a URL fragment that the new tab removes before contacting the API.
* Admin sessions may fetch folders, message lists and individual messages only; send,
  draft and mark-as-read operations are blocked by the API as well as the UI.
* Security audit records contain an administrator, tenant, mailbox address and action,
  but no passwords, mail bodies or session tokens.
* Signing out revokes an admin session; normal password-based mailbox login is unchanged.

## Production prerequisite: Docker Mailserver master account

Docker Mailserver supports Dovecot master accounts. A dedicated operator must provision
a strong master account in the existing metadrive-docker-mailserver container using
the documented setup dovecot-master add command. Prefer a secure interactive or
root-controlled secrets flow. Reference:
https://docker-mailserver.github.io/docker-mailserver/edge/config/account-management/supplementary/master-accounts/

Configure these **only** in the protected MetaDrive API service environment:

- METADRIVE_MAIL_ADMIN_MASTER_USERNAME = the configured Dovecot master username
- METADRIVE_MAIL_ADMIN_MASTER_PASSWORD = the matching, random 24+ character password

The server sends Dovecot the target mailbox followed by an asterisk and the master
username, plus the master password. Both values are confined to the API and Python
mail protocol worker; they must never be included in web assets, SQL or logs.

The action fails closed until master credentials have been configured on the host.
Deploy SQL migration 20261029-mail-admin-sessions.sql before deploying the new API.

IMPORTANT: Dovecot master credentials can perform privileged actions outside MetaDrive.
The MetaDrive HTTP endpoint is deliberately read-only but the Dovecot master account
is not inherently read-only. Never share this credential or use it with unrelated clients.

## Validation checklist

1. Run the mail admin access test and existing Docker mail tests.
2. Verify one-click opening for an authorised tenant admin and that normal login works.
3. Verify cross-tenant and insufficient-permission attempts fail.
4. Verify forged send, draft, and mark-read requests fail even with a valid session token.
5. Verify ticket replay fails, expiry and revocation work, and changing RBAC permissions
   or disabling the administrator prevents further reads.
6. Verify logs contain no mailbox secrets or message content.
7. Test with disposable mailboxes before production rollout.

This change does not provision or reveal production Dovecot master credentials.
