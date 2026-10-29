// App-owned UNE settings. Never registered as SQL or ribbon property inventory.
export const propertyDefinitions = [
  {
    "propertyKey": "borderColor",
    "label": "Border colour",
    "kind": "COLOR",
    "displayOrder": 70,
    "defaultValue": ""
  },
  {
    "propertyKey": "radius",
    "label": "Corner radius (px)",
    "kind": "NUMBER",
    "displayOrder": 90,
    "defaultValue": 20
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
    "propertyKey": "navigationLabelFieldApiName",
    "label": "Navigation item field",
    "kind": "OBJECT_FIELD",
    "group": "Fields",
    "section": "Data",
    "displayOrder": 299
  },
  {
    "propertyKey": "items",
    "label": "Navigation links",
    "kind": "OPTIONS",
    "displayOrder": 300,
    "defaultValue": []
  },
  {
    "propertyKey": "helpText",
    "label": "Help text",
    "kind": "TEXT",
    "displayOrder": 860,
    "defaultValue": ""
  }
];
