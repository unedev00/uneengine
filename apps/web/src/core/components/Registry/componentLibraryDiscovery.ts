import type { LibraryComponentMetadata } from '../../metadata/Definitions/metadata';

/** Tenant-authored component labels are independent of retired renderer families. */
export function customComponentLabel(component:Pick<LibraryComponentMetadata,'label'|'apiName'>):string {
 return component.label.trim() || component.apiName;
}

export function registeredComponentDefinitions(
  components: readonly LibraryComponentMetadata[],
  surface?: LibraryComponentMetadata['surfaces'][number]
): LibraryComponentMetadata[] {
  const definitions = new Map<string, LibraryComponentMetadata>();
  for (const component of components) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(component.apiName) ||
        (surface && (component.status === 'Draft' || !component.surfaces?.includes(surface)))) continue;
    const existing = definitions.get(component.apiName);
    // Prefer the published definition, then the newest revision of the same identity.
    if (!existing || (existing.status === 'Draft' && component.status !== 'Draft') ||
        ((existing.status === 'Draft') === (component.status === 'Draft') && component.version > existing.version)) {
      definitions.set(component.apiName, component);
    }
  }
  return [...definitions.values()];
}

export function uniqueLibraryComponents(
  components: readonly LibraryComponentMetadata[],
  surface?: LibraryComponentMetadata['surfaces'][number]
): LibraryComponentMetadata[] {
  const catalog = registeredComponentDefinitions(components, surface);
  return catalog.filter(component=>!component.trustedBundled || component.apiName.startsWith('smart_'));

}

/** Friendly names are presentation-only. Never change stable component API names in saved pages. */
export function libraryComponentLabel(component:LibraryComponentMetadata):string {
 const label=customComponentLabel(component);
 return component.apiName.startsWith('smart_') ? label.replace(/^Smart\s+/,'') : label;
}
