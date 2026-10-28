# Flow screen component parity — Phase 2

Status: **Phase 2 implementation increment**
Scope: no-code Screen Flow controls and conditional visibility; Apex excluded.

## Existing MetaDrive screen controls

The Flow Builder authors screen fields as metadata, and the shared Screen Flow runtime renders them. This is an inventory of implemented MetaDrive categories, not a claim that every Salesforce component has identical behavior.

| Category | MetaDrive controls / behavior | Evidence |
|---|---|---|
| Basic text and input | Text, Password, Long Text Area, Email, URL, Phone, Number, Currency, Date, Time, Date/Time | Builder type list and screen renderer |
| Boolean and range | Checkbox, Toggle, Slider | Builder type list and screen renderer |
| Choice | Picklist as Dropdown or Radio Buttons; Multi-Select Picklist as Multi-Select Dropdown or Checkbox Group; static choices and reusable Choice Set resources | Builder choice editor and server-side Choice Set hydration |
| Display and structure | Display Text with resource interpolation, Display Image with alternative text, Section with description and one/two columns | Builder editor and screen renderer |
| Composite and record controls | Address, Name, Lookup, Choice Lookup, Data Table, Repeater | Lazy-loaded advanced screen field renderer |
| Files | File Upload with allowed-type, per-file and total size/count checks | Advanced screen field renderer and upload validator |
| Registered extensions | Published registered UNE components, configured with the shared Property Engine, styles/layout and component-specific properties | Flow component selector and `RegisteredComponent` runtime |
| Shared field behavior | Defaults, required state, help text, min/max, lengths, step, patterns, validation message, All/Any conditional visibility | Builder editor and runtime |
| Screen navigation | Configurable screen outcomes/buttons, previous-screen navigation, persisted interview values | Flow Builder, dialog and interview runtime |

Key implementations: [FlowBuilder screen editor](../apps/web/src/core/builders/FlowBuilder/FlowBuilder.tsx), [screen renderer](../apps/web/src/core/automation/FlowScreen/FlowScreenContent.tsx), [advanced fields](../apps/web/src/core/automation/FlowScreen/FlowScreenAdvancedField.tsx), [screen runtime helpers](../apps/web/src/core/automation/FlowScreen/flowScreenRuntimeUtils.ts), and [server screen selection checks](../apps/server/src/system-files/flow-screen-record-selection.ts).

## Gap addressed in this increment

Before this phase, visibility conditions supported equality/inequality, null checks, Contains and Starts With only. Numeric range and date comparisons and multi-select membership were missing from the authoring/runtime path.

The Builder, shared visibility evaluator and server draft validator now support:

- Equals and Does Not Equal (legacy `Not Equals` and `Not Equal To` metadata remain readable)
- Greater Than, Greater Than or Equal To, Less Than, and Less Than or Equal To for valid numeric or ISO date/date-time values
- Is Null and Is Not Null, including empty multi-select arrays
- Contains, Does Not Contain, Starts With, and Includes for multi-select arrays or semicolon-delimited values
- Existing All/Any condition logic, with unsupported imported operators evaluating false rather than silently behaving as Equals
- Server validation of operator names, All/Any logic and references to other declared screen fields

Screen visibility is presentation logic, not an authorization boundary. Server-side object, field and record permissions remain authoritative.

## Remaining parity work

- Compare the registered and built-in components with the current Salesforce screen component list, individually, before claiming component parity.
- Confirm each advanced field's required/minimum/maximum validation behavior at runtime, including custom components and multi-select record selections.
- Verify choice resources with all supported choice-producing mechanisms and data types; the current server hydration contract explicitly handles static Choice Sets for Picklist.
- Assess Salesforce-specific rich text, data-bound components, multi-screen navigation behaviors and screen-specific validation features. Add only where no shared MetaDrive component/Property Engine capability already covers the user need.
- Test accessibility, responsive behavior and complete persisted interview round trips in browser acceptance, not only helper-level tests.

## Acceptance evidence

- `apps/web/test/flowScreenRuntimeUtils.test.ts` covers numeric/date comparisons, null and multi-select semantics, All/Any and fail-closed handling for unknown operators.
- The Flow metadata test suite includes this screen visibility test file.
- Browser acceptance should create a Screen Flow with dependent numeric/date and multi-select fields, exercise All/Any, submit/back through persisted interview state and confirm no hidden-field visibility behavior is used as an access control.
