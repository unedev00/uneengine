import type {ReactNode} from 'react';

/** The 34 bundled UNE descriptors own lightweight individual SVG assets.
 * Tenant-authored components continue using the existing registry fallback. */
const bundledUneIcons = new Set([
  "ui_image",
  "ui_calendar",
  "ui_button",
  "ui_card",
  "ui_input",
  "ui_toggle",
  "ui_stack",
  "ui_tabs",
  "ui_container",
  "ui_grid",
  "ui_split_pane",
  "ui_navigation",
  "ui_menu",
  "ui_modal",
  "ui_drawer",
  "ui_item_grid",
  "ui_repeater",
  "ui_record_list",
  "ui_search",
  "ui_lookup",
  "ui_choice",
  "ui_cart",
  "ui_conversation",
  "ui_form",
  "ui_table",
  "ui_line_items",
  "ui_date_picker",
  "ui_slot_picker",
  "ui_metric",
  "ui_alert",
  "ui_progress",
  "ui_document_viewer",
  "ui_chart",
  "ui_option_groups"
]);

export function uneRibbonIcon(type:string, fallback:ReactNode):ReactNode {
  const id=type.startsWith('Custom:')?type.slice('Custom:'.length):type;
  if(!bundledUneIcons.has(id)) return fallback;
  return <img className="office-ribbon-une-svg" src={`${import.meta.env.BASE_URL}une/ribbon-icons/${id}.svg`}
    alt="" aria-hidden="true" draggable={false} loading="lazy" width={21} height={21}/>;
}
