# MetaDrive Docker Mailserver — Oracle VM

This replaces Stalwart as the SMTP/IMAP server for **unesolutions.co.uk**, with **no mailbox-count limit** and no tenant partitioning. The /mail and /mail-admin applications still use Stalwart's JMAP routes, so they require an IMAP/SMTP adapter and account-management rewrite before they can work with the replacement.

## Requirements

Docker Engine and Compose plugin, public DNS MX to mail.unesolutions.co.uk (DNS only), public inbound 25 and optionally 465/587/993; a **trusted** certificate for mail.unesolutions.co.uk available as `certs/fullchain.pem` and `certs/privkey.pem`. Ensure these files aren't checked into Git.

## Install on the Oracle VM

Execute from `infra/mail/docker-mailserver` in an up-to-date checkout.

```sh
docker compose version
docker compose config --quiet
# Stop Stalwart before acquiring production mail ports. This stops mail service
# immediately. It does not delete the old mailbox storage volumes.
docker stop stalwart-setup
docker update --restart=no stalwart-setup
docker compose pull
docker compose up -d
docker compose ps
docker logs --tail=80 metadrive-docker-mailserver
```

If `stalwart-setup` is not the actual old container name, inspect `docker ps -a` and stop **only** the identified Stalwart container. Never use `docker system prune --volumes` or `docker volume prune` on this host: other services depend on Docker volumes.

Create the first mailbox immediately (DMS expects a mailbox to exist shortly after initial startup):

```sh
docker exec -it metadrive-docker-mailserver setup email add support@unesolutions.co.uk
```

The CLI prompts securely for the password. Add more accounts with the same command; no artificial limit.

## Outstanding blockers for working /mail

1. Build a new MetaDrive IMAP/SMTP backend adapter and rewrite mailbox management. JMAP is Stalwart-specific.
2. Configure OCI SMTP relay with verified credentials for outbound mail; do not store credentials in Git.
3. Configure SPF, DKIM and DMARC correctly. Confirm OCI SMTP port/network reachability.
4. Verify real external inbound and outbound messages; ensure no relay loophole.
5. Confirm container RAM usage using `docker stats --no-stream`. Lower RAM than Stalwart is a measurement target, not a promise.

## Safety

Stopping Stalwart immediately interrupts existing mail until the replacement is functional. Old Stalwart data volumes are deliberately left alone; deletion would be irreversible and requires inspecting mounts. Do not remove unrelated Docker volumes or containers.
