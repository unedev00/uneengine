# Page Builder remaining property inventory (after requested removals)

Generated from UNE component manifests on the PR branch. The shared ribbon has a fixed slot order; applicable component controls are enabled and the others disabled.

**SQL inventory scope:** Bundled `une_*` components are seeded into `md_component_definitions` with `renderer_key='one-bundled:<api>'` and no per-property SQL entries. Their editable property inventory comes from these source manifests, so the requested property deletions are source-metadata changes, not SQL row deletions. No entire component was marked for deletion in the supplied list, so system SQL component rows remain registered. Version-owned `md_component_library_contract_properties` belongs to separately authored tenant components and has not been deleted. Existing published page values are preserved for compatibility.

## Shared ribbon — complete tab-by-tab property slots

These are the property definitions actually collected by the universal UNE ribbon. Each row remains in its fixed tab/group and is enabled only for the listed UNE components. **System/Canvas commands and non-UNE standard components are separate from this metadata table.**

### Component Data

**Source**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `channelAccountObjectApiName` | Source Object — Account | conversation |
| `contactsObjectApiName` | Source Object — Contact | conversation |
| `contactSourceObjectApi` | Source Object — Contact (Flow) | conversation |
| `conversationsObjectApiName` | Source Object — Conversation | conversation |
| `messagesObjectApiName` | Source Object — Message | conversation |
| `objectApiName` | Source Object | calendar, item_grid, repeater, record_list, search, lookup, choice, cart, conversation, form, table, slot_picker, chart |
| `recordPresenterApiName` | Record presentation | conversation |
| `sourceObjectApiName` | Source Object — Flow Records | repeater |
| `stateObjectApiName` | Source Object — State | cart |

**Fields**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `ageRestrictedFieldApiName` | Age restriction field | cart |
| `badgeFieldApiName` | Card badge field | item_grid |
| `barcodeFieldApiName` | Barcode field | cart |
| `categoryFieldApiName` | Category field API name | item_grid, cart |
| `contactDisplayNameFieldApiNames` | Contact display name fields (priority) | conversation |
| `contactNameFieldApiName` | Contact name field | conversation |
| `contactSearchFieldApiName` | Contact search field | conversation |
| `conversationAccountFieldApiName` | Conversation account field | conversation |
| `conversationAssignedUserFieldApiName` | Conversation assignedUser field | conversation |
| `conversationBodyFieldApiName` | Conversation body field | conversation |
| `conversationContactNameFieldApiName` | Conversation contactName field | conversation |
| `conversationFromFieldApiName` | Conversation from field | conversation |
| `conversationIdFieldApiName` | Conversation record ID field | conversation |
| `conversationMediaNameFieldApiName` | Conversation mediaName field | conversation |
| `conversationMediaTypeFieldApiName` | Conversation mediaType field | conversation |
| `conversationMediaUrlFieldApiName` | Conversation mediaUrl field | conversation |
| `conversationNameFieldApiName` | Conversation record name field | conversation |
| `conversationOccurredFieldApiName` | Conversation occurred field | conversation |
| `conversationOutgoingOccurredFieldApiName` | Outgoing message date field | conversation |
| `conversationReadAtFieldApiName` | Conversation readAt field | conversation |
| `conversationStatusFieldApiName` | Conversation status field | conversation |
| `conversationToFieldApiName` | Conversation to field | conversation |
| `dateFieldApiName` | Event date | calendar |
| `descriptionFieldApiName` | Card description field | item_grid |
| `featuredFieldApiName` | Featured record flag field | item_grid |
| `imageFieldApiName` | Card image field | item_grid, cart |
| `messageBodyFieldApiName` | Message body field | conversation |
| `messageChannelFieldApiName` | Message channel field | conversation |
| `messageExternalIdFieldApiName` | Provider message ID field | conversation |
| `messageIdFieldApiName` | Message record ID field | conversation |
| `messageReceivedAtFieldApiName` | Message received timestamp field | conversation |
| `messageRecipientFieldApiName` | Message recipient field | conversation |
| `messageSenderFieldApiName` | Message sender field | conversation |
| `messageSentAtFieldApiName` | Message sent timestamp field | conversation |
| `messageStatusFieldApiName` | Message delivery status field | conversation |
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
| `filterInboxBusinessNumber` | Hide own business number as customer | conversation |
| `filterKey` | Shared category filter | item_grid |
| `filterLabel` | Filter group label | conversation |
| `filterOptions` | Visible conversation filters | conversation |
| `relatedFilterKey` | Selected parent shared key | item_grid |
| `restrictToAssigned` | Restrict to assigned conversations | conversation |
| `searchKey` | Shared search filter | item_grid, search |
| `searchMode` | Search behaviour | conversation |
| `searchTerm` | Inbox search term from page state | conversation |
| `selectedCategory` | Selected category | item_grid |
| `selectionFilterKey` | Selected record shared state key | item_grid, repeater, record_list |
| `showFilterTabs` | Show conversation filters | conversation |

**Records**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `items` | Navigation links | navigation, menu |
| `loading` | Loading state | lookup |
| `loadingText` | Loading message | lookup |
| `recordViewAdapter` | Record view adapter | conversation |

### Component Content

**Text**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `allCategoriesLabel` | All categories label | cart |
| `basketTitle` | Basket heading | cart |
| `categoryTabsLabel` | Category tabs accessibility label | cart |
| `clearLabel` | Clear basket label | cart |
| `contactSearchLabel` | Contact picker search label | conversation |
| `descriptionExpression` | Supporting expression | item_grid |
| `displayButtonLabel` | Customer display button | cart |
| `emptyBasketText` | Empty basket message | cart |
| `emptyConversationsText` | Empty inbox message | conversation |
| `emptyText` | Empty state message | item_grid, lookup |
| `emptyTitle` | Empty conversation title | conversation |
| `helpText` | Input help text | input |
| `label` | Button label | button, input, toggle, search, lookup |
| `messageChannelValue` | Allowed channel value | conversation |
| `messageMaxLength` | Maximum message length | conversation |
| `messageRequireBody` | Exclude messages with empty body | conversation |
| `messages` | Messages from authorised Flow/page state | conversation |
| `messageStatusNamePrefixToIgnore` | Ignored status name prefix | conversation |
| `messageStatusPrefixToIgnore` | Ignored status event prefix | conversation |
| `newConversationLabel` | New conversation label | conversation |
| `newMessageNoticeLabel` | New messages button label | conversation |
| `nextTransactionLabel` | Next customer button label | cart |
| `openLabel` | Open button | modal |
| `placeholder` | Placeholder | input, search, lookup, conversation |
| `refreshLabel` | Refresh button label | conversation |
| `searchLabel` | Search input label | conversation |
| `searchPlaceholder` | Search placeholder | conversation |
| `sentNoticeText` | Flow submission notice | conversation |
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
| `contactChoices` | Contact choices from authorised Flow | conversation |
| `controlledOpen` | Control visibility from page state | modal |
| `controlledSelection` | Control selected tab from page state | tabs, conversation |
| `controlledValue` | Control search value from page state | search |
| `conversationAccessMode` | Conversation permission source | conversation |
| `conversationSourceMode` | Conversation record format | conversation |
| `disabled` | Disabled | button, input, toggle, lookup |
| `enableAssignment` | Enable assignment actions | conversation |
| `enableNewConversation` | Enable new conversations | conversation |
| `inputMode` | Virtual keyboard type | input |
| `liveFlowRefreshEnabled` | Refresh Flow data while page is visible | conversation |
| `liveRefreshEnabled` | Refresh live records | conversation |
| `required` | Required | input |
| `selectedIndex` | Selected tab index from page state | tabs |
| `showAccountSelector` | Show account selector | conversation |
| `showAddIcon` | Show Add button | item_grid |
| `showCategoryTabs` | Show category tabs | cart |
| `showCloseButton` | Show close button | modal |
| `showComposer` | Show message composer | conversation |
| `showConversationCount` | Show conversation count | conversation |
| `showDeliveryStatus` | Show message status | conversation |
| `showHeading` | Show gallery heading | item_grid |
| `showPanel` | Show content | tabs |
| `showRefresh` | Show refresh button | conversation |
| `showSearch` | Show inbox search | conversation |
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
| `channelAccessPath` | Permission endpoint | conversation |
| `channelAccounts` | Available authorised channel accounts | conversation |
| `closeOnBackdrop` | Close on backdrop click | modal |
| `closeOnEscape` | Close on Escape key | modal |
| `conversationDefaultAccount` | Default communication channel | conversation |
| `conversationIncomingValue` | Incoming direction value | conversation |
| `conversationNameFromParticipant` | Show participant names from sender / recipient fields | conversation |
| `conversationOutgoingValue` | Outgoing direction value | conversation |
| `conversations` | Conversations from authorised Flow/page state | conversation |
| `currencyCode` | Currency code (only for monetary values) | item_grid, cart |
| `customerDisplayUrl` | Customer display URL | cart |
| `eligibleAssignees` | Authorised conversation assignees | conversation |
| `fields` | Line item fields | line_items |
| `firstDayOfWeek` | First day of week | calendar |
| `headingExpression` | Heading expression | item_grid |
| `inactivityResetSeconds` | Reset abandoned customer session after seconds (0 = disabled, 30-3600) | cart |
| `inputType` | Input type | input |
| `isOpen` | Page state: dialog is open | modal |
| `liveFlowRefreshEvents` | Comma-separated read Flow event names | conversation |
| `liveFlowRefreshIntervalMs` | Flow refresh interval in milliseconds | conversation |
| `maxLength` | Maximum text length | input |
| `multiline` | Multiline | input |
| `newConversationPresentation` | New conversation presentation | conversation |
| `pattern` | Input validation pattern | input |
| `requireChannelAccountForNew` | Require channel account for new conversation | conversation |
| `resourceValue` | Selected staff/resource | calendar |
| `searchValue` | Search query from page state | lookup |
| `selectedConversationId` | Selected conversation ID from page state | conversation |
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
| `theme` | Theme | text, image, calendar, button, card, input, toggle, badge, stack, tabs, container, grid, split_pane, navigation, menu, modal, drawer, item_grid, repeater, record_list, search, lookup, choice, cart, conversation, form, table, line_items, date_picker, slot_picker, metric, alert, progress, document_viewer, chart, option_groups |
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
| `conversationDirectionFieldApiName` | Conversation direction field | conversation |
| `detailRows` | Detail rows | item_grid |
| `direction` | Direction | stack |
| `featuredColumnSpan` | Featured tile width (columns) | item_grid |
| `featuredRowSpan` | Featured tile height (rows) | item_grid |
| `imageAspectRatio` | Image aspect ratio | item_grid |
| `messageDirectionFieldApiName` | Message direction field | conversation |
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
| `autoScrollOnNewMessage` | Follow latest thread messages | conversation |
| `messageAutoScrollThreshold` | Bottom-follow distance in pixels | conversation |
| `showNewMessageNotice` | Show newer-message notice when scrolled up | conversation |

**Mobile behaviour**

| Property key | Display label | Enabled for UNE components |
|---|---|---|
| `avoidKeyboardOverlap` | Keep mobile composer above keyboard | conversation |
| `contactPhoneFieldApiName` | Contact phone field | conversation |
| `contactPhoneFieldApiNames` | Contact phone fields (priority) | conversation |
| `conversationNormalizePhoneNumbers` | Normalize participant phone numbers | conversation |
| `conversationPhoneFieldApiName` | Conversation record phone field | conversation |
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
| `canSend` | Allow sending when authorised Flow is active | conversation |
| `checkoutLabel` | Checkout button label | cart |
| `enableSendPreparation` | Resolve Conversation record through configured Flows before send | conversation |
| `requirePerRecordSendGrant` | Require per-record send grant | conversation |
| `sendEnabled` | Enable composer (requires authorised send Flow) | conversation |

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
| `theme` | Theme | SELECT |
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
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_calendar

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
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
| `theme` | Theme | SELECT |
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
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_input

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
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
| `theme` | Theme | SELECT |
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
| `theme` | Theme | SELECT |
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
| `theme` | Theme | SELECT |
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
| `theme` | Theme | SELECT |
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
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_grid

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_split_pane

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_navigation

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `items` | Navigation links | OPTIONS |

## une_menu

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `items` | Menu links | OPTIONS |

## une_modal

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
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
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_item_grid

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
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
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |
| `recordSubtitleFieldApiName` | Subtitle | OBJECT_FIELD |
| `selectionFilterKey` | Selected record state key | TEXT |
| `recordBadgeFieldApiName` | Record badge field | OBJECT_FIELD |
| `recordTrailingFieldApiName` | Record trailing field | OBJECT_FIELD |
| `searchFieldApiName` | Record search field | OBJECT_FIELD |
| `sourceObjectApiName` | Source Object — Flow Records | TEXT |

## une_record_list

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |
| `selectionFilterKey` | Selected record state key | TEXT |

## une_search

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
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
| `theme` | Theme | SELECT |
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
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |

## une_cart

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
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
| `barcodeFieldApiName` | Barcode field | OBJECT_FIELD |
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
| `stateObjectApiName` | Source Object — State | OBJECT |
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
| `theme` | Theme | SELECT |
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
| `placeholder` | Composer placeholder | TEXT |
| `viewMode` | Conversation view | SELECT |
| `enableNewConversation` | Enable new conversations | BOOLEAN |
| `title` | Title | TEXT |
| `searchPlaceholder` | Search placeholder | TEXT |
| `conversationsObjectApiName` | Source Object — Conversation | OBJECT |
| `messagesObjectApiName` | Source Object — Message | OBJECT |
| `channelAccountObjectApiName` | Source Object — Account | OBJECT |
| `contactsObjectApiName` | Source Object — Contact | OBJECT |
| `recordPresenterApiName` | Record presentation | TEXT |
| `restrictToAssigned` | Restrict to assigned conversations | BOOLEAN |
| `enableAssignment` | Enable assignment actions | BOOLEAN |
| `messageMaxLength` | Maximum message length | NUMBER |
| `emptyTitle` | Empty conversation title | TEXT |
| `recordViewAdapter` | Record view adapter | TEXT |
| `conversationDirectionFieldApiName` | Conversation direction field | OBJECT_FIELD |
| `conversationAccountFieldApiName` | Conversation account field | OBJECT_FIELD |
| `conversationFromFieldApiName` | Conversation from field | OBJECT_FIELD |
| `conversationToFieldApiName` | Conversation to field | OBJECT_FIELD |
| `conversationOccurredFieldApiName` | Conversation occurred field | OBJECT_FIELD |
| `conversationBodyFieldApiName` | Conversation body field | OBJECT_FIELD |
| `conversationContactNameFieldApiName` | Conversation contactName field | OBJECT_FIELD |
| `conversationAssignedUserFieldApiName` | Conversation assignedUser field | OBJECT_FIELD |
| `conversationReadAtFieldApiName` | Conversation readAt field | OBJECT_FIELD |
| `conversationStatusFieldApiName` | Conversation status field | OBJECT_FIELD |
| `conversationMediaUrlFieldApiName` | Conversation mediaUrl field | OBJECT_FIELD |
| `conversationMediaNameFieldApiName` | Conversation mediaName field | OBJECT_FIELD |
| `conversationMediaTypeFieldApiName` | Conversation mediaType field | OBJECT_FIELD |
| `conversationIncomingValue` | Incoming direction value | TEXT |
| `conversationOutgoingValue` | Outgoing direction value | TEXT |
| `channelAccessPath` | Permission endpoint | TEXT |
| `contactNameFieldApiName` | Contact name field | OBJECT_FIELD |
| `contactPhoneFieldApiName` | Contact phone field | OBJECT_FIELD |
| `liveRefreshEnabled` | Refresh live records | BOOLEAN |
| `conversationAccessMode` | Conversation permission source | SELECT |
| `conversationDefaultAccount` | Default communication channel | TEXT |
| `sendEnabled` | Enable composer (requires authorised send Flow) | BOOLEAN |
| `enableSendPreparation` | Resolve Conversation record through configured Flows before send | BOOLEAN |
| `conversationNormalizePhoneNumbers` | Normalize participant phone numbers | BOOLEAN |
| `conversationNameFromParticipant` | Show participant names from sender / recipient fields | BOOLEAN |
| `conversationOutgoingOccurredFieldApiName` | Outgoing message date field | OBJECT_FIELD |
| `objectApiName` | Source Object | OBJECT |
| `conversations` | Conversations from authorised Flow/page state | RECORD_LIST |
| `messages` | Messages from authorised Flow/page state | RECORD_LIST |
| `contactChoices` | Contact choices from authorised Flow | RECORD_LIST |
| `channelAccounts` | Available authorised channel accounts | RECORD_LIST |
| `eligibleAssignees` | Authorised conversation assignees | RECORD_LIST |
| `showSearch` | Show inbox search | BOOLEAN |
| `showFilterTabs` | Show conversation filters | BOOLEAN |
| `showAccountSelector` | Show account selector | BOOLEAN |
| `showRefresh` | Show refresh button | BOOLEAN |
| `showConversationCount` | Show conversation count | BOOLEAN |
| `showComposer` | Show message composer | BOOLEAN |
| `showDeliveryStatus` | Show message status | BOOLEAN |
| `searchMode` | Search behaviour | SELECT |
| `newConversationPresentation` | New conversation presentation | SELECT |
| `selectedConversationId` | Selected conversation ID from page state | TEXT |
| `searchTerm` | Inbox search term from page state | TEXT |
| `newConversationLabel` | New conversation label | TEXT |
| `refreshLabel` | Refresh button label | TEXT |
| `canSend` | Allow sending when authorised Flow is active | BOOLEAN |
| `searchLabel` | Search input label | TEXT |
| `filterLabel` | Filter group label | TEXT |
| `contactSearchLabel` | Contact picker search label | TEXT |
| `sentNoticeText` | Flow submission notice | TEXT |
| `emptyConversationsText` | Empty inbox message | TEXT |
| `controlledSelection` | Bind selected conversation to page state | BOOLEAN |
| `requirePerRecordSendGrant` | Require per-record send grant | BOOLEAN |
| `requireChannelAccountForNew` | Require channel account for new conversation | BOOLEAN |
| `filterOptions` | Visible conversation filters | OPTIONS |
| `conversationSourceMode` | Conversation record format | SELECT |
| `conversationIdFieldApiName` | Conversation record ID field | OBJECT_FIELD |
| `conversationNameFieldApiName` | Conversation record name field | OBJECT_FIELD |
| `conversationPhoneFieldApiName` | Conversation record phone field | OBJECT_FIELD |
| `messageIdFieldApiName` | Message record ID field | OBJECT_FIELD |
| `messageDirectionFieldApiName` | Message direction field | OBJECT_FIELD |
| `messageSenderFieldApiName` | Message sender field | OBJECT_FIELD |
| `messageRecipientFieldApiName` | Message recipient field | OBJECT_FIELD |
| `messageBodyFieldApiName` | Message body field | OBJECT_FIELD |
| `messageSentAtFieldApiName` | Message sent timestamp field | OBJECT_FIELD |
| `messageReceivedAtFieldApiName` | Message received timestamp field | OBJECT_FIELD |
| `messageStatusFieldApiName` | Message delivery status field | OBJECT_FIELD |
| `messageChannelFieldApiName` | Message channel field | OBJECT_FIELD |
| `messageChannelValue` | Allowed channel value | TEXT |
| `messageExternalIdFieldApiName` | Provider message ID field | OBJECT_FIELD |
| `messageStatusPrefixToIgnore` | Ignored status event prefix | TEXT |
| `messageStatusNamePrefixToIgnore` | Ignored status name prefix | TEXT |
| `messageRequireBody` | Exclude messages with empty body | BOOLEAN |
| `contactSourceObjectApi` | Source Object — Contact (Flow) | TEXT |
| `liveFlowRefreshEnabled` | Refresh Flow data while page is visible | BOOLEAN |
| `liveFlowRefreshIntervalMs` | Flow refresh interval in milliseconds | NUMBER |
| `liveFlowRefreshEvents` | Comma-separated read Flow event names | TEXT |
| `autoScrollOnNewMessage` | Follow latest thread messages | BOOLEAN |
| `showNewMessageNotice` | Show newer-message notice when scrolled up | BOOLEAN |
| `newMessageNoticeLabel` | New messages button label | TEXT |
| `contactDisplayNameFieldApiNames` | Contact display name fields (priority) | TEXT |
| `contactPhoneFieldApiNames` | Contact phone fields (priority) | TEXT |
| `contactSearchFieldApiName` | Contact search field | OBJECT_FIELD |
| `messageAutoScrollThreshold` | Bottom-follow distance in pixels | NUMBER |
| `filterInboxBusinessNumber` | Hide own business number as customer | BOOLEAN |
| `avoidKeyboardOverlap` | Keep mobile composer above keyboard | BOOLEAN |

## une_form

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |
| `title` | Form title | TEXT |

## une_table

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |

## une_line_items

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `fields` | Line item fields | FIELD_LIST |

## une_date_picker

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_slot_picker

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |

## une_metric

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `title` | Label | TEXT |

## une_alert

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_progress

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_document_viewer

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

## une_chart

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |
| `objectApiName` | Source Object | OBJECT |

## une_option_groups

| Property key | Label | Kind |
|---|---|---|
| `theme` | Theme | SELECT |
| `borderColor` | Border colour | COLOR |
| `radius` | Corner radius (px) | NUMBER |
| `shadow` | Shadow | SELECT |

