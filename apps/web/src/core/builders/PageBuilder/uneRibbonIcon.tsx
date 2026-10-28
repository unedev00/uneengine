import type {ReactNode} from 'react';

/** The 36 bundled UNE descriptors own lightweight individual SVG assets.
 * Tenant-authored components continue using the existing registry fallback. */
const bundledUneIcons = new Set([
  "une_text",
  "une_image",
  "une_calendar",
  "une_button",
  "une_card",
  "une_input",
  "une_toggle",
  "une_badge",
  "une_stack",
  "une_tabs",
  "une_container",
  "une_grid",
  "une_split_pane",
  "une_navigation",
  "une_menu",
  "une_modal",
  "une_drawer",
  "une_item_grid",
  "une_repeater",
  "une_record_list",
  "une_search",
  "une_lookup",
  "une_choice",
  "une_cart",
  "une_conversation",
  "une_form",
  "une_table",
  "une_line_items",
  "une_date_picker",
  "une_slot_picker",
  "une_metric",
  "une_alert",
  "une_progress",
  "une_document_viewer",
  "une_chart",
  "une_option_groups"
]);

export function uneRibbonIcon(type:string, fallback:ReactNode):ReactNode {
  const id=type.startsWith('Custom:')?type.slice('Custom:'.length):type;
  if(!bundledUneIcons.has(id)) return fallback;
  return <img className="office-ribbon-une-svg" src={`${import.meta.env.BASE_URL}une/ribbon-icons/${id}.svg`}
    alt="" aria-hidden="true" draggable={false} loading="lazy" width={21} height={21}/>;
}
