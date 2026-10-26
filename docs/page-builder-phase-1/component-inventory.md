# Page Builder source component inventory

Snapshot: `b3c1b78cbcb1bccaf97d381887b08eebb68bc2cd` (26 October 2026).

**Scope:** all 44 indexed One/UNE descriptors, two core bundled registrations, and the standard/special page blocks below. Tenant-authored SQL registrations are dynamic and are preserved by identity; this source inventory does not claim to enumerate every tenant database.

## Shared editor and runtime paths

- Registered entries use [CustomComponentPropertyEditor.tsx](../../apps/web/src/core/builders/ComponentProperties/CustomComponentPropertyEditor.tsx) and [componentSettingDefinitions.ts](../../apps/web/src/core/components/Properties/componentSettingDefinitions.ts).
- Runtime uses [RegisteredComponent.tsx](../../apps/web/src/core/components/RegisteredComponent/RegisteredComponent.tsx); bound data/events use [MetadataBoundPageComponent.tsx](../../apps/web/src/core/pages/MetadataBoundPageComponent/MetadataBoundPageComponent.tsx).
- Discovery uses [componentLibraryDiscovery.ts](../../apps/web/src/core/components/Registry/componentLibraryDiscovery.ts); SQL-authorised bundled resolution uses [bundledRegistryClient.ts](../../apps/web/src/core/components/Registry/bundledRegistryClient.ts).
- UNE wrappers reuse [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx) for appearance. Descriptor existence is not a claim that every declared property behaves correctly; later phases verify consumption.

## Shared property sets

The catalog loader adds the UNE appearance mixin only where the component has not declared the same key. Component declarations win. Preserve instance values and unknown legacy properties.

UNE appearance mixin: [appearance-properties.json](../../apps/web/src/one/une/shared/appearance-properties.json).

`fontFamily` (SELECT), `fontSize` (NUMBER), `fontWeight` (SELECT), `lineHeight` (NUMBER), `letterSpacing` (NUMBER), `textAlign` (SELECT), `width` (TEXT), `height` (TEXT), `minWidth` (TEXT), `maxWidth` (TEXT), `minHeight` (TEXT), `maxHeight` (TEXT), `margin` (NUMBER), `opacity` (NUMBER), `borderWidth` (NUMBER), `hideOnPhone` (BOOLEAN), `hideOnTablet` (BOOLEAN), `hideOnDesktop` (BOOLEAN)

The One manifest also exports the following commonProperties. Do not assume that export automatically makes every setting effective on every renderer; inspect the consumer before extending it.

`theme` (SELECT), `size` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `opacity` (NUMBER), `width` (TEXT), `height` (TEXT), `align` (SELECT), `desktopColumns` (NUMBER), `tabletColumns` (NUMBER), `mobileColumns` (NUMBER), `hideOnPhone` (BOOLEAN), `objectApiName` (TEXT), `fieldApiName` (OBJECT_FIELD), `actionFlowApiName` (FLOW), `fontFamily` (SELECT), `fontSize` (NUMBER), `fontWeight` (SELECT), `lineHeight` (NUMBER), `letterSpacing` (NUMBER), `textAlign` (SELECT), `margin` (NUMBER), `minWidth` (TEXT), `maxWidth` (TEXT), `minHeight` (TEXT), `maxHeight` (TEXT), `borderWidth` (NUMBER), `hideOnTablet` (BOOLEAN), `hideOnDesktop` (BOOLEAN), `cardDensity` (SELECT), `cardPadding` (NUMBER), `cardRadius` (NUMBER), `cardMinHeight` (NUMBER), `cardBackgroundColor` (COLOR), `cardBorderColor` (COLOR), `cardBorderWidth` (NUMBER), `cardShadow` (SELECT), `cardHover` (SELECT), `imageHeight` (NUMBER), `imageFit` (SELECT), `imageAspectRatio` (SELECT), `showImage` (BOOLEAN), `showTitle` (BOOLEAN), `showPrice` (BOOLEAN), `showAddIcon` (BOOLEAN)

## Registered source components

Every entry below is retained. **Reuse** means retain the existing capability; **Extend** identifies a parity target, not a claim that an extension is already implemented. Descriptor links contain exact labels, defaults, choices, binding flags, versions and sizing. Properties listed here are component-local declarations; UNE also receives the mixin above. Events are declared event names, not proof of a bound Flow.

### OneText

Universal Text component; metadata-configured presentation, data and events.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/OneText/component.json); renderer: [OneText.jsx](../../apps/web/src/one/OneText/OneText.jsx); styles: [OneText.css](../../apps/web/src/one/OneText/OneText.css).
- Surface(s): page, dashboard, flow; version: 2.
- Direct renderer dependencies: [OneDisplay.jsx](../../apps/web/src/one/shared/OneDisplay.jsx).
- Declared events: None.
- Declared properties: `kind` (SELECT), `text` (TEXT), `fontSize` (NUMBER).

### OneBadge

Universal Badge component; metadata-configured presentation, data and events.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/OneBadge/component.json); renderer: [OneBadge.jsx](../../apps/web/src/one/OneBadge/OneBadge.jsx); styles: [OneBadge.css](../../apps/web/src/one/OneBadge/OneBadge.css).
- Surface(s): page, dashboard, flow; version: 2.
- Direct renderer dependencies: [OneDisplay.jsx](../../apps/web/src/one/shared/OneDisplay.jsx).
- Declared events: None.
- Declared properties: `kind` (SELECT), `text` (TEXT), `tone` (SELECT).

### OneButton

Universal Button component; metadata-configured presentation, data and events.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/OneButton/component.json); renderer: [OneButton.jsx](../../apps/web/src/one/OneButton/OneButton.jsx); styles: [OneButton.css](../../apps/web/src/one/OneButton/OneButton.css).
- Surface(s): page, dashboard, flow; version: 2.
- Direct renderer dependencies: [OneActions.jsx](../../apps/web/src/one/shared/OneActions.jsx).
- Declared events: None.
- Declared properties: `kind` (SELECT), `label` (TEXT), `variant` (SELECT), `disabled` (BOOLEAN).

### OneSearch

Universal Search component; metadata-configured presentation, data and events.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/OneSearch/component.json); renderer: [OneSearch.jsx](../../apps/web/src/one/OneSearch/OneSearch.jsx); styles: [OneSearch.css](../../apps/web/src/one/OneSearch/OneSearch.css).
- Surface(s): page, dashboard, flow; version: 3.
- Direct renderer dependencies: [OneActions.jsx](../../apps/web/src/one/shared/OneActions.jsx).
- Declared events: None.
- Declared properties: `kind` (SELECT), `placeholder` (TEXT), `searchKey` (TEXT), `showLabel` (BOOLEAN).

### OneCalendar

Universal Calendar component; metadata-configured presentation, data and events.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/OneCalendar/component.json); renderer: [OneCalendar.jsx](../../apps/web/src/one/OneCalendar/OneCalendar.jsx); styles: [OneCalendar.css](../../apps/web/src/one/OneCalendar/OneCalendar.css).
- Surface(s): page, dashboard, flow; version: 2.
- Direct renderer dependencies: [OneData.jsx](../../apps/web/src/one/shared/OneData.jsx).
- Declared events: None.
- Declared properties: `kind` (SELECT), `view` (SELECT).

### OneItemGrid

Universal ItemGrid component; metadata-configured presentation, data and events.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/OneItemGrid/component.json); renderer: [OneItemGrid.jsx](../../apps/web/src/one/OneItemGrid/OneItemGrid.jsx); styles: [OneItemGrid.css](../../apps/web/src/one/OneItemGrid/OneItemGrid.css).
- Surface(s): page, dashboard, flow; version: 14.
- Direct renderer dependencies: [OneTenantImage.jsx](../../apps/web/src/one/shared/OneTenantImage.jsx); [OneData.jsx](../../apps/web/src/one/shared/OneData.jsx).
- Declared events: None.
- Declared properties: `kind` (SELECT), `title` (TEXT), `categoryFieldApiName` (OBJECT_FIELD), `selectedCategory` (TEXT), `filterKey` (TEXT), `cartTargetKey` (TEXT), `imageFieldApiName` (OBJECT_FIELD), `titleFieldApiName` (OBJECT_FIELD), `priceFieldApiName` (OBJECT_FIELD), `currencyCode` (TEXT), `searchKey` (TEXT), `searchFieldApiNames` (TEXT), `selectionBehavior` (SELECT), `selectionFilterKey` (TEXT), `relatedFilterKey` (TEXT), `relatedFieldApiName` (OBJECT_FIELD), `showHeading` (BOOLEAN), `recordSortFieldApiName` (OBJECT_FIELD), `recordActiveFieldApiName` (OBJECT_FIELD), `descriptionFieldApiName` (OBJECT_FIELD), `showDescription` (BOOLEAN), `badgeFieldApiName` (OBJECT_FIELD), `featuredFieldApiName` (OBJECT_FIELD), `featuredColumnSpan` (NUMBER), `featuredRowSpan` (NUMBER), `cardDensity` (SELECT), `cardPadding` (NUMBER), `cardRadius` (NUMBER), `cardMinHeight` (NUMBER), `cardBackgroundColor` (COLOR), `cardBorderColor` (COLOR), `cardBorderWidth` (NUMBER), `cardShadow` (SELECT), `cardHover` (SELECT), `imageHeight` (NUMBER), `imageFit` (SELECT), `imageAspectRatio` (SELECT).

### OneConversation

Universal Conversation component; metadata-configured presentation, data and events.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/OneConversation/component.json); renderer: [OneConversation.jsx](../../apps/web/src/one/OneConversation/OneConversation.jsx); styles: [OneConversation.css](../../apps/web/src/one/OneConversation/OneConversation.css).
- Surface(s): page, dashboard, flow; version: 7.
- Direct renderer dependencies: No local imports.
- Declared events: None.
- Declared properties: `kind` (SELECT), `placeholder` (TEXT), `viewMode` (SELECT), `enableNewConversation` (BOOLEAN), `title` (TEXT), `searchPlaceholder` (TEXT), `conversationsObjectApiName` (TEXT), `messagesObjectApiName` (TEXT), `channelAccountObjectApiName` (TEXT), `contactsObjectApiName` (TEXT), `recordPresenterApiName` (TEXT), `restrictToAssigned` (BOOLEAN), `enableAssignment` (BOOLEAN), `messageMaxLength` (NUMBER), `emptyTitle` (TEXT), `recordViewAdapter` (TEXT), `conversationDirectionFieldApiName` (OBJECT_FIELD), `conversationAccountFieldApiName` (OBJECT_FIELD), `conversationFromFieldApiName` (OBJECT_FIELD), `conversationToFieldApiName` (OBJECT_FIELD), `conversationOccurredFieldApiName` (OBJECT_FIELD), `conversationBodyFieldApiName` (OBJECT_FIELD), `conversationContactNameFieldApiName` (OBJECT_FIELD), `conversationAssignedUserFieldApiName` (OBJECT_FIELD), `conversationReadAtFieldApiName` (OBJECT_FIELD), `conversationStatusFieldApiName` (OBJECT_FIELD), `conversationMediaUrlFieldApiName` (OBJECT_FIELD), `conversationMediaNameFieldApiName` (OBJECT_FIELD), `conversationMediaTypeFieldApiName` (OBJECT_FIELD), `conversationIncomingValue` (TEXT), `conversationOutgoingValue` (TEXT), `channelAccessPath` (TEXT), `contactNameFieldApiName` (OBJECT_FIELD), `contactPhoneFieldApiName` (OBJECT_FIELD), `liveRefreshEnabled` (BOOLEAN), `conversationAccessMode` (SELECT), `conversationDefaultAccount` (TEXT), `sendEnabled` (BOOLEAN), `enableSendPreparation` (BOOLEAN), `conversationNormalizePhoneNumbers` (BOOLEAN), `conversationNameFromParticipant` (BOOLEAN), `conversationOutgoingOccurredFieldApiName` (OBJECT_FIELD).

### OneShoppingCart

Universal product catalogue, basket and paired-display presentation; server Flows own checkout and permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/OneShoppingCart/component.json); renderer: [OneShoppingCart.jsx](../../apps/web/src/one/OneShoppingCart/OneShoppingCart.jsx); styles: [OneShoppingCart.css](../../apps/web/src/one/OneShoppingCart/OneShoppingCart.css).
- Surface(s): page, dashboard, flow; version: 12.
- Direct renderer dependencies: No local imports.
- Declared events: None.
- Declared properties: `kind` (SELECT), `viewMode` (SELECT), `title` (TEXT), `nameFieldApiName` (OBJECT_FIELD), `priceFieldApiName` (OBJECT_FIELD), `barcodeFieldApiName` (OBJECT_FIELD), `skuFieldApiName` (OBJECT_FIELD), `imageFieldApiName` (OBJECT_FIELD), `ageRestrictedFieldApiName` (OBJECT_FIELD), `vatApplicableFieldApiName` (OBJECT_FIELD), `customerDisplayUrl` (TEXT), `currencyCode` (TEXT), `showVatTotal` (BOOLEAN), `stateSyncEnabled` (BOOLEAN), `stateReadFlowApiName` (TEXT), `stateWriteFlowApiName` (TEXT), `stateObjectApiName` (TEXT), `stateValueFieldApiName` (OBJECT_FIELD), `stateVersionFieldApiName` (OBJECT_FIELD), `stateKeyInput` (TEXT), `stateValueInput` (TEXT), `stateValueOutput` (TEXT), `stateVersionOutput` (TEXT), `stateRecordIdOutput` (TEXT), `statePollIntervalMs` (NUMBER), `stateSessionQueryParam` (TEXT), `operationEvents` (TEXT), `standalonePresentation` (BOOLEAN), `storeName` (TEXT), `displayButtonLabel` (TEXT), `topbarActionEvent` (TEXT), `topbarActionLabelProperty` (TEXT), `topbarActionRequiresProperty` (TEXT), `catalogueWidthPercent` (NUMBER), `productCardMinWidth` (NUMBER), `cartTargetKey` (TEXT), `categoryFieldApiName` (OBJECT_FIELD), `showCategoryTabs` (BOOLEAN), `categoryTabsLabel` (TEXT), `allCategoriesLabel` (TEXT), `vatRate` (NUMBER), `checkoutStatusOutput` (TEXT), `checkoutRequestOutput` (TEXT), `checkoutMessageOutput` (TEXT), `checkoutChangeOutput` (TEXT), `nextTransactionLabel` (TEXT), `inactivityResetSeconds` (NUMBER), `basketPresentation` (SELECT), `basketTitle` (TEXT), `checkoutLabel` (TEXT), `emptyBasketText` (TEXT), `totalLabel` (TEXT), `clearLabel` (TEXT).

### une_text

Reusable text component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — formatted text; preserve existing text modes.
- Definition: [component.json](../../apps/web/src/one/une_text/component.json); renderer: [UneText.jsx](../../apps/web/src/one/une_text/UneText.jsx); styles: [UneText.css](../../apps/web/src/one/une_text/UneText.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [OneText.jsx](../../apps/web/src/one/OneText/OneText.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: None.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `text` (TEXT), `fontSize` (NUMBER).

### une_image

Reusable image component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_image/component.json); renderer: [UneImage.jsx](../../apps/web/src/one/une_image/UneImage.jsx); styles: [UneImage.css](../../apps/web/src/one/une_image/UneImage.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneDisplay.jsx](../../apps/web/src/one/une/shared/UneDisplay.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: None.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `src` (IMAGE), `alt` (TEXT), `caption` (TEXT), `imageFit` (SELECT), `imageHeight` (NUMBER).

### une_calendar

Reusable calendar component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_calendar/component.json); renderer: [UneCalendar.jsx](../../apps/web/src/one/une_calendar/UneCalendar.jsx); styles: [UneCalendar.css](../../apps/web/src/one/une_calendar/UneCalendar.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneSchedule.jsx](../../apps/web/src/one/une/shared/UneSchedule.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `dateSelect`, `eventSelect`, `viewChange`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `view` (SELECT), `objectApiName` (OBJECT), `items` (RECORD_LIST), `dateFieldApiName` (OBJECT_FIELD), `titleFieldApiName` (OBJECT_FIELD), `selectedDate` (TEXT), `timeZone` (TEXT), `eventStartFieldApiName` (OBJECT_FIELD), `eventEndFieldApiName` (OBJECT_FIELD), `resourceFieldApiName` (OBJECT_FIELD), `resourceValue` (TEXT), `serviceFieldApiName` (OBJECT_FIELD), `serviceValue` (TEXT), `firstDayOfWeek` (SELECT), `showWeekends` (BOOLEAN).

### une_button

Reusable button component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — per-action conditions and declared action bindings.
- Definition: [component.json](../../apps/web/src/one/une_button/component.json); renderer: [UneButton.jsx](../../apps/web/src/one/une_button/UneButton.jsx); styles: [UneButton.css](../../apps/web/src/one/une_button/UneButton.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [OneButton.jsx](../../apps/web/src/one/OneButton/OneButton.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `click`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `label` (TEXT), `variant` (SELECT), `disabled` (BOOLEAN).

### une_card

Reusable card component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — Highlights composition and conditional presentation.
- Definition: [component.json](../../apps/web/src/one/une_card/component.json); renderer: [UneCard.jsx](../../apps/web/src/one/une_card/UneCard.jsx); styles: [UneCard.css](../../apps/web/src/one/une_card/UneCard.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneLayout.jsx](../../apps/web/src/one/une/shared/UneLayout.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: None.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `title` (TEXT), `subtitle` (TEXT), `description` (TEXT), `imageSrc` (IMAGE), `layoutContainer` (BOOLEAN).

### une_input

Reusable input component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — field behaviour and conditional formatting via shared field contract.
- Definition: [component.json](../../apps/web/src/one/une_input/component.json); renderer: [UneInput.jsx](../../apps/web/src/one/une_input/UneInput.jsx); styles: [UneInput.css](../../apps/web/src/one/une_input/UneInput.css).
- Surface(s): page, dashboard, flow; version: 2.
- Direct renderer dependencies: [UneInputs.jsx](../../apps/web/src/one/une/shared/UneInputs.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `change`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `label` (TEXT), `placeholder` (TEXT), `inputType` (SELECT), `required` (BOOLEAN), `disabled` (BOOLEAN), `multiline` (BOOLEAN), `rows` (NUMBER), `value` (TEXT), `maxLength` (NUMBER), `autoComplete` (TEXT), `inputMode` (SELECT), `pattern` (TEXT), `helpText` (TEXT).

### une_toggle

Reusable toggle component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_toggle/component.json); renderer: [UneToggle.jsx](../../apps/web/src/one/une_toggle/UneToggle.jsx); styles: [UneToggle.css](../../apps/web/src/one/une_toggle/UneToggle.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneInputs.jsx](../../apps/web/src/one/une/shared/UneInputs.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `change`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `label` (TEXT), `value` (BOOLEAN), `disabled` (BOOLEAN).

### une_badge

Reusable badge component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_badge/component.json); renderer: [UneBadge.jsx](../../apps/web/src/one/une_badge/UneBadge.jsx); styles: [UneBadge.css](../../apps/web/src/one/une_badge/UneBadge.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [OneBadge.jsx](../../apps/web/src/one/OneBadge/OneBadge.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: None.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `text` (TEXT).

### une_stack

Reusable stack component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_stack/component.json); renderer: [UneStack.jsx](../../apps/web/src/one/une_stack/UneStack.jsx); styles: [UneStack.css](../../apps/web/src/one/une_stack/UneStack.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneLayout.jsx](../../apps/web/src/one/une/shared/UneLayout.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: None.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `layoutContainer` (BOOLEAN), `direction` (SELECT), `wrap` (BOOLEAN).

### une_tabs

Reusable tabs component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — stable tab/region identity and conditional tabs; keep controlled selection.
- Definition: [component.json](../../apps/web/src/one/une_tabs/component.json); renderer: [UneTabs.jsx](../../apps/web/src/one/une_tabs/UneTabs.jsx); styles: [UneTabs.css](../../apps/web/src/one/une_tabs/UneTabs.css).
- Surface(s): page, dashboard, flow; version: 2.
- Direct renderer dependencies: [UneLayout.jsx](../../apps/web/src/one/une/shared/UneLayout.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `tabChange`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `layoutContainer` (BOOLEAN), `tabs` (TEXT), `showPanel` (BOOLEAN), `selectedIndex` (NUMBER), `controlledSelection` (BOOLEAN), `tabLabel` (TEXT).

### une_container

Reusable container component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — collapsible-region configuration for Accordion; preserve existing layout.
- Definition: [component.json](../../apps/web/src/one/une_container/component.json); renderer: [UneContainer.jsx](../../apps/web/src/one/une_container/UneContainer.jsx); styles: [UneContainer.css](../../apps/web/src/one/une_container/UneContainer.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneLayout.jsx](../../apps/web/src/one/une/shared/UneLayout.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: None.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `layoutContainer` (BOOLEAN), `direction` (SELECT).

### une_grid

Reusable grid component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_grid/component.json); renderer: [UneGrid.jsx](../../apps/web/src/one/une_grid/UneGrid.jsx); styles: [UneGrid.css](../../apps/web/src/one/une_grid/UneGrid.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneLayout.jsx](../../apps/web/src/one/une/shared/UneLayout.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: None.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `layoutContainer` (BOOLEAN), `desktopColumns` (NUMBER), `tabletColumns` (NUMBER), `mobileColumns` (NUMBER).

### une_split_pane

Reusable split pane component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_split_pane/component.json); renderer: [UneSplitPane.jsx](../../apps/web/src/one/une_split_pane/UneSplitPane.jsx); styles: [UneSplitPane.css](../../apps/web/src/one/une_split_pane/UneSplitPane.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneLayout.jsx](../../apps/web/src/one/une/shared/UneLayout.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: None.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `layoutContainer` (BOOLEAN), `splitRatio` (NUMBER).

### une_navigation

Reusable navigation component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — related-list quick-link configuration.
- Definition: [component.json](../../apps/web/src/one/une_navigation/component.json); renderer: [UneNavigation.jsx](../../apps/web/src/one/une_navigation/UneNavigation.jsx); styles: [UneNavigation.css](../../apps/web/src/one/une_navigation/UneNavigation.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneLayout.jsx](../../apps/web/src/one/une/shared/UneLayout.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `navigate`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `items` (OPTIONS), `direction` (SELECT).

### une_menu

Reusable menu component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_menu/component.json); renderer: [UneMenu.jsx](../../apps/web/src/one/une_menu/UneMenu.jsx); styles: [UneMenu.css](../../apps/web/src/one/une_menu/UneMenu.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneLayout.jsx](../../apps/web/src/one/une/shared/UneLayout.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `navigate`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `items` (OPTIONS).

### une_modal

Reusable modal component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_modal/component.json); renderer: [UneModal.jsx](../../apps/web/src/one/une_modal/UneModal.jsx); styles: [UneModal.css](../../apps/web/src/one/une_modal/UneModal.css).
- Surface(s): page, dashboard, flow; version: 2.
- Direct renderer dependencies: [UneLayout.jsx](../../apps/web/src/one/une/shared/UneLayout.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `open`, `close`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `layoutContainer` (BOOLEAN), `title` (TEXT), `openLabel` (TEXT), `startOpen` (BOOLEAN), `controlledOpen` (BOOLEAN), `isOpen` (BOOLEAN), `showTrigger` (BOOLEAN), `showCloseButton` (BOOLEAN), `closeOnBackdrop` (BOOLEAN), `closeOnEscape` (BOOLEAN), `fullScreenOnMobile` (BOOLEAN).

### une_drawer

Reusable drawer component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_drawer/component.json); renderer: [UneDrawer.jsx](../../apps/web/src/one/une_drawer/UneDrawer.jsx); styles: [UneDrawer.css](../../apps/web/src/one/une_drawer/UneDrawer.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneLayout.jsx](../../apps/web/src/one/une/shared/UneLayout.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `open`, `close`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `layoutContainer` (BOOLEAN), `title` (TEXT), `openLabel` (TEXT), `startOpen` (BOOLEAN).

### une_item_grid

Reusable item grid component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_item_grid/component.json); renderer: [UneItemGrid.jsx](../../apps/web/src/one/une_item_grid/UneItemGrid.jsx); styles: [UneItemGrid.css](../../apps/web/src/one/une_item_grid/UneItemGrid.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [OneItemGrid.jsx](../../apps/web/src/one/OneItemGrid/OneItemGrid.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `itemSelect`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `title` (TEXT), `categoryFieldApiName` (OBJECT_FIELD), `selectedCategory` (TEXT), `filterKey` (TEXT), `cartTargetKey` (TEXT), `imageFieldApiName` (OBJECT_FIELD), `titleFieldApiName` (OBJECT_FIELD), `priceFieldApiName` (OBJECT_FIELD), `currencyCode` (TEXT), `searchKey` (TEXT), `searchFieldApiNames` (TEXT), `selectionBehavior` (SELECT), `selectionFilterKey` (TEXT), `relatedFilterKey` (TEXT), `relatedFieldApiName` (OBJECT_FIELD), `showHeading` (BOOLEAN), `recordSortFieldApiName` (OBJECT_FIELD), `recordActiveFieldApiName` (OBJECT_FIELD), `descriptionFieldApiName` (OBJECT_FIELD), `showDescription` (BOOLEAN), `badgeFieldApiName` (OBJECT_FIELD), `featuredFieldApiName` (OBJECT_FIELD), `featuredColumnSpan` (NUMBER), `featuredRowSpan` (NUMBER), `cardDensity` (SELECT), `cardPadding` (NUMBER), `cardRadius` (NUMBER), `cardMinHeight` (NUMBER), `cardBackgroundColor` (COLOR), `cardBorderColor` (COLOR), `cardBorderWidth` (NUMBER), `cardShadow` (SELECT), `cardHover` (SELECT), `imageHeight` (NUMBER), `imageFit` (SELECT), `imageAspectRatio` (SELECT), `objectApiName` (OBJECT), `items` (RECORD_LIST).

### une_repeater

Reusable repeater component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_repeater/component.json); renderer: [UneRepeater.jsx](../../apps/web/src/one/une_repeater/UneRepeater.jsx); styles: [UneRepeater.css](../../apps/web/src/one/une_repeater/UneRepeater.css).
- Surface(s): page, dashboard, flow; version: 2.
- Direct renderer dependencies: [UneData.jsx](../../apps/web/src/one/une/shared/UneData.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `itemSelect`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `objectApiName` (OBJECT), `items` (RECORD_LIST), `loading` (BOOLEAN), `emptyText` (TEXT), `recordTitleFieldApiName` (OBJECT_FIELD), `recordValueFieldApiName` (OBJECT_FIELD), `recordSubtitleFieldApiName` (OBJECT_FIELD), `recordImageFieldApiName` (OBJECT_FIELD), `selectionFilterKey` (TEXT), `recordBadgeFieldApiName` (OBJECT_FIELD), `recordTrailingFieldApiName` (OBJECT_FIELD), `searchFieldApiName` (OBJECT_FIELD), `searchValue` (TEXT), `loadingText` (TEXT), `selectedValue` (TEXT), `maxItems` (NUMBER), `disabled` (BOOLEAN), `sourceObjectApiName` (TEXT).

### une_record_list

Reusable record list component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — saved-view and related-record binding through existing Record API.
- Definition: [component.json](../../apps/web/src/one/une_record_list/component.json); renderer: [UneRecordList.jsx](../../apps/web/src/one/une_record_list/UneRecordList.jsx); styles: [UneRecordList.css](../../apps/web/src/one/une_record_list/UneRecordList.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneData.jsx](../../apps/web/src/one/une/shared/UneData.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `itemSelect`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `objectApiName` (OBJECT), `items` (RECORD_LIST), `loading` (BOOLEAN), `emptyText` (TEXT), `recordTitleFieldApiName` (OBJECT_FIELD), `recordValueFieldApiName` (OBJECT_FIELD), `recordSubtitleFieldApiName` (OBJECT_FIELD), `recordImageFieldApiName` (OBJECT_FIELD), `selectionFilterKey` (TEXT), `recordBadgeFieldApiName` (OBJECT_FIELD), `recordTrailingFieldApiName` (OBJECT_FIELD).

### une_search

Reusable search component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_search/component.json); renderer: [UneSearch.jsx](../../apps/web/src/one/une_search/UneSearch.jsx); styles: [UneSearch.css](../../apps/web/src/one/une_search/UneSearch.css).
- Surface(s): page, dashboard, flow; version: 2.
- Direct renderer dependencies: [OneSearch.jsx](../../apps/web/src/one/OneSearch/OneSearch.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `change`, `submit`, `select`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `placeholder` (TEXT), `searchKey` (TEXT), `objectApiName` (OBJECT), `items` (RECORD_LIST), `value` (TEXT), `label` (TEXT), `showSubmitButton` (BOOLEAN), `submitLabel` (TEXT), `showSuggestions` (BOOLEAN), `controlledValue` (BOOLEAN).

### une_lookup

Reusable lookup component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — relationship-aware field selection; preserve picker behaviour.
- Definition: [component.json](../../apps/web/src/one/une_lookup/component.json); renderer: [UneLookup.jsx](../../apps/web/src/one/une_lookup/UneLookup.jsx); styles: [UneLookup.css](../../apps/web/src/one/une_lookup/UneLookup.css).
- Surface(s): page, dashboard, flow; version: 2.
- Direct renderer dependencies: [UneInputs.jsx](../../apps/web/src/one/une/shared/UneInputs.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `change`, `search`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `objectApiName` (OBJECT), `items` (RECORD_LIST), `loading` (BOOLEAN), `emptyText` (TEXT), `label` (TEXT), `recordTitleFieldApiName` (OBJECT_FIELD), `recordValueFieldApiName` (OBJECT_FIELD), `placeholder` (TEXT), `value` (TEXT), `selectionPayload` (SELECT), `recordSubtitleFieldApiName` (OBJECT_FIELD), `searchFieldApiName` (OBJECT_FIELD), `searchValue` (TEXT), `disabled` (BOOLEAN), `loadingText` (TEXT), `recordPhoneFieldApiNames` (TEXT), `recordNameFieldApiNames` (TEXT), `normaliseSelectedPhone` (BOOLEAN).

### une_choice

Reusable choice component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_choice/component.json); renderer: [UneChoice.jsx](../../apps/web/src/one/une_choice/UneChoice.jsx); styles: [UneChoice.css](../../apps/web/src/one/une_choice/UneChoice.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneInputs.jsx](../../apps/web/src/one/une/shared/UneInputs.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `change`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `objectApiName` (OBJECT), `items` (RECORD_LIST), `loading` (BOOLEAN), `emptyText` (TEXT), `label` (TEXT), `options` (OPTIONS), `optionLabelFieldApiName` (OBJECT_FIELD), `optionValueFieldApiName` (OBJECT_FIELD), `mode` (SELECT), `required` (BOOLEAN).

### une_cart

Reusable cart component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_cart/component.json); renderer: [UneCart.jsx](../../apps/web/src/one/une_cart/UneCart.jsx); styles: [UneCart.css](../../apps/web/src/one/une_cart/UneCart.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [OneShoppingCart.jsx](../../apps/web/src/one/OneShoppingCart/OneShoppingCart.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `checkout`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `viewMode` (SELECT), `title` (TEXT), `nameFieldApiName` (OBJECT_FIELD), `priceFieldApiName` (OBJECT_FIELD), `barcodeFieldApiName` (OBJECT_FIELD), `skuFieldApiName` (OBJECT_FIELD), `imageFieldApiName` (OBJECT_FIELD), `ageRestrictedFieldApiName` (OBJECT_FIELD), `vatApplicableFieldApiName` (OBJECT_FIELD), `customerDisplayUrl` (TEXT), `currencyCode` (TEXT), `showVatTotal` (BOOLEAN), `stateSyncEnabled` (BOOLEAN), `stateReadFlowApiName` (TEXT), `stateWriteFlowApiName` (TEXT), `stateObjectApiName` (OBJECT), `stateValueFieldApiName` (OBJECT_FIELD), `stateVersionFieldApiName` (OBJECT_FIELD), `stateKeyInput` (TEXT), `stateValueInput` (TEXT), `stateValueOutput` (TEXT), `stateVersionOutput` (TEXT), `stateRecordIdOutput` (TEXT), `statePollIntervalMs` (NUMBER), `stateSessionQueryParam` (TEXT), `operationEvents` (TEXT), `standalonePresentation` (BOOLEAN), `storeName` (TEXT), `displayButtonLabel` (TEXT), `topbarActionEvent` (TEXT), `topbarActionLabelProperty` (TEXT), `topbarActionRequiresProperty` (TEXT), `catalogueWidthPercent` (NUMBER), `productCardMinWidth` (NUMBER), `cartTargetKey` (TEXT), `categoryFieldApiName` (OBJECT_FIELD), `showCategoryTabs` (BOOLEAN), `categoryTabsLabel` (TEXT), `allCategoriesLabel` (TEXT), `vatRate` (NUMBER), `checkoutStatusOutput` (TEXT), `checkoutRequestOutput` (TEXT), `checkoutMessageOutput` (TEXT), `checkoutChangeOutput` (TEXT), `nextTransactionLabel` (TEXT), `inactivityResetSeconds` (NUMBER), `basketPresentation` (SELECT), `basketTitle` (TEXT), `checkoutLabel` (TEXT), `emptyBasketText` (TEXT), `totalLabel` (TEXT), `clearLabel` (TEXT), `objectApiName` (OBJECT).

### une_conversation

Reusable conversation component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_conversation/component.json); renderer: [UneConversation.jsx](../../apps/web/src/one/une_conversation/UneConversation.jsx); styles: [UneConversation.css](../../apps/web/src/one/une_conversation/UneConversation.css).
- Surface(s): page, dashboard, flow; version: 2.
- Direct renderer dependencies: [OneConversation.jsx](../../apps/web/src/one/OneConversation/OneConversation.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx); [flowConversationPresenter.js](../../apps/web/src/one/une_conversation/flowConversationPresenter.js).
- Declared events: `start`, `select`, `search`, `refresh`, `create`, `resolve`, `send`, `assign`, `contactSelect`, `contactSearch`, `newConversationOpen`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `placeholder` (TEXT), `viewMode` (SELECT), `enableNewConversation` (BOOLEAN), `title` (TEXT), `searchPlaceholder` (TEXT), `conversationsObjectApiName` (OBJECT), `messagesObjectApiName` (OBJECT), `channelAccountObjectApiName` (OBJECT), `contactsObjectApiName` (OBJECT), `recordPresenterApiName` (TEXT), `restrictToAssigned` (BOOLEAN), `enableAssignment` (BOOLEAN), `messageMaxLength` (NUMBER), `emptyTitle` (TEXT), `recordViewAdapter` (TEXT), `conversationDirectionFieldApiName` (OBJECT_FIELD), `conversationAccountFieldApiName` (OBJECT_FIELD), `conversationFromFieldApiName` (OBJECT_FIELD), `conversationToFieldApiName` (OBJECT_FIELD), `conversationOccurredFieldApiName` (OBJECT_FIELD), `conversationBodyFieldApiName` (OBJECT_FIELD), `conversationContactNameFieldApiName` (OBJECT_FIELD), `conversationAssignedUserFieldApiName` (OBJECT_FIELD), `conversationReadAtFieldApiName` (OBJECT_FIELD), `conversationStatusFieldApiName` (OBJECT_FIELD), `conversationMediaUrlFieldApiName` (OBJECT_FIELD), `conversationMediaNameFieldApiName` (OBJECT_FIELD), `conversationMediaTypeFieldApiName` (OBJECT_FIELD), `conversationIncomingValue` (TEXT), `conversationOutgoingValue` (TEXT), `channelAccessPath` (TEXT), `contactNameFieldApiName` (OBJECT_FIELD), `contactPhoneFieldApiName` (OBJECT_FIELD), `liveRefreshEnabled` (BOOLEAN), `conversationAccessMode` (SELECT), `conversationDefaultAccount` (TEXT), `sendEnabled` (BOOLEAN), `enableSendPreparation` (BOOLEAN), `conversationNormalizePhoneNumbers` (BOOLEAN), `conversationNameFromParticipant` (BOOLEAN), `conversationOutgoingOccurredFieldApiName` (OBJECT_FIELD), `objectApiName` (OBJECT), `conversations` (RECORD_LIST), `messages` (RECORD_LIST), `contactChoices` (RECORD_LIST), `channelAccounts` (RECORD_LIST), `eligibleAssignees` (RECORD_LIST), `showSearch` (BOOLEAN), `showFilterTabs` (BOOLEAN), `showAccountSelector` (BOOLEAN), `showRefresh` (BOOLEAN), `showConversationCount` (BOOLEAN), `showComposer` (BOOLEAN), `showDeliveryStatus` (BOOLEAN), `searchMode` (SELECT), `newConversationPresentation` (SELECT), `selectedConversationId` (TEXT), `searchTerm` (TEXT), `newConversationLabel` (TEXT), `refreshLabel` (TEXT), `canSend` (BOOLEAN), `searchLabel` (TEXT), `filterLabel` (TEXT), `contactSearchLabel` (TEXT), `sentNoticeText` (TEXT), `emptyConversationsText` (TEXT), `controlledSelection` (BOOLEAN), `requirePerRecordSendGrant` (BOOLEAN), `requireChannelAccountForNew` (BOOLEAN), `filterOptions` (OPTIONS), `conversationSourceMode` (SELECT), `conversationIdFieldApiName` (OBJECT_FIELD), `conversationNameFieldApiName` (OBJECT_FIELD), `conversationPhoneFieldApiName` (OBJECT_FIELD), `messageIdFieldApiName` (OBJECT_FIELD), `messageDirectionFieldApiName` (OBJECT_FIELD), `messageSenderFieldApiName` (OBJECT_FIELD), `messageRecipientFieldApiName` (OBJECT_FIELD), `messageBodyFieldApiName` (OBJECT_FIELD), `messageSentAtFieldApiName` (OBJECT_FIELD), `messageReceivedAtFieldApiName` (OBJECT_FIELD), `messageStatusFieldApiName` (OBJECT_FIELD), `messageChannelFieldApiName` (OBJECT_FIELD), `messageChannelValue` (TEXT), `messageExternalIdFieldApiName` (OBJECT_FIELD), `messageStatusPrefixToIgnore` (TEXT), `messageStatusNamePrefixToIgnore` (TEXT), `messageRequireBody` (BOOLEAN), `contactSourceObjectApi` (TEXT), `liveFlowRefreshEnabled` (BOOLEAN), `liveFlowRefreshIntervalMs` (NUMBER), `liveFlowRefreshEvents` (TEXT), `autoScrollOnNewMessage` (BOOLEAN), `showNewMessageNotice` (BOOLEAN), `newMessageNoticeLabel` (TEXT), `contactDisplayNameFieldApiNames` (TEXT), `contactPhoneFieldApiNames` (TEXT), `contactSearchFieldApiName` (OBJECT_FIELD), `messageAutoScrollThreshold` (NUMBER), `filterInboxBusinessNumber` (BOOLEAN), `avoidKeyboardOverlap` (BOOLEAN).

### une_form

Reusable form component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — record-aware forms using shared CRUD, field rules and validation.
- Definition: [component.json](../../apps/web/src/one/une_form/component.json); renderer: [UneForm.jsx](../../apps/web/src/one/une_form/UneForm.jsx); styles: [UneForm.css](../../apps/web/src/one/une_form/UneForm.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneData.jsx](../../apps/web/src/one/une/shared/UneData.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `submit`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `objectApiName` (OBJECT), `items` (RECORD_LIST), `loading` (BOOLEAN), `emptyText` (TEXT), `title` (TEXT), `fields` (FIELD_LIST), `submitLabel` (TEXT).

### une_table

Reusable table component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — dynamic related-list and saved-list presentation; retain responsive rows.
- Definition: [component.json](../../apps/web/src/one/une_table/component.json); renderer: [UneTable.jsx](../../apps/web/src/one/une_table/UneTable.jsx); styles: [UneTable.css](../../apps/web/src/one/une_table/UneTable.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneData.jsx](../../apps/web/src/one/une/shared/UneData.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `rowSelect`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `objectApiName` (OBJECT), `items` (RECORD_LIST), `loading` (BOOLEAN), `emptyText` (TEXT), `columns` (COLUMNS), `pageSize` (NUMBER), `phoneLayout` (SELECT).

### une_line_items

Reusable line items component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_line_items/component.json); renderer: [UneLineItems.jsx](../../apps/web/src/one/une_line_items/UneLineItems.jsx); styles: [UneLineItems.css](../../apps/web/src/one/une_line_items/UneLineItems.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneData.jsx](../../apps/web/src/one/une/shared/UneData.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `change`, `submit`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `title` (TEXT), `fields` (FIELD_LIST), `items` (RECORD_LIST), `maxRows` (NUMBER), `addLabel` (TEXT).

### une_date_picker

Reusable date picker component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_date_picker/component.json); renderer: [UneDatePicker.jsx](../../apps/web/src/one/une_date_picker/UneDatePicker.jsx); styles: [UneDatePicker.css](../../apps/web/src/one/une_date_picker/UneDatePicker.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneInputs.jsx](../../apps/web/src/one/une/shared/UneInputs.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `change`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `label` (TEXT), `value` (TEXT), `required` (BOOLEAN).

### une_slot_picker

Reusable slot picker component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_slot_picker/component.json); renderer: [UneSlotPicker.jsx](../../apps/web/src/one/une_slot_picker/UneSlotPicker.jsx); styles: [UneSlotPicker.css](../../apps/web/src/one/une_slot_picker/UneSlotPicker.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneInputs.jsx](../../apps/web/src/one/une/shared/UneInputs.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `change`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `objectApiName` (OBJECT), `items` (RECORD_LIST), `loading` (BOOLEAN), `emptyText` (TEXT), `label` (TEXT), `optionLabelFieldApiName` (OBJECT_FIELD), `optionValueFieldApiName` (OBJECT_FIELD), `optionAvailableFieldApiName` (OBJECT_FIELD).

### une_metric

Reusable metric component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_metric/component.json); renderer: [UneMetric.jsx](../../apps/web/src/one/une_metric/UneMetric.jsx); styles: [UneMetric.css](../../apps/web/src/one/une_metric/UneMetric.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneDisplay.jsx](../../apps/web/src/one/une/shared/UneDisplay.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: None.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `title` (TEXT), `value` (TEXT), `subtitle` (TEXT).

### une_alert

Reusable alert component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_alert/component.json); renderer: [UneAlert.jsx](../../apps/web/src/one/une_alert/UneAlert.jsx); styles: [UneAlert.css](../../apps/web/src/one/une_alert/UneAlert.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneDisplay.jsx](../../apps/web/src/one/une/shared/UneDisplay.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: None.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `text` (TEXT), `severity` (SELECT).

### une_progress

Reusable progress component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — Path presentation with metadata guidance/key fields.
- Definition: [component.json](../../apps/web/src/one/une_progress/component.json); renderer: [UneProgress.jsx](../../apps/web/src/one/une_progress/UneProgress.jsx); styles: [UneProgress.css](../../apps/web/src/one/une_progress/UneProgress.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneDisplay.jsx](../../apps/web/src/one/une/shared/UneDisplay.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: None.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `label` (TEXT), `value` (NUMBER), `max` (NUMBER).

### une_document_viewer

Reusable document viewer component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_document_viewer/component.json); renderer: [UneDocumentViewer.jsx](../../apps/web/src/one/une_document_viewer/UneDocumentViewer.jsx); styles: [UneDocumentViewer.css](../../apps/web/src/one/une_document_viewer/UneDocumentViewer.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneDisplay.jsx](../../apps/web/src/one/une/shared/UneDisplay.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `print`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `title` (TEXT), `src` (TEXT), `showPrint` (BOOLEAN).

### une_chart

Reusable chart component for metadata-driven pages; shares MetaDrive runtime, events and tenant permissions.

- Decision: **Extend** — record-scoped report adapter; preserve native chart data.
- Definition: [component.json](../../apps/web/src/one/une_chart/component.json); renderer: [UneChart.jsx](../../apps/web/src/one/une_chart/UneChart.jsx); styles: [UneChart.css](../../apps/web/src/one/une_chart/UneChart.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneDisplay.jsx](../../apps/web/src/one/une/shared/UneDisplay.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `itemSelect`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `objectApiName` (OBJECT), `items` (RECORD_LIST), `loading` (BOOLEAN), `emptyText` (TEXT), `chartLabelFieldApiName` (OBJECT_FIELD), `chartValueFieldApiName` (OBJECT_FIELD), `chartType` (SELECT).

### une_option_groups

Render grouped required/optional selections from metadata-bound Flow records; emits typed selection actions.

- Decision: **Reuse** — retain existing capability and API identity; shared-engine fixes apply without replacement.
- Definition: [component.json](../../apps/web/src/one/une_option_groups/component.json); renderer: [UneOptionGroups.jsx](../../apps/web/src/one/une_option_groups/UneOptionGroups.jsx); styles: [UneOptionGroups.css](../../apps/web/src/one/une_option_groups/UneOptionGroups.css).
- Surface(s): page, dashboard, flow; version: 1.
- Direct renderer dependencies: [UneOptionGroups.jsx](../../apps/web/src/one/une/shared/UneOptionGroups.jsx); [UneFrame.jsx](../../apps/web/src/one/une/shared/UneFrame.jsx).
- Declared events: `change`, `confirm`.
- Declared properties: `theme` (SELECT), `surface` (SELECT), `tone` (SELECT), `accentColor` (COLOR), `backgroundColor` (COLOR), `textColor` (COLOR), `borderColor` (COLOR), `density` (SELECT), `radius` (NUMBER), `padding` (NUMBER), `gap` (NUMBER), `shadow` (SELECT), `glassBlur` (NUMBER), `groups` (RECORD_LIST), `groupIdFieldApiName` (TEXT), `groupLabelFieldApiName` (TEXT), `choicesFieldApiName` (TEXT), `choiceIdFieldApiName` (TEXT), `choiceLabelFieldApiName` (TEXT), `confirmLabel` (TEXT).

### ChatterInbox

- Decision: **Reuse** — preserve protected/compatibility registration; do not rename to UNE.
- Definition: [manifest.json](../../apps/web/src/core/components/BundledCatalog/manifest.json); renderer: [OneConversation.jsx](../../apps/web/src/one/OneConversation/OneConversation.jsx); styles: [OneConversation.css](../../apps/web/src/one/OneConversation/OneConversation.css).
- Surfaces: page, dashboard, flow. Defaults: `title`, `accentColor`, `conversationsObjectApiName`, `messagesObjectApiName`, `channelAccountObjectApiName`, `restrictToAssigned`, `enableAssignment`, `actionFlows`, `viewMode`.

### SystemPanel

- Decision: **Reuse** — preserve protected/compatibility registration; do not rename to UNE.
- Definition: [manifest.json](../../apps/web/src/core/components/BundledCatalog/manifest.json); renderer: [SystemPanel.jsx](../../apps/web/src/core/components/SystemPanel/SystemPanel.jsx); styles: [SystemPanel.css](../../apps/web/src/core/components/SystemPanel/SystemPanel.css).
- Surfaces: page, dashboard, flow, platform. Defaults: `title`, `description`, `accentColor`.

## Standard and special page blocks

These are separate identities from `Custom:une_*`. They use the PageBuilder inspector and built-in runtime branches rather than the descriptor editor. Keep old saved types readable; mappings below are future adapters/compositions, not safe automatic renames.

| Existing identity | Properties / current source | Decision and target |
|---|---|---|
| Record Detail | fields; RecordWorkspace | Extend: shared record form/display adapter, composed with une_form/une_input |
| Field Section | fieldApiNames, columns; PageBuilder/RecordWorkspace | Extend: une_form region; preserve ordered fields |
| Record Field | fieldApiName; PageBuilder/RecordWorkspace | Extend: shared field adapter + une_input; complex types retain existing controls |
| Record Actions | actions, customLinks; recordPageLayoutMigration | Extend: une_button/une_navigation with shared action grants |
| Highlights Panel | compact-layout fields; RecordWorkspace | Extend: une_card + shared field adapter + une_button |
| Related List | relatedLists; RecordWorkspace and legacy layout settings | Extend: une_table/une_record_list with shared relation query |
| Tabs | tabs; app/record runtime label matching | Extend: une_tabs; translate legacy labels to stable regions without loss |
| Accordion | content on app pages; layout sections on record pages | Extend: une_container collapsible regions, retain legacy payloads |
| Activities | object settings + activity runtime | Reuse existing activity service; add UNE presentation adapter when needed |
| Chatter | object settings + record feed runtime | Extend une_conversation presentation adapter; record feed is not inbox semantics |
| Dashboard | dashboardApiName; EmbeddedDashboard | Reuse existing dashboard renderer through UNE-styled adapter |
| Report Chart | reportApiName; RuntimeReportChart | Extend report adapter; use une_chart only when data contract matches |
| Container / Row / Column / Card / Grid | visualStyle, layoutStyle, layoutResponsive, parentId/layoutParentId | Extend compatibility adapters to une_container/une_stack/une_card/une_grid; preserve geometry |

Sources: [catalog.ts](../../apps/web/src/core/components/Catalog/catalog.ts), [pageBuilderView.tsx](../../apps/web/src/core/builders/PageBuilder/pageBuilderView.tsx), [recordWorkspaceViews.tsx](../../apps/web/src/core/records/RecordWorkspace/recordWorkspaceViews.tsx), [pageRuntimeViews.tsx](../../apps/web/src/core/pages/PageRuntime/pageRuntimeViews.tsx), [recordPageLayoutMigration.ts](../../apps/web/src/core/records/RecordWorkspace/recordPageLayoutMigration.ts), [pageComponentLayout.ts](../../apps/web/src/core/pages/TemplatePageRuntime/pageComponentLayout.ts).

## Preservation and verification boundary

All eight One identities, 36 UNE identities, SystemPanel, ChatterInbox and existing standard types remain supported. ChatterInbox is already a reviewed alias of OneConversation for discovery only; no other same-looking components are interchangeable by assumption. App-specific components such as carts, calendars, slot pickers, line items, option groups and document viewers are intentional extras, not removal candidates.

Tenant registrations absent from this source index must continue to resolve through the existing authorised registry/sandbox. Obtain a tenant-authorised inventory during migration verification; do not access unrelated tenant databases.
