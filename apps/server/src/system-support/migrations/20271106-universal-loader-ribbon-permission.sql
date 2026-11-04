-- Shared ribbon applicability is tenant-specific, based on shared property definitions.
-- Administrators may grant this separately; do not auto-assign it to any profile.
INSERT INTO md_system_permission_catalogue(permission_key,label,description,resource,action)
VALUES('builderRibbon:manage','Manage Shared Ribbon Property Library',
 'Tenant-specific SQL property enablement for registered Smart Components','BuilderRibbon','manage')
ON CONFLICT(permission_key) DO NOTHING;
