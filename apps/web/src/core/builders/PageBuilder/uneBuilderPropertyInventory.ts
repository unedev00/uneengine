/** New code-owned ribbon inventory from the approved UNE property matrix.
 * Not loaded from component.json or SQL Component Library contracts. */
export const UNE_BUILDER_COMPONENTS=[
  "une_button",
  "une_toggle",
  "une_lookup",
  "une_tabs",
  "une_input",
  "une_item_grid",
  "une_image"
] as const;
export type UneBuilderApi=(typeof UNE_BUILDER_COMPONENTS)[number];
export type UneBuilderTab='Data'|'Design'|'Layout';
export type UneRibbonProperty={
 id:string;label:string;tab:UneBuilderTab;group:string;
 kind:'color'|'shadow'|'expression'|'align'|'number'|'position'|'boolean'|'choice'|'object';
 components:readonly UneBuilderApi[];default?:string|number|boolean;
 min?:number;max?:number;choices?:readonly string[];field?:boolean;
};
export const UNE_RIBBON_PROPERTIES:readonly UneRibbonProperty[]=[
  {
    "id": "backgroundColor",
    "label": "Body Color",
    "tab": "Design",
    "group": "Body",
    "kind": "color",
    "components": [
      "une_button",
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid"
    ]
  },
  {
    "id": "borderColor",
    "label": "Border color",
    "tab": "Design",
    "group": "Body",
    "kind": "color",
    "components": [
      "une_button",
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid",
      "une_image"
    ]
  },
  {
    "id": "shadow",
    "label": "Shadow",
    "tab": "Design",
    "group": "Body",
    "kind": "shadow",
    "components": [
      "une_button",
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid",
      "une_image"
    ]
  },
  {
    "id": "label",
    "label": "Label",
    "tab": "Design",
    "group": "Typography",
    "kind": "expression",
    "components": [
      "une_button",
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid"
    ]
  },
  {
    "id": "labelAlignment",
    "label": "Label Alignment",
    "tab": "Design",
    "group": "Typography",
    "kind": "align",
    "components": [
      "une_button",
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid"
    ]
  },
  {
    "id": "labelColor",
    "label": "Label Color",
    "tab": "Design",
    "group": "Body",
    "kind": "color",
    "components": [
      "une_button",
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid"
    ]
  },
  {
    "id": "defaultValueColor",
    "label": "Default Value Color",
    "tab": "Design",
    "group": "Typography",
    "kind": "color",
    "components": [
      "une_lookup",
      "une_item_grid"
    ]
  },
  {
    "id": "radius",
    "label": "Corner Radius",
    "tab": "Design",
    "group": "Body",
    "kind": "number",
    "components": [
      "une_button",
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid",
      "une_image"
    ],
    "default": 12
  },
  {
    "id": "textSize",
    "label": "Text Size",
    "tab": "Design",
    "group": "Typography",
    "kind": "number",
    "components": [
      "une_button",
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid"
    ],
    "default": 16,
    "min": 0
  },
  {
    "id": "placeholderSize",
    "label": "Placeholder Size",
    "tab": "Design",
    "group": "Typography",
    "kind": "number",
    "components": [
      "une_lookup"
    ],
    "default": 14
  },
  {
    "id": "width",
    "label": "Width",
    "tab": "Layout",
    "group": "Size",
    "kind": "position",
    "components": [
      "une_button",
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid",
      "une_image"
    ]
  },
  {
    "id": "height",
    "label": "Height",
    "tab": "Layout",
    "group": "Size",
    "kind": "position",
    "components": [
      "une_button",
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid",
      "une_image"
    ]
  },
  {
    "id": "x",
    "label": "X Position",
    "tab": "Layout",
    "group": "Position",
    "kind": "position",
    "components": [
      "une_button",
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid",
      "une_image"
    ]
  },
  {
    "id": "y",
    "label": "Y Position",
    "tab": "Layout",
    "group": "Position",
    "kind": "position",
    "components": [
      "une_button",
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid",
      "une_image"
    ]
  },
  {
    "id": "defaultValue",
    "label": "Default Value",
    "tab": "Design",
    "group": "Default",
    "kind": "expression",
    "components": [
      "une_toggle",
      "une_lookup"
    ]
  },
  {
    "id": "tabHeight",
    "label": "Tab Height",
    "tab": "Design",
    "group": "Tabs",
    "kind": "number",
    "components": [
      "une_tabs"
    ],
    "default": 44,
    "min": 0
  },
  {
    "id": "tabWidth",
    "label": "Tab Width",
    "tab": "Design",
    "group": "Tabs",
    "kind": "number",
    "components": [
      "une_tabs"
    ],
    "default": 120,
    "min": 0
  },
  {
    "id": "tabCount",
    "label": "No of tabs",
    "tab": "Design",
    "group": "Tabs",
    "kind": "number",
    "components": [
      "une_tabs"
    ],
    "default": 3,
    "min": 1,
    "max": 30
  },
  {
    "id": "selectedTabColor",
    "label": "Selected Tab color",
    "tab": "Design",
    "group": "Tabs",
    "kind": "color",
    "components": [
      "une_tabs"
    ]
  },
  {
    "id": "tabColor",
    "label": "Tab Color",
    "tab": "Design",
    "group": "Tabs",
    "kind": "color",
    "components": [
      "une_tabs"
    ]
  },
  {
    "id": "cardsPerRow",
    "label": "No of Cards in row",
    "tab": "Layout",
    "group": "Cards",
    "kind": "number",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "default": 3,
    "min": 1,
    "max": 12
  },
  {
    "id": "cardsPerColumn",
    "label": "No of card in column",
    "tab": "Layout",
    "group": "Cards",
    "kind": "number",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "default": 1,
    "min": 1,
    "max": 12
  },
  {
    "id": "imageHeight",
    "label": "Image Height",
    "tab": "Design",
    "group": "Image",
    "kind": "number",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "default": 220,
    "min": 0
  },
  {
    "id": "headerBoxHeight",
    "label": "Header Box Height",
    "tab": "Design",
    "group": "Header",
    "kind": "number",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "default": 44,
    "min": 0
  },
  {
    "id": "wrapText",
    "label": "Wrap Text",
    "tab": "Design",
    "group": "Header",
    "kind": "boolean",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "default": true
  },
  {
    "id": "imagePlacement",
    "label": "Image Placement",
    "tab": "Design",
    "group": "Cards",
    "kind": "choice",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "choices": [
      "top",
      "left",
      "right",
      "bottom"
    ]
  },
  {
    "id": "imageBorderColor",
    "label": "Image Border",
    "tab": "Design",
    "group": "Image",
    "kind": "color",
    "components": [
      "une_item_grid",
      "une_image"
    ]
  },
  {
    "id": "headerBorderColor",
    "label": "Header Border",
    "tab": "Design",
    "group": "Header",
    "kind": "color",
    "components": [
      "une_item_grid",
      "une_image"
    ]
  },
  {
    "id": "headerAlignment",
    "label": "Header Alignment",
    "tab": "Design",
    "group": "Header",
    "kind": "align",
    "components": [
      "une_item_grid",
      "une_image"
    ]
  },
  {
    "id": "headerBold",
    "label": "Bold",
    "tab": "Layout",
    "group": "Header",
    "kind": "boolean",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "default": true
  },
  {
    "id": "objectApiName",
    "label": "Object",
    "tab": "Data",
    "group": "Source",
    "kind": "object",
    "components": [
      "une_toggle",
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid",
      "une_image"
    ]
  },
  {
    "id": "imageSource",
    "label": "Image Source",
    "tab": "Data",
    "group": "Source",
    "kind": "expression",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "field": true
  },
  {
    "id": "textSource",
    "label": "Text Source",
    "tab": "Data",
    "group": "Source",
    "kind": "expression",
    "components": [
      "une_lookup",
      "une_tabs",
      "une_input",
      "une_item_grid",
      "une_image"
    ],
    "field": true
  },
  {
    "id": "badgeText",
    "label": "Badge Text",
    "tab": "Data",
    "group": "Source",
    "kind": "expression",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "field": true
  },
  {
    "id": "badgeAlignment",
    "label": "Badge Alignment",
    "tab": "Design",
    "group": "Badge",
    "kind": "choice",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "choices": [
      "image-top-left",
      "image-top-center",
      "image-top-right",
      "image-center",
      "image-bottom-left",
      "image-bottom-center",
      "image-bottom-right",
      "text-left",
      "text-center",
      "text-right",
      "text-bottom"
    ]
  },
  {
    "id": "badgeTextSize",
    "label": "Badge Text Size",
    "tab": "Design",
    "group": "Badge",
    "kind": "number",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "default": 12,
    "min": 0
  },
  {
    "id": "badgeBold",
    "label": "Badge Bold",
    "tab": "Design",
    "group": "Badge",
    "kind": "boolean",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "default": true
  },
  {
    "id": "badgeTextColor",
    "label": "Badge Text Color",
    "tab": "Design",
    "group": "Badge",
    "kind": "color",
    "components": [
      "une_item_grid",
      "une_image"
    ]
  },
  {
    "id": "badgeVisible",
    "label": "Badge visible",
    "tab": "Design",
    "group": "Badge",
    "kind": "boolean",
    "components": [
      "une_item_grid",
      "une_image"
    ],
    "default": false
  }
];
export const UNE_RIBBON_GROUPS:Record<UneBuilderTab,readonly string[]>={
 Data:['Source'],Design:['Body','Typography','Default','Tabs','Image','Header','Cards','Badge'],
 Layout:['Size','Position','Cards','Header']
};
export const isUneBuilderApi=(value:string):value is UneBuilderApi=>
 (UNE_BUILDER_COMPONENTS as readonly string[]).includes(value);
export const isUneRibbonSupported=(api:UneBuilderApi,key:string)=>
 Boolean(UNE_RIBBON_PROPERTIES.find(row=>row.id===key)?.components.includes(api));
export const uneBuilderDefaults=(api:UneBuilderApi):Record<string,unknown>=>
 Object.fromEntries(UNE_RIBBON_PROPERTIES.filter(p=>p.components.includes(api)&&p.default!==undefined)
 .map(p=>[p.id,p.default]));
