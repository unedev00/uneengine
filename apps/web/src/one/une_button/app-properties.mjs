// App-owned UNE settings. Never registered as SQL or ribbon property inventory.
export const propertyDefinitions = [
  {
    "propertyKey": "surface",
    "label": "Surface",
    "kind": "SELECT",
    "displayOrder": 20,
    "defaultValue": "glass",
    "choices": [
      {
        "key": "glass",
        "label": "Frosted glass"
      },
      {
        "key": "solid",
        "label": "Solid"
      },
      {
        "key": "plain",
        "label": "Transparent"
      }
    ]
  },
  {
    "propertyKey": "accentColor",
    "label": "Custom accent colour",
    "kind": "COLOR",
    "displayOrder": 40,
    "defaultValue": ""
  },
  {
    "propertyKey": "backgroundColor",
    "label": "Surface colour",
    "kind": "COLOR",
    "displayOrder": 50,
    "defaultValue": ""
  },
  {
    "propertyKey": "textColor",
    "label": "Text colour",
    "kind": "COLOR",
    "displayOrder": 60,
    "defaultValue": ""
  },
  {
    "propertyKey": "borderColor",
    "label": "Border colour",
    "kind": "COLOR",
    "displayOrder": 70,
    "defaultValue": ""
  },
  {
    "propertyKey": "density",
    "label": "Spacing density",
    "kind": "SELECT",
    "displayOrder": 80,
    "defaultValue": "comfortable",
    "choices": [
      {
        "key": "compact",
        "label": "Compact"
      },
      {
        "key": "comfortable",
        "label": "Comfortable"
      },
      {
        "key": "spacious",
        "label": "Spacious"
      }
    ]
  },
  {
    "propertyKey": "radius",
    "label": "Corner radius (px)",
    "kind": "NUMBER",
    "displayOrder": 90,
    "defaultValue": 20
  },
  {
    "propertyKey": "padding",
    "label": "Padding (px)",
    "kind": "NUMBER",
    "displayOrder": 100,
    "defaultValue": 16
  },
  {
    "propertyKey": "gap",
    "label": "Gap (px)",
    "kind": "NUMBER",
    "displayOrder": 110,
    "defaultValue": 12
  },
  {
    "propertyKey": "shadow",
    "label": "Shadow",
    "kind": "SELECT",
    "displayOrder": 120,
    "defaultValue": "medium",
    "choices": [
      {
        "key": "none",
        "label": "None"
      },
      {
        "key": "small",
        "label": "Small"
      },
      {
        "key": "medium",
        "label": "Medium"
      },
      {
        "key": "large",
        "label": "Large"
      }
    ]
  },
  {
    "propertyKey": "glassBlur",
    "label": "Glass blur (px)",
    "kind": "NUMBER",
    "displayOrder": 130,
    "defaultValue": 12
  },
  {
    "propertyKey": "label",
    "label": "Component label",
    "kind": "TEXT",
    "displayOrder": 300,
    "defaultValue": "Continue"
  },
  {
    "propertyKey": "helpText",
    "label": "Help text",
    "kind": "TEXT",
    "displayOrder": 860,
    "defaultValue": ""
  }
];
