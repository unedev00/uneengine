import type { LibraryComponentMetadata } from '../../metadata/Definitions/metadata';

export const oneLibraryName = 'One-';

/** Display names can change without invalidating persisted API references. */
export function oneComponentLabel(component: Pick<LibraryComponentMetadata, 'label' | 'apiName'>): string {
  const label = component.label.trim() || component.apiName;
  return `One-${label.replace(/^One(?:[-\s]+|(?=[A-Z]))/, '')}`;
}

/** Compatibility entries stay resolvable, but are not offered for new placements.
 * Only reviewed bundled aliases are consolidated; tenant components retain their identity. */
/** Old system API names are readable aliases, not additional new components.
 * Keep tenant-authored components with identical labels or unrelated API names. */
export const legacyUneAliases: Readonly<Record<string,string>> = Object.freeze({
  OneText: 'ui_input',
  ui_text: 'ui_input',
  OneBadge: 'ui_input',
  OneButton: 'ui_button',
  OneSearch: 'ui_search',
  OneCalendar: 'ui_calendar',
  OneItemGrid: 'ui_item_grid',
  OneConversation: 'ui_conversation',
  OneShoppingCart: 'ui_cart',
});
const bundledAliases: Readonly<Record<string, string>> = { ChatterInbox: 'ui_conversation' };

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
  const definitions = new Map(catalog.map(component => [component.apiName, component]));
  return catalog.filter(component => {
    if (component.trustedBundled && (component.apiName.startsWith('ui_') || component.apiName === 'ChatterInbox' || /^(acetill|aceassist|onechatter|uneacechatter)_/.test(component.apiName))) return false;
    // The original eight One registrations are internal compatibility identities.
    if (component.trustedBundled && legacyUneAliases[component.apiName]) return false;
    const canonical = definitions.get(bundledAliases[component.apiName]);
    return !(component.trustedBundled && canonical?.trustedBundled && canonical.status !== 'Draft' &&
      (component.surfaces ?? []).every(item => canonical.surfaces.includes(item)));
  });
}

/** Friendly names are presentation-only. Never change stable component API names in saved pages. */
export function libraryComponentLabel(component: LibraryComponentMetadata): string {
  if (component.apiName.startsWith('smart_')) return component.label.replace(/^Smart\s+/, '');
  if (component.apiName.startsWith('ui_')) {
    const raw = component.label.replace(/^\s*(?:UNE|One)[\s_-]*/i, '').trim();
    return raw || component.apiName.slice(4).split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
  return component.scope === 'platform-system' ? component.label : oneComponentLabel(component);
}
