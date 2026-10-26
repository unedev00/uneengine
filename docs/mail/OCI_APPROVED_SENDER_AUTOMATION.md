# OCI approved sender automation — operator setup

When MetaDrive creates a mailbox, the tenant-scoped /api/mail/mailboxes endpoint now asks a restricted root-owned broker to register its exact email address in Oracle Email Delivery (UK London) **before reporting it active**. This uses the existing Oracle VM instance principal, not tenant credentials. It does not expose an arbitrary OCI API or Docker socket to users.

## One-time OCI configuration (required)

1. Locate the compartment containing the existing OCI Email Delivery resources and note its compartment OCID (use the tenancy OCID only if approved senders must reside at tenancy root).
2. Grant the existing **instance-scoped MetaDrive VM dynamic group** permissions: `Allow dynamic-group <metadrive-vm-dynamic-group> to manage approved-senders in compartment <email-compartment-name>`. Use the exact policy compartment with least privilege. Do not grant tenant identities or every VM this permission.
3. Install OCI CLI on the Oracle VM in a root-controlled location **/usr/local/bin/oci** and ensure `oci email sender list --auth instance_principal --region uk-london-1 --compartment-id <ocid>` succeeds without stored API keys. CLI is not currently verified as installed on the VM. Do **not** grant SMTP credentials to tenants.
4. On the VM, create root-only `/etc/metadrive/mail-sender.env` with one line `METADRIVE_OCI_MAIL_COMPARTMENT_OCID=<compartment-ocid>`; permissions `root:root 0600`. Never commit actual OCIDs or secrets.
5. Deploy the reviewed code and reinstall `sudo bash scripts/oracle/install-mcp-broker.sh` (the normal protected Oracle deployment does that). The socket service reads that root-only environment file; normal API process retains `NoNewPrivileges=yes`.
6. From /mail-admin, approve `noreply@unesolutions.co.uk` using the verified `unesolutions.co.uk` domain. New mailboxes provisioned thereafter call OCI automatically.
7. Test creating a new mailbox, confirm it appears in OCI Approved Senders in **UK South (London)**, and test send/receive. If OCI provisioning fails, MetaDrive reports an error and does not mark the new mailbox active.

## Safety and prerequisites

- A verified tenant domain in MetaDrive is not equivalent to DKIM-active OCI Email Domain, successful SPF/MX, or permission to impersonate another tenant. Keep `METADRIVE_ENABLE_TENANT_MAIL` disabled until the end-to-end two-tenant security review, abuse rate limits, quotas and DKIM/MX setup pass.
- If OCI already has an approved sender, a duplicate conflict is treated idempotently.
- OCI approved sender creation can take time to propagate to SMTP. Retry mail submission with bounded exponential backoff rather than creating duplicate mailboxes.
- OCI account/compartment approved-sender quotas still apply. Unlimited Docker Mailserver mailboxes do not imply unlimited OCI approved senders.
- This change does not fix old bounces automatically and cannot be confirmed operational until the OCI CLI and policy setup have been verified on Oracle. It doesn't install OCI CLI or change OCI IAM policies.
