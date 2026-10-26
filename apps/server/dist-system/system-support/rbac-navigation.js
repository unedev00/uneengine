/** Navigation grants are independent of Object CRUD and installation/licence checks. */
export async function permittedApps(rbac, t, u, apps) {
    const access = await rbac.allowedMany(t, u, apps.map(a => ({ resource: 'App:' + a.apiName, action: 'read' })));
    const visible = [];
    for (const [index, app] of apps.entries()) {
        if (!access[index])
            continue;
        const tabs = await rbac.allowedMany(t, u, app.navigationItems.map(name => ({ resource: 'Tab:' + name, action: 'read' })));
        const allowed = new Set(app.navigationItems.filter((_, i) => tabs[i]));
        visible.push({ ...app, navigationItems: app.navigationItems.filter(n => allowed.has(n)),
            navigationOrder: app.navigationOrder.filter(n => n.type !== 'Object' || allowed.has(n.apiName)) });
    }
    return visible;
}
