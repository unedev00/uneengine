import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';
import { registeredComponentDefinitions, legacyUneAliases } from './componentLibraryDiscovery';

export type ComponentSurface = LibraryComponentMetadata['surfaces'][number];

/** Resolve published components for each metadata-defined page, dashboard or Flow surface. */
export function findRegisteredComponent(
  components: readonly LibraryComponentMetadata[],
  apiName: unknown,
  surface: ComponentSurface
): LibraryComponentMetadata | undefined {
  if (typeof apiName !== 'string' || !apiName) return undefined;
  const registered = registeredComponentDefinitions(components, surface);
  // A tenant's real published identity wins; only absent retired system keys
  // fall back to the canonical UNE implementation for older saved metadata.
  return registered.find(definition => definition.apiName === apiName &&
    !(apiName === 'une_text' && definition.trustedBundled === true) &&
    definition.status !== 'Draft' && definition.surfaces.includes(surface))
    ?? (legacyUneAliases[apiName] ? registered.find(definition =>
      definition.apiName === legacyUneAliases[apiName] && definition.trustedBundled === true &&
      definition.status !== 'Draft' && definition.surfaces.includes(surface)) : undefined);
}

/** Interpret saved metadata for all existing registered-component surfaces.
 * This does not authorise rendering: the published surface lookup still does. */
const savedReferenceRules = [
  {surface:'page',type:'Custom:',key:'type',prefix:true},
  {surface:'dashboard',type:'Custom',key:'customComponentApiName',prefix:false},
  {surface:'flow',type:'Custom Component',key:'componentApiName',prefix:false}
] as const;
export function componentApiNameFromMetadata(source:unknown,surface:ComponentSurface):string|undefined {
  if(!source || typeof source!=='object' || Array.isArray(source)) return undefined;
  const record=source as Record<string,unknown>;
  for(const rule of savedReferenceRules) {
    if(rule.surface!==surface) continue;
    const apiName=rule.prefix
      ? typeof record.type==='string' && record.type.startsWith(rule.type)
        ? record.type.slice(rule.type.length) : null
      : record.type===rule.type ? record[rule.key] : null;
    return typeof apiName==='string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(apiName)
      ? apiName : undefined;
  }
  return undefined;
}
export function findRegisteredComponentForInstance(
  components:readonly LibraryComponentMetadata[],instance:unknown,surface:ComponentSurface
):LibraryComponentMetadata|undefined {
  return findRegisteredComponent(components,componentApiNameFromMetadata(instance,surface),surface);
}
