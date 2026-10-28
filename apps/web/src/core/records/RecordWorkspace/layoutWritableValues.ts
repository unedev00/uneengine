import type {PageLayoutMetadata} from '../../metadata/Definitions/metadata';

/** Layout constraints are not permissions. The Record API still enforces RBAC.
 * Keep schema-required fields present in payloads for legacy page compatibility;
 * avoid submitting a value for a field the authored page hid or made read-only.
 */
export function filterLayoutWritableValues(
  values:Readonly<Record<string,unknown>>,
  layout:PageLayoutMetadata|undefined,
  schemaRequired:ReadonlySet<string>
):Record<string,unknown>{
  if(!layout)return {...values};
  const visible=new Set(layout.sections.flatMap(section=>section.fieldApiNames));
  const readOnly=new Set(layout.sections.flatMap(section=>section.readOnlyFieldApiNames??[]));
  return Object.fromEntries(Object.entries(values).filter(([name])=>
    name==='RecordTypeId'||(!readOnly.has(name)&&(visible.has(name)||schemaRequired.has(name)))
  ));
}
