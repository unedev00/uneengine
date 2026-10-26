import { createHash, randomBytes } from 'node:crypto';
export const recoveryUuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const tokenDigest = (token) => createHash('sha256').update(token).digest('hex');
export const newRecoveryToken = () => randomBytes(32).toString('base64url');
export const validRecoveryEmail = (email) => typeof email === 'string' && email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
export class TenantRecoveryContacts {
    db;
    rbac;
    mfa;
    credentials;
    constructor(db, rbac, mfa, credentials) {
        this.db = db;
        this.rbac = rbac;
        this.mfa = mfa;
        this.credentials = credentials;
    }
    async mailConfig(tenant) {
        const { rows } = await this.db.query(`
   SELECT smtp_credential_id,from_email FROM md_password_recovery_settings
   WHERE tenant_id=$1`, [tenant]);
        const config = rows[0];
        if (!config?.smtp_credential_id || !recoveryUuid.test(config.smtp_credential_id) ||
            !validRecoveryEmail(config.from_email))
            throw Error('Tenant recovery email is not configured');
        return { id: config.smtp_credential_id, from: config.from_email };
    }
    async list(tenant, actor) {
        await this.rbac.require(tenant, actor, 'Security', 'read');
        const { rows } = await this.db.query(`
   SELECT email,verified_at,created_at FROM md_tenant_recovery_contacts
   WHERE tenant_id=$1 ORDER BY email`, [tenant]);
        return { contacts: rows.map(row => ({ email: row.email, verified: row.verified_at !== null,
                verifiedAt: row.verified_at?.toISOString() ?? null, createdAt: row.created_at.toISOString() })) };
    }
    async enroll(tenant, actor, raw) {
        await this.rbac.require(tenant, actor, 'Security', 'manage');
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
            throw Error('Invalid contact');
        const body = raw;
        if (!validRecoveryEmail(body.email) || typeof body.mfaCode !== 'string' ||
            !/^[0-9]{6}$/.test(body.mfaCode))
            throw Error('Invalid recovery contact');
        const email = body.email.trim().toLowerCase();
        // A recovery contact cannot be an existing tenant login or an unverified domain placeholder.
        const { rows: users } = await this.db.query(`
   SELECT id FROM md_users WHERE tenant_id=$1 AND lower(email)=$2`, [tenant, email]);
        if (users.length)
            throw Error('Recovery contacts must be independent of tenant accounts');
        const mail = await this.mailConfig(tenant);
        await this.mfa.verifyFresh(tenant, actor, body.mfaCode);
        const token = newRecoveryToken(), hash = tokenDigest(token);
        const { rowCount } = await this.db.query(`
   INSERT INTO md_tenant_recovery_contacts(tenant_id,email,verification_hash,
    verification_expires_at,enrolled_by)
   VALUES($1,$2,$3,now()+interval '24 hours',$4)
   ON CONFLICT DO NOTHING`, [tenant, email, hash, actor]);
        if (!rowCount)
            throw Error('Contact already enrolled');
        try {
            await this.credentials.sendTenantEmail(tenant, mail.id, mail.from, email, 'MetaDrive recovery contact verification', 'You were nominated as an independent tenant recovery contact. Verify your address using the private code: ' + token +
                '. This code expires in 24 hours. If you did not expect this, ignore this message.');
        }
        catch (error) {
            await this.db.query(`DELETE FROM md_tenant_recovery_contacts
     WHERE tenant_id=$1 AND email=$2 AND verification_hash=$3 AND verified_at IS NULL`, [tenant, email, hash]);
            throw error;
        }
        return { enrolled: true };
    }
    async verify(raw) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
            throw Error('Invalid verification');
        const p = raw;
        if (typeof p.tenantId !== 'string' || !recoveryUuid.test(p.tenantId) ||
            !validRecoveryEmail(p.email) || typeof p.token !== 'string' ||
            !/^[A-Za-z0-9_-]{43}$/.test(p.token))
            throw Error('Invalid verification');
        const email = p.email.toLowerCase(), hash = tokenDigest(p.token);
        const { rowCount } = await this.db.query(`
   UPDATE md_tenant_recovery_contacts SET verified_at=now(),verification_hash=''
   WHERE tenant_id=$1 AND email=$2 AND verification_hash=$3
    AND verified_at IS NULL AND verification_expires_at>now() AND failed_attempts<5`, [p.tenantId, email, hash]);
        if (!rowCount) {
            await this.db.query(`UPDATE md_tenant_recovery_contacts
     SET failed_attempts=LEAST(failed_attempts+1,10)
     WHERE tenant_id=$1 AND email=$2 AND verified_at IS NULL AND failed_attempts<5`, [p.tenantId, email]);
            throw Error('Verification token invalid or expired');
        }
        return { verified: true };
    }
}
