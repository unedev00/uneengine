# Page Builder remaining property inventory (after requested removals)

**AceChatter-only exception:** `une_conversation` is intentionally excluded from public Component Library and Page Builder Insert. Only 13 shared styling/source properties remain metadriven. All 100 component-specific settings, including the three button controls, live as ordinary AceChatter code defaults and existing runtime overrides are preserved. Existing saved runtime references remain resolvable.

Generated from UNE component manifests on the PR branch. The shared ribbon has a fixed slot order; applicable component controls are enabled and the others disabled.

**SQL inventory scope:** Bundled `une_*` components are seeded into `md_component_definitions` with `renderer_key='one-bundled:<api>'` and no per-property SQL entries. Their editable property inventory comes from these source manifests, so the requested property deletions are source-metadata changes, not SQL row deletions. No entire component was marked for deletion in the supplied list, so system SQL component rows remain registered. Version-owned `md_component_library_contract_properties` belongs to separately authored tenant components and has not been deleted. Existing published page values are preserved for compatibility.

## Shared ribbon — complete tab-by-tab property slots

These are the property definitions actually collected by the universal UNE ribbon. Each row remains in its fixed tab/group and is enabled only for the listed UNE components. **System/Canvas commands and non-UNE standard components are separate from this metadata table.**

### Component Data

**Source**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `objectApiName` | Source Object | calendar, item_grid, repeater, record_list, search, lookup, choice, cart, conversation, form, table, slot_picker, chart |

**Fields**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `ageRestrictedFieldApiName` | Age restriction field | cart |
| `badgeFieldApiName` | Card badge field | item_grid |
| `categoryFieldApiName` | Category field API name | item_grid, cart |
| `dateFieldApiName` | Event date | calendar |
| `descriptionFieldApiName` | Card description field | item_grid |
| `featuredFieldApiName` | Featured record flag field | item_grid |
| `imageFieldApiName` | Card image field | item_grid, cart |
| `nameFieldApiName` | Product name field | cart |
| `priceFieldApiName` | Card value or price field | item_grid, cart |
| `recordActiveFieldApiName` | Active record field | item_grid |
| `recordBadgeFieldApiName` | Record badge field | repeater |
| `recordNameFieldApiNames` | Possible contact name fields | lookup |
| `recordSortFieldApiName` | Record display-order field | item_grid |
| `recordSubtitleFieldApiName` | Subtitle | repeater, lookup |
| `recordTitleFieldApiName` | Record name | lookup |
| `recordTrailingFieldApiName` | Record trailing field | repeater |
| `recordValueFieldApiName` | Record ID | lookup |
| `relatedFieldApiName` | Lookup field linking record to selected parent | item_grid |
| `resourceFieldApiName` | Staff/resource field | calendar |
| `searchFieldApiName` | Record search field | repeater, lookup |
| `searchFieldApiNames` | Search fields | item_grid |
| `serviceFieldApiName` | Service field | calendar |
| `skuFieldApiName` | SKU field | cart |
| `titleFieldApiName` | Event title | calendar, item_grid |
| `vatApplicableFieldApiName` | VAT applicability field | cart |

**Filters**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `filterKey` | Shared category filter | item_grid |
| `relatedFilterKey` | Selected parent shared key | item_grid |
| `searchKey` | Shared search filter | item_grid, search |
| `selectedCategory` | Selected category | item_grid |
| `selectionFilterKey` | Selected record shared state key | item_grid, repeater, record_list |

**Records**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `items` | Navigation links | navigation, menu |
| `loading` | Loading state | lookup |
| `loadingText` | Loading message | lookup |

### Component Content

**Text**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `allCategoriesLabel` | All categories label | cart |
| `basketTitle` | Basket heading | cart |
| `categoryTabsLabel` | Category tabs accessibility label | cart |
| `clearLabel` | Clear basket label | cart |
| `descriptionExpression` | Supporting expression | item_grid |
| `displayButtonLabel` | Customer display button | cart |
| `emptyBasketText` | Empty basket message | cart |
| `emptyText` | Empty state message | item_grid, lookup |
| `helpText` | Input help text | input |
| `label` | Button label | button, input, toggle, search, lookup |
| `nextTransactionLabel` | Next customer button label | cart |
| `openLabel` | Open button | modal |
| `placeholder` | Placeholder | input, search, lookup, conversation |
| `showDescription` | Show card description | item_grid |
| `submitLabel` | Search button label | search |
| `tabLabel` | Tab group accessibility label | tabs |
| `text` | Text | text, badge |
| `title` | Title | modal, item_grid, cart, conversation, form, metric |
| `topbarActionLabelProperty` | Topbar action label property | cart |
| `totalLabel` | Basket total label | cart |
| `valueTextAlign` | Value alignment | item_grid |

**Image**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `imageExpression` | Image expression | item_grid |
| `missingImageBehavior` | When image missing | item_grid |

**Options**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `controlledOpen` | Control visibility from page state | modal |
| `controlledSelection` | Control selected tab from page state | tabs, conversation |
| `controlledValue` | Control search value from page state | search |
| `disabled` | Disabled | button, input, toggle, lookup |
| `inputMode` | Virtual keyboard type | input |
| `required` | Required | input |
| `selectedIndex` | Selected tab index from page state | tabs |
| `showAddIcon` | Show Add button | item_grid |
| `showCategoryTabs` | Show category tabs | cart |
| `showCloseButton` | Show close button | modal |
| `showHeading` | Show gallery heading | item_grid |
| `showPanel` | Show content | tabs |
| `showSubmitButton` | Show search button | search |
| `showSuggestions` | Show record suggestions | search |
| `showTrigger` | Show built-in open button | modal |
| `showVatTotal` | Show VAT total | cart |
| `showWeekends` | Show weekends | calendar |
| `variant` | Variant | button |
| `viewMode` | Presentation | cart, conversation |

**Component content**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `autoComplete` | Browser autocomplete hint | input |
| `badgeExpression` | Badge expression | item_grid |
| `basketPresentation` | Basket presentation | cart |
| `cartTargetKey` | Optional shared basket | item_grid, cart |
| `closeOnBackdrop` | Close on backdrop click | modal |
| `closeOnEscape` | Close on Escape key | modal |
| `currencyCode` | Currency code (only for monetary values) | item_grid, cart |
| `customerDisplayUrl` | Customer display URL | cart |
| `fields` | Line item fields | line_items |
| `firstDayOfWeek` | First day of week | calendar |
| `headingExpression` | Heading expression | item_grid |
| `inactivityResetSeconds` | Reset abandoned customer session after seconds (0 = disabled, 30-3600) | cart |
| `inputType` | Input type | input |
| `isOpen` | Page state: dialog is open | modal |
| `maxLength` | Maximum text length | input |
| `multiline` | Multiline | input |
| `pattern` | Input validation pattern | input |
| `resourceValue` | Selected staff/resource | calendar |
| `searchValue` | Search query from page state | lookup |
| `selectedDate` | Selected date | calendar |
| `selectionBehavior` | When someone selects a card | item_grid |
| `selectionPayload` | Selection event value | lookup |
| `separateAddButton` | Separate Add button action | item_grid |
| `serviceValue` | Selected service | calendar |
| `standalonePresentation` | Standalone paired display | cart |
| `startOpen` | Open initially | modal |
| `storeName` | Store name | cart |
| `tabs` | Tab labels | tabs |
| `timeZone` | Business timezone | calendar |
| `topbarActionEvent` | Topbar action event | cart |
| `topbarActionRequiresProperty` | Topbar action requires property | cart |
| `value` | Input value from page state | input, toggle, search, lookup |
| `valueColor` | Value colour | item_grid |
| `valueLineLimit` | Value maximum lines | item_grid |
| `vatRate` | Tax rate (%) | cart |
| `view` | Calendar view | calendar |

### Component Properties

**Surface**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `backgroundColor` | Surface colour | text, calendar, button, input, toggle, badge, stack, tabs, modal, item_grid, search, lookup, cart, conversation |
| `borderColor` | Border colour | text, image, calendar, button, card, input, toggle, badge, stack, tabs, container, grid, split_pane, navigation, menu, modal, drawer, item_grid, repeater, record_list, search, lookup, choice, cart, conversation, form, table, line_items, date_picker, slot_picker, metric, alert, progress, document_viewer, chart, option_groups |
| `radius` | Corner radius (px) | text, image, calendar, button, card, input, toggle, badge, stack, tabs, container, grid, split_pane, navigation, menu, modal, drawer, item_grid, repeater, record_list, search, lookup, choice, cart, conversation, form, table, line_items, date_picker, slot_picker, metric, alert, progress, document_viewer, chart, option_groups |
| `shadow` | Shadow | text, image, calendar, button, card, input, toggle, badge, stack, tabs, container, grid, split_pane, navigation, menu, modal, drawer, item_grid, repeater, record_list, search, lookup, choice, cart, conversation, form, table, line_items, date_picker, slot_picker, metric, alert, progress, document_viewer, chart, option_groups |
| `textColor` | Text colour | text, calendar, button, input, toggle, badge, stack, tabs, modal, item_grid, search, lookup, cart, conversation |

**Card**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `cardBackgroundColor` | Card background | item_grid |
| `cardBorderColor` | Card border colour | item_grid |
| `cardBorderWidth` | Card border width (px) | item_grid |
| `cardHover` | Card hover effect | item_grid |
| `cardRadius` | Card radius (px) | item_grid |
| `cardShadow` | Card shadow | item_grid |

**Heading**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `headingColor` | Heading colour | item_grid |
| `headingFontSize` | Heading size (px) | item_grid |
| `headingFontWeight` | Heading weight | item_grid |
| `headingLineLimit` | Heading maximum lines | item_grid |
| `headingTextAlign` | Heading alignment | item_grid |

**Supporting text**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `descriptionColor` | Supporting colour | item_grid |
| `descriptionFontSize` | Supporting size (px) | item_grid |
| `descriptionFontWeight` | Supporting text weight | item_grid |
| `descriptionLineLimit` | Supporting text maximum lines | item_grid |
| `descriptionTextAlign` | Supporting text alignment | item_grid |

**Badge**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `badgeBackgroundColor` | Badge background | item_grid |
| `badgeFontSize` | Badge text size (px) | item_grid |
| `badgeFontWeight` | Badge weight | item_grid |
| `badgeTextColor` | Badge text colour | item_grid |

**Image**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `imageFit` | Image fit | item_grid |
| `imageShape` | Image shape | item_grid |

**Appearance**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `accentColor` | Custom accent colour | text, calendar, button, input, toggle, badge, stack, tabs, modal, item_grid, search, lookup, cart, conversation |
| `glassBlur` | Glass blur (px) | text, calendar, button, input, toggle, badge, stack, tabs, modal, item_grid, search, lookup, cart, conversation |
| `surface` | Surface | text, calendar, button, input, toggle, badge, stack, tabs, modal, item_grid, search, lookup, cart, conversation |
| `tone` | Colour palette | text, calendar, button, input, toggle, badge, stack, tabs, modal, item_grid, search, lookup, cart, conversation |

**Additional styling**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `fontSize` | Font size | text |
| `valueFontSize` | Value size (px) | item_grid |
| `valueFontWeight` | Value weight | item_grid |

### Component Layout

**Size**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `cardMinHeight` | Card minimum height (px) | item_grid |
| `cardWidth` | Card width (px) | item_grid |
| `catalogueWidthPercent` | Catalogue width percentage | cart |
| `imageHeight` | Image height (px) | item_grid |
| `imageWidth` | Image width (px) | item_grid |
| `productCardMinWidth` | Minimum product card width | cart |

**Position**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `imagePosition` | Image position | item_grid |

**Spacing**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `cardDensity` | Card density | item_grid |
| `cardPadding` | Card padding (px) | item_grid |
| `density` | Spacing density | text, calendar, button, input, toggle, badge, stack, tabs, modal, item_grid, search, lookup, cart, conversation |
| `gap` | Gap (px) | text, calendar, button, input, toggle, badge, stack, tabs, modal, item_grid, search, lookup, cart, conversation |
| `padding` | Padding (px) | text, calendar, button, input, toggle, badge, stack, tabs, modal, item_grid, search, lookup, cart, conversation |

**Container**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `detailRows` | Detail rows | item_grid |
| `direction` | Direction | stack |
| `featuredColumnSpan` | Featured tile width (columns) | item_grid |
| `featuredRowSpan` | Featured tile height (rows) | item_grid |
| `imageAspectRatio` | Image aspect ratio | item_grid |
| `rows` | Rows | input |
| `wrap` | Wrap | stack |

**Nesting**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `layoutContainer` | Accept child components | stack, tabs, modal |

### Component Responsive

**Responsive layout**

| Property key | Display label | Enabled for UNE components |
|---|---|---|

**Mobile behaviour**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `fullScreenOnMobile` | Full-screen dialog on phones | modal |
| `normaliseSelectedPhone` | Normalise selected phone digits | lookup |
| `recordPhoneFieldApiNames` | Possible phone fields, first valid selected | lookup |

### Component Action

**Events**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `eventEndFieldApiName` | Event end field | calendar |
| `eventStartFieldApiName` | Event start field | calendar |
| `operationEvents` | Configured operation events | cart |

**Actions**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `checkoutLabel` | Checkout button label | cart |

**Flows**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `checkoutChangeOutput` | Checkout change (minor units) output | cart |
| `checkoutMessageOutput` | Checkout message output | cart |
| `checkoutRequestOutput` | Checkout request output | cart |
| `checkoutStatusOutput` | Checkout lifecycle output | cart |
| `stateKeyInput` | State key input | cart |
| `statePollIntervalMs` | State polling interval (ms) | cart |
| `stateReadFlowApiName` | State read Flow | cart |
| `stateRecordIdOutput` | State record output | cart |
| `stateSessionQueryParam` | Display session query parameter | cart |
| `stateSyncEnabled` | Synchronise paired display through Flow | cart |
| `stateValueFieldApiName` | State value field | cart |
| `stateValueInput` | State value input | cart |
| `stateValueOutput` | State value output | cart |
| `stateVersionFieldApiName` | State revision field | cart |
| `stateVersionOutput` | State revision output | cart |
| `stateWriteFlowApiName` | State write Flow | cart |

## une_text

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `text` | Text | TEXT |
| `fontSize` | Font size | NUMBER |

## une_image

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_calendar

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `view` | Calendar view | SELECT |
| `objectApiName` | Source Object | OBJECT |
| `dateFieldApiName` | Event date | OBJECT_FIELD |
| `titleFieldApiName` | Event title | OBJECT_FIELD |
| `selectedDate` | Selected date | TEXT |
| `timeZone` | Business timezone | TEXT |
| `eventStartFieldApiName` | Event start field | OBJECT_FIELD |
| `eventEndFieldApiName` | Event end field | OBJECT_FIELD |
| `resourceFieldApiName` | Staff/resource field | OBJECT_FIELD |
| `resourceValue` | Selected staff/resource | TEXT |
| `serviceFieldApiName` | Service field | OBJECT_FIELD |
| `serviceValue` | Selected service | TEXT |
| `firstDayOfWeek` | First day of week | SELECT |
| `showWeekends` | Show weekends | BOOLEAN |

## une_button

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `label` | Button label | TEXT |
| `variant` | Variant | SELECT |
| `disabled` | Disabled | BOOLEAN |

## une_card

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_input

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `label` | Label | TEXT |
| `placeholder` | Placeholder | TEXT |
| `inputType` | Input type | SELECT |
| `required` | Required | BOOLEAN |
| `disabled` | Disabled | BOOLEAN |
| `multiline` | Multiline | BOOLEAN |
| `rows` | Rows | NUMBER |
| `value` | Input value from page state | TEXT |
| `maxLength` | Maximum text length | NUMBER |
| `autoComplete` | Browser autocomplete hint | TEXT |
| `inputMode` | Virtual keyboard type | SELECT |
| `pattern` | Input validation pattern | TEXT |
| `helpText` | Input help text | TEXT |

## une_toggle

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `label` | Label | TEXT |
| `value` | Initial value | BOOLEAN |
| `disabled` | Disabled | BOOLEAN |

## une_badge

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `text` | Text | TEXT |

## une_stack

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `layoutContainer` | Accept child components | BOOLEAN |
| `direction` | Direction | SELECT |
| `wrap` | Wrap | BOOLEAN |

## une_tabs

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `layoutContainer` | Accept child components | BOOLEAN |
| `tabs` | Tab labels | TEXT |
| `showPanel` | Show content | BOOLEAN |
| `selectedIndex` | Selected tab index from page state | NUMBER |
| `controlledSelection` | Control selected tab from page state | BOOLEAN |
| `tabLabel` | Tab group accessibility label | TEXT |

## une_container

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_grid

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_split_pane

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_navigation

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `items` | Navigation links | OPTIONS |

## une_menu

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `items` | Menu links | OPTIONS |

## une_modal

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `layoutContainer` | Accept child components | BOOLEAN |
| `title` | Title | TEXT |
| `openLabel` | Open button | TEXT |
| `startOpen` | Open initially | BOOLEAN |
| `controlledOpen` | Control visibility from page state | BOOLEAN |
| `isOpen` | Page state: dialog is open | BOOLEAN |
| `showTrigger` | Show built-in open button | BOOLEAN |
| `showCloseButton` | Show close button | BOOLEAN |
| `closeOnBackdrop` | Close on backdrop click | BOOLEAN |
| `closeOnEscape` | Close on Escape key | BOOLEAN |
| `fullScreenOnMobile` | Full-screen dialog on phones | BOOLEAN |

## une_drawer

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_item_grid

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `title` | Gallery heading | TEXT |
| `categoryFieldApiName` | Category field API name | OBJECT_FIELD |
| `selectedCategory` | Selected category | TEXT |
| `filterKey` | Shared category filter | TEXT |
| `cartTargetKey` | Optional shared basket | TEXT |
| `imageFieldApiName` | Card image field | OBJECT_FIELD |
| `titleFieldApiName` | Card title field | OBJECT_FIELD |
| `priceFieldApiName` | Card value or price field | OBJECT_FIELD |
| `currencyCode` | Currency code (only for monetary values) | TEXT |
| `searchKey` | Shared search filter | TEXT |
| `searchFieldApiNames` | Search fields | TEXT |
| `selectionBehavior` | When someone selects a card | SELECT |
| `selectionFilterKey` | Selected record shared state key | TEXT |
| `relatedFilterKey` | Selected parent shared key | TEXT |
| `relatedFieldApiName` | Lookup field linking record to selected parent | OBJECT_FIELD |
| `showHeading` | Show gallery heading | BOOLEAN |
| `recordSortFieldApiName` | Record display-order field | OBJECT_FIELD |
| `recordActiveFieldApiName` | Active record field | OBJECT_FIELD |
| `descriptionFieldApiName` | Card description field | OBJECT_FIELD |
| `showDescription` | Show card description | BOOLEAN |
| `badgeFieldApiName` | Card badge field | OBJECT_FIELD |
| `featuredFieldApiName` | Featured record flag field | OBJECT_FIELD |
| `featuredColumnSpan` | Featured tile width (columns) | NUMBER |
| `featuredRowSpan` | Featured tile height (rows) | NUMBER |
| `cardDensity` | Card density | SELECT |
| `cardPadding` | Card padding (px) | NUMBER |
| `cardRadius` | Card radius (px) | NUMBER |
| `cardMinHeight` | Card minimum height (px) | NUMBER |
| `cardBackgroundColor` | Card background | COLOR |
| `cardBorderColor` | Card border colour | COLOR |
| `cardBorderWidth` | Card border width (px) | NUMBER |
| `cardShadow` | Card shadow | SELECT |
| `cardHover` | Card hover effect | SELECT |
| `imageHeight` | Image height (px) | NUMBER |
| `imageFit` | Image fit | SELECT |
| `imageAspectRatio` | Image aspect ratio | SELECT |
| `objectApiName` | Source Object | OBJECT |
| `imageWidth` | Image width (px) | NUMBER |
| `imageShape` | Image shape | SELECT |
| `imagePosition` | Image position | SELECT |
| `missingImageBehavior` | When image missing | SELECT |
| `headingFontSize` | Heading size (px) | NUMBER |
| `headingColor` | Heading colour | COLOR |
| `descriptionFontSize` | Supporting size (px) | NUMBER |
| `descriptionColor` | Supporting colour | COLOR |
| `valueFontSize` | Value size (px) | NUMBER |
| `valueColor` | Value colour | COLOR |
| `showAddIcon` | Show Add button | BOOLEAN |
| `separateAddButton` | Separate Add button action | BOOLEAN |
| `headingFontWeight` | Heading weight | SELECT |
| `headingTextAlign` | Heading alignment | SELECT |
| `headingLineLimit` | Heading maximum lines | NUMBER |
| `descriptionFontWeight` | Supporting text weight | SELECT |
| `descriptionTextAlign` | Supporting text alignment | SELECT |
| `descriptionLineLimit` | Supporting text maximum lines | NUMBER |
| `valueFontWeight` | Value weight | SELECT |
| `valueTextAlign` | Value alignment | SELECT |
| `valueLineLimit` | Value maximum lines | NUMBER |
| `cardWidth` | Card width (px) | NUMBER |
| `detailRows` | Detail rows | COLLECTION |
| `imageExpression` | Image expression | TEXT |
| `headingExpression` | Heading expression | TEXT |
| `descriptionExpression` | Supporting expression | TEXT |
| `badgeExpression` | Badge expression | TEXT |
| `badgeBackgroundColor` | Badge background | COLOR |
| `badgeTextColor` | Badge text colour | COLOR |
| `badgeFontSize` | Badge text size (px) | NUMBER |
| `badgeFontWeight` | Badge weight | SELECT |
| `emptyText` | Empty state message | TEXT |

## une_repeater

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |
| `recordSubtitleFieldApiName` | Subtitle | OBJECT_FIELD |
| `selectionFilterKey` | Selected record state key | TEXT |
| `recordBadgeFieldApiName` | Record badge field | OBJECT_FIELD |
| `recordTrailingFieldApiName` | Record trailing field | OBJECT_FIELD |
| `searchFieldApiName` | Record search field | OBJECT_FIELD |

## une_record_list

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |
| `selectionFilterKey` | Selected record state key | TEXT |

## une_search

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `placeholder` | Search placeholder | TEXT |
| `searchKey` | Shared search key | TEXT |
| `objectApiName` | Source Object | OBJECT |
| `value` | Search term from page state | TEXT |
| `label` | Search label | TEXT |
| `showSubmitButton` | Show search button | BOOLEAN |
| `submitLabel` | Search button label | TEXT |
| `showSuggestions` | Show record suggestions | BOOLEAN |
| `controlledValue` | Control search value from page state | BOOLEAN |

## une_lookup

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `objectApiName` | Source Object | OBJECT |
| `loading` | Loading state | BOOLEAN |
| `emptyText` | Empty message | TEXT |
| `label` | Label | TEXT |
| `recordTitleFieldApiName` | Record name | OBJECT_FIELD |
| `recordValueFieldApiName` | Record ID | OBJECT_FIELD |
| `placeholder` | Placeholder | TEXT |
| `value` | Selected ID | TEXT |
| `selectionPayload` | Selection event value | SELECT |
| `recordSubtitleFieldApiName` | Record subtitle field | OBJECT_FIELD |
| `searchFieldApiName` | Search field | OBJECT_FIELD |
| `searchValue` | Search query from page state | TEXT |
| `disabled` | Disable selection | BOOLEAN |
| `loadingText` | Loading message | TEXT |
| `recordPhoneFieldApiNames` | Possible phone fields, first valid selected | TEXT |
| `recordNameFieldApiNames` | Possible contact name fields | TEXT |
| `normaliseSelectedPhone` | Normalise selected phone digits | BOOLEAN |

## une_choice

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |

## une_cart

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `viewMode` | Presentation | SELECT |
| `title` | Title | TEXT |
| `nameFieldApiName` | Product name field | OBJECT_FIELD |
| `priceFieldApiName` | Product price field | OBJECT_FIELD |
| `skuFieldApiName` | SKU field | OBJECT_FIELD |
| `imageFieldApiName` | Product image field | OBJECT_FIELD |
| `ageRestrictedFieldApiName` | Age restriction field | OBJECT_FIELD |
| `vatApplicableFieldApiName` | VAT applicability field | OBJECT_FIELD |
| `customerDisplayUrl` | Customer display URL | TEXT |
| `currencyCode` | Currency code | TEXT |
| `showVatTotal` | Show VAT total | BOOLEAN |
| `stateSyncEnabled` | Synchronise paired display through Flow | BOOLEAN |
| `stateReadFlowApiName` | State read Flow | TEXT |
| `stateWriteFlowApiName` | State write Flow | TEXT |
| `stateValueFieldApiName` | State value field | OBJECT_FIELD |
| `stateVersionFieldApiName` | State revision field | OBJECT_FIELD |
| `stateKeyInput` | State key input | TEXT |
| `stateValueInput` | State value input | TEXT |
| `stateValueOutput` | State value output | TEXT |
| `stateVersionOutput` | State revision output | TEXT |
| `stateRecordIdOutput` | State record output | TEXT |
| `statePollIntervalMs` | State polling interval (ms) | NUMBER |
| `stateSessionQueryParam` | Display session query parameter | TEXT |
| `operationEvents` | Configured operation events | TEXT |
| `standalonePresentation` | Standalone paired display | BOOLEAN |
| `storeName` | Store name | TEXT |
| `displayButtonLabel` | Customer display button | TEXT |
| `topbarActionEvent` | Topbar action event | TEXT |
| `topbarActionLabelProperty` | Topbar action label property | TEXT |
| `topbarActionRequiresProperty` | Topbar action requires property | TEXT |
| `catalogueWidthPercent` | Catalogue width percentage | NUMBER |
| `productCardMinWidth` | Minimum product card width | NUMBER |
| `cartTargetKey` | Shared basket key | TEXT |
| `categoryFieldApiName` | Product category field | OBJECT_FIELD |
| `showCategoryTabs` | Show category tabs | BOOLEAN |
| `categoryTabsLabel` | Category tabs accessibility label | TEXT |
| `allCategoriesLabel` | All categories label | TEXT |
| `vatRate` | Tax rate (%) | NUMBER |
| `checkoutStatusOutput` | Checkout lifecycle output | TEXT |
| `checkoutRequestOutput` | Checkout request output | TEXT |
| `checkoutMessageOutput` | Checkout message output | TEXT |
| `checkoutChangeOutput` | Checkout change (minor units) output | TEXT |
| `nextTransactionLabel` | Next customer button label | TEXT |
| `inactivityResetSeconds` | Reset abandoned customer session after seconds (0 = disabled, 30-3600) | NUMBER |
| `basketPresentation` | Basket presentation | SELECT |
| `basketTitle` | Basket heading | TEXT |
| `checkoutLabel` | Checkout button label | TEXT |
| `emptyBasketText` | Empty basket message | TEXT |
| `totalLabel` | Basket total label | TEXT |
| `clearLabel` | Clear basket label | TEXT |
| `objectApiName` | Source Object | OBJECT |

## une_conversation

| Property key | Label | Kind |
|---|---|---|
| `surface` | Surface | SELECT |
| `tone` | Colour palette | SELECT |
| `accentColor` | Custom accent colour | COLOR |
| `backgroundColor` | Surface colour | COLOR |
| `textColor` | Text colour | COLOR |
| `borderColor` | Border colour | COLOR |
| `density` | Spacing density | SELECT |
| `radius` | Corner radius (px) | NUMBER |
| `padding` | Padding (px) | NUMBER |
| `gap` | Gap (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `glassBlur` | Glass blur (px) | NUMBER |
| `objectApiName` | Source Object | OBJECT |

## une_form

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |
| `title` | Form title | TEXT |

## une_table

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |

## une_line_items

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `fields` | Line item fields | FIELD_LIST |

## une_date_picker

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_slot_picker

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |

## une_metric

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `title` | Label | TEXT |

## une_alert

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_progress

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_document_viewer

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_chart

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |

## une_option_groups

| Property key | Label | Kind |
|---|---|---|
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

