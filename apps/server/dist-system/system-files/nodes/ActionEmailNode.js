export async function executeActionEmailNode(_context) {
    throw new Error('SMTP-based Flow email actions are disabled; configure delivery with an HTTPS Named Credential and HTTP Callout');
}
