export const api = /^[A-Za-z][A-Za-z0-9_]*$/;
export function authenticated(req) {
    if (!req.actor?.tenant_id || !req.actor.user_id)
        throw new Error('Authenticated tenant required');
    return req.actor;
}
export const wrap = (fn) => (req, res, next) => { void fn(req, res).catch(next); };
