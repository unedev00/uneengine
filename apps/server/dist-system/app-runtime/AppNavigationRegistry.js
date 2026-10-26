/** App navigation is always scoped to installed tenant app IDs. */
export async function loadAppNavigation(db, tenantId, appIds) {
    if (!appIds.length)
        return { navigation: [], utilities: [] };
    const [navigation, utilities] = await Promise.all([
        db.query(`
   SELECT app_id,entry_type,api_name,sort_order FROM md_tenant_app_navigation
   WHERE tenant_id=$1 AND app_id=ANY($2::uuid[]) ORDER BY sort_order`, [tenantId, appIds]),
        db.query(`
   SELECT app_id,utility_name FROM md_tenant_app_utilities
   WHERE tenant_id=$1 AND app_id=ANY($2::uuid[]) ORDER BY sort_order`, [tenantId, appIds])
    ]);
    return { navigation: navigation.rows, utilities: utilities.rows };
}
/** Validate and order authored navigation before tenant SQL writes. */
export function validateAppNavigation(p) {
    const objects = p.navigationItems, pages = p.navigationPageApiNames;
    if ([...objects, ...pages].some(name => typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name)))
        throw new Error('Invalid App navigation');
    if (new Set(objects).size !== objects.length || new Set(pages).size !== pages.length)
        throw new Error('Duplicate App navigation');
    const allowed = new Set([
        ...objects.map(name => 'Object:' + name),
        ...pages.map(name => 'App Page:' + name)
    ]);
    const order = [];
    const chosen = new Set();
    for (const rawEntry of p.navigationOrder) {
        if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry))
            throw new Error('Invalid App navigation');
        const item = rawEntry;
        const key = item.type + ':' + item.apiName;
        if (!allowed.has(key) || chosen.has(key))
            throw new Error('Invalid App navigation order');
        chosen.add(key);
        order.push({ type: item.type, apiName: item.apiName });
    }
    for (const key of allowed)
        if (!chosen.has(key)) {
            const type = key.startsWith('Object:') ? 'Object' : 'App Page';
            order.push({ type, apiName: key.slice(type.length + 1) });
        }
    const utilityItems = p.utilityItems;
    if (utilityItems.some(item => item !== 'Notes' && item !== 'History') ||
        new Set(utilityItems).size !== utilityItems.length)
        throw new Error('Invalid App utilities');
    return { objects, pages, order, utilityItems };
}
