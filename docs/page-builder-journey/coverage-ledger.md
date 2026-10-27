# MetaDrive Page Builder — current-code coverage ledger (PR #38)

This is a **descriptor inventory and outstanding E2E validation matrix**, not a claim that every listed property or event works end-to-end. Source: current `apps/web/src/one/manifest.json` and 36 registered `component.json` descriptors read on the PR branch (27 October 2026). Numbers include component-local properties; shared UNE appearance mixins may add more at registration.

`Event IDs` below are precisely the events declared by that component (— means none in its descriptor; it does not establish that no implicit runtime interaction exists). All descriptors have a bundled component rendering test. None of the 36 has been proven to meet **the complete acceptance journey** from the requested plan. The **Target tab** is an intended editing owner, not evidence of completed editor support.

| Component | Stable ID | Local properties | Declared event IDs | Target tab(s) | Outstanding acceptance verification / implementation |
|---|---|---:|---|---|---|
| Text | `une_text` | 15 | None | Content / Design | fixed or bound text, link behaviour |
| Image | `une_image` | 18 | None | Content / Design / Layout | accessible image source, fallback and click |
| Badge | `une_badge` | 14 | None | Content / Design / Actions | selected and condition states |
| Alert | `une_alert` | 15 | None | Content / Design / Actions | dismiss scope and feedback |
| Button | `une_button` | 16 | `click` | Content / Actions | loading, failed writes, repeated-click protection |
| Card | `une_card` | 18 | None | Content / Design / Layout / Actions | part mapping and context-specific child action |
| Card Grid | `une_item_grid` | 63 | `itemSelect, itemAdd` | Data / Content / Design / Layout / Actions | generic details rows; more complete per-part controls; selection/add event runtime |
| Record List | `une_record_list` | 24 | `itemSelect` | Data / Content / Actions | row selection and empty/permission states |
| Table | `une_table` | 20 | `rowSelect` | Data / Content / Actions | editing, row validation and selection |
| Repeater | `une_repeater` | 31 | `itemSelect` | Data / Content / Layout / Actions | nested item bindings and event context |
| Chart | `une_chart` | 20 | `itemSelect` | Data / Content / Design / Actions | aggregation, filtering and drill-down |
| Metric | `une_metric` | 16 | None | Data / Content / Design | thresholds and drill-down |
| Progress | `une_progress` | 16 | None | Content / Design | zero-target and out-of-range |
| Calendar | `une_calendar` | 28 | `dateSelect, eventSelect, viewChange` | Data / Content / Actions | timezone and permitted edits |
| Date Picker | `une_date_picker` | 16 | `change` | Content / Actions | limits and timezone |
| Slot Picker | `une_slot_picker` | 21 | `change` | Data / Content / Actions | availability revalidation |
| Form | `une_form` | 20 | `submit` | Data / Content / Actions | create/edit, validation and save/refresh |
| Input | `une_input` | 26 | `change` | Content / Actions | blur/Enter support and validation timing |
| Choice | `une_choice` | 23 | `change` | Data / Content / Actions | dependent clearing and multiple selection |
| Toggle | `une_toggle` | 16 | `change` | Content / Actions | failed-write handling |
| Lookup | `une_lookup` | 31 | `change, search` | Data / Content / Actions | stable selected identity and reset |
| Option Groups | `une_option_groups` | 20 | `change, confirm` | Content / Actions | option calculations and maximums |
| Search | `une_search` | 23 | `change, submit, select` | Data / Actions | target linking, reset and no-match states |
| Container | `une_container` | 15 | None | Design / Layout | child context and visible placeholder |
| Stack | `une_stack` | 16 | None | Layout | responsive child positioning |
| Grid | `une_grid` | 17 | None | Layout | device spans and nesting |
| Split Pane | `une_split_pane` | 15 | None | Layout | collapse/mobile stacking |
| Tabs | `une_tabs` | 19 | `tabChange` | Content / Design / Actions | tab conditions and fallback |
| Modal | `une_modal` | 24 | `open, close` | Content / Design / Actions | trigger, focus restoration and validation |
| Drawer | `une_drawer` | 17 | `open, close` | Content / Design / Actions | record context and focus |
| Navigation | `une_navigation` | 15 | `navigate` | Content / Actions | permissions and active destination |
| Menu | `une_menu` | 14 | `navigate` | Content / Actions | disabled condition and keyboard states |
| Document Viewer | `une_document_viewer` | 16 | `print` | Data / Content / Actions | permissions, print/download and invalid file |
| Conversation | `une_conversation` | 114 | `start, select, search, refresh, create, resolve, send, assign, contactSelect, contactSearch, newConversationOpen` | Data / Content / Actions | message mapping, retry and statuses |
| Cart | `une_cart` | 66 | `checkout` | Data / Content / Actions | connected add, quantity, authoritative totals and checkout |
| Line Items | `une_line_items` | 18 | `change, submit` | Data / Content / Actions | row validation/calculations and save |

## Changes this PR actually implements

- A dedicated Content ribbon journey step and central persistent page/save/device header.
- Data source vs Content field mapping for Card Grid, including preserved mappings, suggestions and missing-mapping warning.
- Shared inline editors for source scope, staged base record filters, visibility rules and event actions; no Page Builder-specific Data or Visibility modal.
- Card Grid part selection and runtime-backed image width/height/position/shape and independent heading, supporting and value typography; optional child Add button with separately emitted `itemAdd` event, and friendly Cart component selection; associated component metadata.
- Shared browser/server setting definition now includes validated `section` and `group` presentation hints.
- Targeted source-contract regression tests. CI and browser E2E outcomes must be recorded separately.

## Not yet accepted

The required end-to-end user directory, product-cart checkout, records workspace, combined conditional rules, and published/draft persistence scenarios still need browser and real-server verification; existing SQL tenant/RBAC guarantees cannot be inferred from descriptor registration. Unsupported events must not be inserted into selectors. In particular, the present filter editor still offers a technical page-state key and uses the shared filter contract, rather than the fully friendly connected-component selector requested in the plan. Per-field mapping compatibility, deep conditional styling/tab rules, cart authoritative checkout and all responsive/device variants remain to be validated or completed.

## Property/event coverage requirement

Every stored property is accepted via the shared Property Engine, but registration alone is not a runtime-use proof. For a **complete** property-by-property audit, compare each local property and injected common appearance property with an editor control, its value validation, the compiled renderer's actual read, any event payload, saved SQL metadata, and published-page browser assertions. Test evidence must distinguish not configured, loading, ready, empty, no matches, disabled, failure and success. This ledger is the accountable starting inventory, **not** a substitute for that audit.
