# Oracle Stalwart mail cutover

This runbook tracks the existing Stalwart service at `132.145.18.46` for mail at `unesolutions.co.uk`. Mail DNS was updated on 2026-10-24 after the listener and relay-authentication checks, and the four obsolete Freehosting mail records were removed after preserving a pre-cleanup DNS export. The cutover is not complete until independent delivery, mailbox/data checks, and rollback readiness have all passed.

## Preserved deployment state

Verified 2026-10-24:

- Container `stalwart-setup` is healthy and uses the pinned ARM64 image digest in [stalwart-compose.yaml](../../scripts/oracle/stalwart-compose.yaml). Host-side port publication was updated after taking the backup below.
- External named volumes `stalwart-etc` (`/etc/stalwart`) and `stalwart-data` (`/var/lib/stalwart`) remain in use. The container retains its `unless-stopped` restart policy, `stalwart` user, working directory, health check, and loopback-only JMAP binding. Never remove either volume or use `docker compose down -v`.
- A graceful-stop, application-consistent pre-change backup was created and verified at `/var/backups/metadrive-stalwart/prechange-consistent-20261024-1624UTC.tar.gz`. It is root-owned, mode `0600`; SHA-256: `37a5b3be48325d14b7494bcff4fc8f9de7f640d34363026816d1723f7f2b9aeb`.
- Re-verified 2026-10-24 with read-only `sudo`: container `stalwart-setup` is running with zero restarts, and still mounts `stalwart-etc` at `/etc/stalwart` and `stalwart-data` at `/var/lib/stalwart`. The backup remains root-owned, mode `0600`, 885,483 bytes, with the checksum above.
- SMTP/IMAP ports 25, 465, 587 and 993 are published. The Stalwart certificate for `mail.unesolutions.co.uk` passed external chain and hostname verification; SMTP STARTTLS on 25/587 and implicit TLS on 465, and IMAPS on 993, were reachable from outside OCI. These are transport checks only, not proof of authenticated relay or mail delivery.
- JMAP/management remains bound to `127.0.0.1:8080`; do not expose it publicly. Existing persistent mailbox data must be independently checked after the restart before final acceptance.

## Active listener requirements

The `Bind` column describes host-side publication; the internal Stalwart listener must also be active. Verify that SMTP AUTH is available only after TLS on submission ports and that unauthenticated relay is rejected:

| Service | Bind | Protocol | TLS |
| --- | --- | --- | --- |
| SMTP receive | `0.0.0.0:25` | SMTP | Opportunistic STARTTLS with the verified `mail.unesolutions.co.uk` certificate |
| Mail submission | `0.0.0.0:465` | SMTP | Implicit TLS; authenticated submission only; no unauthenticated relay |
| Mail submission | `0.0.0.0:587` | SMTP | STARTTLS required before authentication; authenticated submission only; no unauthenticated relay |
| IMAP client access | `0.0.0.0:993` | IMAP | Implicit TLS with the verified `mail.unesolutions.co.uk` certificate |
| Management/JMAP | `127.0.0.1:8080` on the host | Existing HTTP/JMAP | Keep private; do not publish on a public interface |

Stalwart's Cloudflare DNS-01 ACME configuration and automatic DKIM management were previously saved. The live Cloudflare zone contains the Stalwart `v1-ed25519-20261023._domainkey` and `v1-rsa-20261023._domainkey` TXT records and the OCI `metarive-london-20261023._domainkey` CNAME. Do not replace or remove these keys without confirming which sender uses them.

Verified on 2026-10-24 from outside OCI: port 25 rejects an external RCPT with `550 5.1.2 Relay not allowed.` before DATA; port 587 does not advertise AUTH before TLS and returns `503 5.5.1 AUTH not allowed.` to a pre-TLS AUTH command. STARTTLS on 587 completed with a chain- and hostname-verified certificate for `mail.unesolutions.co.uk`; the post-TLS EHLO advertised AUTH mechanisms. No credentials or message content were sent during these policy probes.

## Outbound relay

OCI Email Delivery's UK South (London) endpoint is `smtp.email.uk-london-1.oci.oraclecloud.com:587`. Verified TLS and STARTTLS are available, and the relay advertises AUTH after TLS. The active OCI policy `StalwartEmailDelivery` allows the `StalwartSmtpRelay` group to use `email-family`.

On 2026-10-24, the exposed prior SMTP credential was revoked. A replacement credential was created, retained in the operator's protected local file, and saved in the existing Stalwart `oci-relay` route; no credential is stored in this repository. The persisted route still points to the OCI endpoint on port 587, uses SMTP with implicit TLS disabled (STARTTLS), and disallows invalid certificates. Its saved username was matched to the active credential. A direct, certificate-verified STARTTLS/AUTH PLAIN probe returned SMTP 235; it did not issue MAIL FROM, RCPT TO, or DATA and therefore sent no message.

The one previously authorized outbound test was submitted before this rotation, but no independent recipient receipt or Stalwart delivery event has been verified. Do not resend it. At approximately 17:43 UTC, a separate test was submitted through MetaDrive to the operator's Gmail account; an exact-subject search in Gmail found no matching message immediately after submission. This is submission evidence only, not delivery. Confirm queue retry/bounce behavior and independently verify recipient receipt before declaring readiness. A successful JMAP `EmailSubmission/set` response is not delivery evidence.

At approximately 17:37 UTC, Gmail reported sending an independent inbound test to `relay-test-20261024@unesolutions.co.uk`. Refreshes of that mailbox's Inbox and Junk Mail showed no message as of approximately 17:40 UTC. The message has not been confirmed delivered.

If OCI Email Delivery is unavailable, blocked, or lacks approved sender entitlement, stop: this architecture has no fallback provider.

## Oracle networking gates

The OCI subnet security list already allowed inbound TCP 25, 587 and 993; a stateful inbound TCP 465 rule was added and externally verified. From outside OCI, all four mail ports were reachable and their TLS handshakes/certificates passed. OCI outbound TCP 587 and authenticated STARTTLS also passed. A public DNS-over-HTTPS PTR lookup for `132.145.18.46` returned NXDOMAIN on 2026-10-24. Configure reverse DNS `132.145.18.46` → `mail.unesolutions.co.uk` in OCI and verify PTR plus forward confirmation. Do not enable UFW blindly; preserve SSH, HTTPS/API and monitoring access.

Run [check-mail-delivery.py](../../scripts/oracle/check-mail-delivery.py) on the host and [check-mail-public.py](../../scripts/oracle/check-mail-public.py) from a non-Oracle network. These probes do not authenticate, send mail, verify MX routing, or prove recipient delivery.

## Cloudflare record state (mail route active; obsolete mail records removed)

On 2026-10-24, Cloudflare was updated with the mail-specific records below. Google Public DNS and Cloudflare DNS-over-HTTPS return the new mail A, MX, SPF, and DMARC values. This enables inbound acceptance testing but is not evidence of delivery. A pre-cleanup Cloudflare BIND export was saved locally at 17:17 UTC and contains 19 records, including the four obsolete mail records that were subsequently removed. A post-cleanup export was saved in Downloads as `unesolutions.co.uk-post-cleanup-20261024.txt` at 17:33 UTC; it contains 15 records and preserves the non-mail and DKIM entries.

The existing apex GitHub Pages A records, `www`, `api` (`132.145.18.46`, DNS only), `ftp`, and published DKIM records remain unchanged. The four obsolete Freehosting mail records were removed: `autoconfig` A → `195.201.179.80`, `imap` and `smtp` CNAME → `panel.freehosting.com`, and `_autodiscover._tcp` SRV → `panel.freehosting.com`. Cloudflare DNS-over-HTTPS now returns NXDOMAIN for those four names. The `ftp` record remains untouched. Preserve Stalwart's `v1-ed25519` and `v1-rsa` TXT records, the existing `x._domainkey` TXT record, and OCI's `metarive-london-20261023._domainkey` CNAME; do not replace or delete any key based solely on its name.

The active mail records are:

| Action | Type | Name | Value | Proxy |
| --- | --- | --- | --- | --- |
| Stalwart host | A | `mail` | `132.145.18.46` | DNS only |
| Mail routing | MX | `@` | `mail.unesolutions.co.uk`, priority 10 | DNS only |
| OCI SPF | TXT | `@` | `v=spf1 include:eu.rp.oracleemaildelivery.com ~all` | DNS only |
| DMARC monitoring | TXT | `_dmarc` | `v=DMARC1; p=none` | DNS only |

The 17:17 UTC export is a rollback reference from before legacy-record cleanup, not a pre-staging snapshot. The 17:33 UTC export reflects the current zone. To roll back the mail route, remove only the four mail records above. Restore the four removed legacy entries from the pre-cleanup export only if an approved rollback specifically requires returning their old endpoints; do not remove `ftp`, any GitHub Pages apex A, `www`, `api`, or any DKIM record. SPF/DKIM/DMARC alignment and external recipient results remain unverified.

## Rollback

The pre-cleanup and post-cleanup Cloudflare exports are retained locally. If SMTP/TLS or delivery fails before acceptance, remove only the four active mail records listed above to restore the pre-staging mail-DNS state; restore the four legacy records only when rollback requires their old endpoints. Preserve all non-mail/DKIM records.

Before changing the Stalwart container, create and verify a consistent backup of both named volumes. Retain the exact old image ID and container inspection metadata. Roll back the container image/config from that saved deployment record without deleting, replacing or initializing either named volume. Verify JMAP and all existing accounts/data before considering rollback complete.

## Acceptance evidence

Record timestamps, external test provider/domain (not secrets), message IDs, and independent recipient observations for:

1. Port 25 accepts a remote SMTP connection and STARTTLS with a valid mail-host certificate.
2. Port 587 requires STARTTLS and authentication; invalid/unauthenticated external relay attempts are rejected.
3. Port 993 presents the valid IMAPS certificate.
4. OCI relay receives authenticated TLS submissions, Stalwart queues/retries/bounces as configured, and separate external recipients receive the message.
5. A message from an independent external sender reaches Stalwart and `support@unesolutions.co.uk`; a reply is independently received.
6. SPF, DKIM and DMARC alignment pass at external recipients.
7. Existing mailboxes, credentials and messages survive container and VM restart; the `support@` mailbox and all aliases are verified.
8. Tenant mailbox isolation still passes.

Current status: container health, persistent-volume mounts, backup integrity, public mail DNS records, removal of the four obsolete mail records, OCI SMTP AUTH after verified STARTTLS, submission TLS/AUTH gating, unauthenticated relay rejection, and an external SMTP RCPT acceptance for the temporary test mailbox are confirmed. The removed-record names now return NXDOMAIN; the non-mail `ftp` record remains unchanged. The RCPT probe issued RSET before DATA and delivered no message. The independently originated inbound test and the separate MetaDrive outbound test have both been submitted, but neither has an independently confirmed recipient receipt. PTR, SPF/DKIM/DMARC alignment, restart persistence, mailbox-message preservation, and tenant isolation remain pending. Do not report email delivery complete until all checks pass. The self-hosted Oracle diagnostic is read-only; the public probe runs on a GitHub-hosted runner and originates outside the Oracle VM.
