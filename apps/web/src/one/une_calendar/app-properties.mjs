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
    "propertyKey": "tone",
    "label": "Colour palette",
    "kind": "SELECT",
    "displayOrder": 30,
    "defaultValue": "blue",
    "choices": [
      {
        "key": "blue",
        "label": "iOS blue"
      },
      {
        "key": "mint",
        "label": "Mint"
      },
      {
        "key": "purple",
        "label": "Purple"
      },
      {
        "key": "orange",
        "label": "Orange"
      },
      {
        "key": "neutral",
        "label": "Neutral"
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
    "propertyKey": "view",
    "label": "Calendar view",
    "kind": "SELECT",
    "displayOrder": 900,
    "defaultValue": "month",
    "choices": [
      {
        "key": "month",
        "label": "Month"
      },
      {
        "key": "week",
        "label": "Week"
      },
      {
        "key": "day",
        "label": "Day"
      },
      {
        "key": "agenda",
        "label": "Agenda"
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
    "propertyKey": "dateFieldApiName",
    "label": "Event date",
    "kind": "OBJECT_FIELD",
    "displayOrder": 300,
    "defaultValue": ""
  },
  {
    "propertyKey": "titleFieldApiName",
    "label": "Event title",
    "kind": "OBJECT_FIELD",
    "displayOrder": 300,
    "defaultValue": ""
  },
  {
    "propertyKey": "selectedDate",
    "label": "Selected date",
    "kind": "TEXT",
    "displayOrder": 900,
    "defaultValue": ""
  },
  {
    "propertyKey": "timeZone",
    "label": "Business timezone",
    "kind": "TEXT",
    "displayOrder": 900,
    "defaultValue": ""
  },
  {
    "propertyKey": "eventStartFieldApiName",
    "label": "Event start field",
    "kind": "OBJECT_FIELD",
    "displayOrder": 900,
    "defaultValue": ""
  },
  {
    "propertyKey": "eventEndFieldApiName",
    "label": "Event end field",
    "kind": "OBJECT_FIELD",
    "displayOrder": 900,
    "defaultValue": ""
  },
  {
    "propertyKey": "resourceFieldApiName",
    "label": "Staff/resource field",
    "kind": "OBJECT_FIELD",
    "displayOrder": 900,
    "defaultValue": ""
  },
  {
    "propertyKey": "resourceValue",
    "label": "Selected staff/resource",
    "kind": "TEXT",
    "displayOrder": 900,
    "defaultValue": ""
  },
  {
    "propertyKey": "serviceFieldApiName",
    "label": "Service field",
    "kind": "OBJECT_FIELD",
    "displayOrder": 900,
    "defaultValue": ""
  },
  {
    "propertyKey": "serviceValue",
    "label": "Selected service",
    "kind": "TEXT",
    "displayOrder": 900,
    "defaultValue": ""
  },
  {
    "propertyKey": "firstDayOfWeek",
    "label": "First day of week",
    "kind": "SELECT",
    "displayOrder": 900,
    "defaultValue": "monday",
    "choices": [
      {
        "key": "monday",
        "label": "Monday"
      },
      {
        "key": "sunday",
        "label": "Sunday"
      }
    ]
  },
  {
    "propertyKey": "showWeekends",
    "label": "Show weekends",
    "kind": "BOOLEAN",
    "displayOrder": 900,
    "defaultValue": true
  },
  {
    "propertyKey": "defaultValue",
    "label": "Default Value",
    "kind": "SELECT",
    "group": "Calendar",
    "section": "Design",
    "displayOrder": 820,
    "defaultValue": "today",
    "choices": [{"key":"today","label":"Today"},{"key":"","label":"None"}]
  },
  {
    "propertyKey": "defaultValueColor",
    "label": "Default Value Color",
    "kind": "COLOR",
    "group": "Calendar",
    "section": "Design",
    "displayOrder": 821
  },
  {
    "propertyKey": "helpText",
    "label": "Help text",
    "kind": "TEXT",
    "displayOrder": 860,
    "defaultValue": ""
  }
];
