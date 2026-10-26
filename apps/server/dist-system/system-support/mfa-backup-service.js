import { createHash, randomBytes } from 'node:crypto';
export const hashMfaValue = (value) => createHash('sha256').update(value).digest('hex');
export async function consumeBackupCode(db, tenant, user, code) {
    if (typeof code !== 'string' || !/^[a-f0-9-]{20,23}$/i.test(code))
        return false;
    const normalized = code.replaceAll('-', '').toLowerCase();
    if (normalized.length !== 20)
        return false;
    const result = await db.query(`UPDATE md_mfa_backup_codes SET used_at=now()
  WHERE tenant_id=$1 AND user_id=$2 AND code_hash=$3 AND used_at IS NULL RETURNING code_hash`, [tenant, user, hashMfaValue(normalized)]);
    return !!result.rows[0];
}
export class MfaBackupService {
    db;
    auth;
    mfa;
    rbac;
    constructor(db, auth, mfa, rbac) {
        this.db = db;
        this.auth = auth;
        this.mfa = mfa;
        this.rbac = rbac;
    }
    async reset(tenant, actor, target, password, code) {
        await this.rbac.require(tenant, actor, 'Security', 'manage');
        if (typeof target !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(target) || target === actor || typeof password !== 'string')
            throw Error('Invalid MFA recovery target');
        await this.auth.verifyCurrentPassword(tenant, actor, password);
        await this.mfa.verifyFresh(tenant, actor, code);
        await this.db.transaction(async (c) => {
            const found = await c.query('SELECT id FROM md_users WHERE tenant_id=$1 AND id=$2 FOR UPDATE', [tenant, target]);
            if (!found.rows[0])
                throw Error('User not found');
            for (const table of ['md_user_mfa_secrets', 'md_mfa_enrollment_tokens', 'md_mfa_backup_codes', 'md_webauthn_credentials', 'md_webauthn_challenges'])
                await c.query('DELETE FROM ' + table + ' WHERE tenant_id=$1 AND user_id=$2', [tenant, target]);
            for (const table of ['md_sessions', 'md_refresh_sessions'])
                await c.query('UPDATE ' + table + ' SET revoked_at=now() WHERE tenant_id=$1 AND user_id=$2', [tenant, target]);
            for (const table of ['md_mfa_login_challenges', 'md_password_reset_challenges'])
                await c.query('UPDATE ' + table + ' SET consumed_at=now() WHERE tenant_id=$1 AND user_id=$2', [tenant, target]);
            await c.query("INSERT INTO md_security_events(tenant_id,actor_user_id,subject_user_id,action) VALUES($1,$2,$3,'MfaResetByAdministrator')", [tenant, actor, target]);
        });
        return { reset: true };
    }
    async regenerate(tenant, user, password, code) {
        if (typeof password !== 'string')
            throw Error('Invalid credentials');
        await this.auth.verifyCurrentPassword(tenant, user, password);
        await this.mfa.verifyFresh(tenant, user, code);
        const codes = Array.from({ length: 10 }, () => randomBytes(10).toString('hex'));
        await this.db.transaction(async (c) => {
            await c.query('SELECT id FROM md_users WHERE tenant_id=$1 AND id=$2 FOR UPDATE', [tenant, user]);
            await c.query('DELETE FROM md_mfa_backup_codes WHERE tenant_id=$1 AND user_id=$2', [tenant, user]);
            for (const value of codes)
                await c.query('INSERT INTO md_mfa_backup_codes(tenant_id,user_id,code_hash) VALUES($1,$2,$3)', [tenant, user, hashMfaValue(value)]);
            await c.query("INSERT INTO md_security_events(tenant_id,actor_user_id,action) VALUES($1,$2,'MfaBackupCodesRegenerated')", [tenant, user]);
        });
        return { codes: codes.map(s => s.match(/.{5}/g).join('-')) };
    }
}
