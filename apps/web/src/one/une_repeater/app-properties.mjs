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
    "propertyKey": "objectApiName",
    "label": "Source Object",
    "kind": "OBJECT",
    "displayOrder": 300,
    "defaultValue": ""
  },
  {
    "propertyKey": "recordSubtitleFieldApiName",
    "label": "Subtitle",
    "kind": "OBJECT_FIELD",
    "displayOrder": 360,
    "defaultValue": ""
  },
  {
    "propertyKey": "selectionFilterKey",
    "label": "Selected record state key",
    "kind": "TEXT",
    "displayOrder": 380,
    "defaultValue": "selectedRecord"
  },
  {
    "propertyKey": "recordBadgeFieldApiName",
    "label": "Record badge field",
    "kind": "OBJECT_FIELD",
    "displayOrder": 810,
    "defaultValue": ""
  },
  {
    "propertyKey": "recordTrailingFieldApiName",
    "label": "Record trailing field",
    "kind": "OBJECT_FIELD",
    "displayOrder": 820,
    "defaultValue": ""
  },
  {
    "propertyKey": "searchFieldApiName",
    "label": "Record search field",
    "kind": "OBJECT_FIELD",
    "displayOrder": 830,
    "defaultValue": ""
  },
  {
    "propertyKey": "sourceObjectApiName",
    "label": "Source Object — Flow Records",
    "kind": "TEXT",
    "displayOrder": 890,
    "defaultValue": ""
  },
  {
    "propertyKey": "helpText",
    "label": "Help text",
    "kind": "TEXT",
    "displayOrder": 860,
    "defaultValue": ""
  }
];
