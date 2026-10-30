import { uniqueLibraryComponents } from '../../components/Registry/componentLibraryDiscovery';
import type { LibraryComponentMetadata } from '../../metadata/Definitions/metadata';

/** Page Builder uses the published shared registry, never draft or unsupported definitions. */
export const RETIRED_UNE_PAGE_BUILDER_COMPONENTS = new Set(["ui_badge","ui_text","ui_alert","ui_card","ui_chart","ui_choice","ui_container","ui_date_picker","ui_document_viewer","ui_drawer","ui_form","ui_grid","ui_image","ui_line_items","ui_menu","ui_metric","ui_navigation","ui_option_groups","ui_progress","ui_record_list","ui_repeater","ui_slot_picker","ui_split_pane","ui_table","ui_conversation","ui_cart","ui_search","ui_modal"]);

export function publishedPageLibraryComponents(components: readonly LibraryComponentMetadata[]): LibraryComponentMetadata[] {
  return uniqueLibraryComponents(components, 'page').filter(component=>!component.apiName.startsWith('ui_'));
}

/** Platform palette groups are generic. Application-specific categories belong
 * to registered component metadata, not this shared Page Builder module. */
export const pageBuilderPaletteCategories = [
  'All Components', 'Favourites', 'Recent', 'Layout', 'Display', 'Inputs',
  'Data', 'Navigation'
] as const;

export type PageBuilderPaletteCategory = (typeof pageBuilderPaletteCategories)[number];

// Reuse the same rule iterator for standard and registered component suggestions.
// Full metadata-defined category discovery is part of the shared registry migration.
const inferredCategoryRules: ReadonlyArray<{
  category: PageBuilderPaletteCategory;
  matches: RegExp;
}> = [
  { category: 'Layout', matches: /container|section|column|grid|layout|tab|accordion|split/ },
  { category: 'Inputs', matches: /form|input|checkbox|radio|select|dropdown|picker|slider|toggle/ },
  { category: 'Data', matches: /record|table|list|chart|report|dashboard|related/ },
  { category: 'Navigation', matches: /navigation|menu|top bar|bottom bar|header|footer|button|breadcrumb/ },
  { category: 'Display', matches: /text|image|card|badge|carousel|label|icon|media/ }
];

export function getPageBuilderComponentCategories(
  apiName: string,
  label: string,
  description: string,
  _standard = false,
  category?: string
): PageBuilderPaletteCategory[] {
  if(category && pageBuilderPaletteCategories.some(item=>item===category))return [category as PageBuilderPaletteCategory];
  const name = `${apiName} ${label} ${description}`.toLowerCase();
  const categories = inferredCategoryRules
    .filter(rule => rule.matches.test(name))
    .map(rule => rule.category);
  return categories.length ? categories : ['Display'];
}

export function createComponentPreviewProps(
  apiName: string,
  label: string,
  description?: string
): Record<string, unknown> {
  return {
    apiName,
    label,
    title: label,
    description: description || label,
    value: '',
    items: [],
    records: [],
    loading: false,
    disabled: true,
    preview: true,
    onAction: () => undefined,
    onChange: () => undefined,
    onNavigate: () => undefined
  };
}
