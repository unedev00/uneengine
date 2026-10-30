# Formula Engine Phase 1B Function Coverage

This matrix records executable MetaDrive behavior and test coverage for Phase 1B. “Supported” means the current contract is exercised across formula-field, validation-rule, Flow, and ribbon-binding evaluation. It does not claim release-wide Salesforce parity where behavior depends on field metadata, locale, or Unicode rules.

The report’s Salesforce references are [All Formula Operators and Functions](https://help.salesforce.com/s/articleView?id=sf.customize_functions_i_z.htm&language=en_US&type=0) and [Formula Operators and Functions by Context](https://help.salesforce.com/s/articleView?id=customize_functions.htm&language=en_US&type=5). These Help pages rendered only a loading shell when checked for this implementation, so the partial rows below remain explicit follow-up items rather than inferred Salesforce guarantees.

| Function | Status | Verified behavior / remaining scope |
|---|---|---|
| `IF` | Supported | Lazy branch evaluation; null condition is false. |
| `IFERROR` | Supported | Lazy fallback; catches evaluation errors in its first expression. |
| `CASE` | Supported | Ordered exact-value matching, lazy results/default, and bounded even argument count. |
| `AND` | Supported | Lazy evaluation; one to twenty Boolean arguments. |
| `OR` | Supported | Lazy evaluation; one to twenty Boolean arguments. |
| `NOT` | Supported | Shared Boolean coercion. |
| `XOR` | Supported | True when an odd number of arguments are true; two to twenty arguments. |
| `ISBLANK` | Partial | Null, undefined, and empty-string inputs are blank. Salesforce distinctions that depend on field type need field metadata. |
| `ISNULL` | Partial | Returns true only for null/undefined; empty text is false. Salesforce's field-type-specific behavior needs field metadata. |
| `ISNUMBER` | Supported | Accepts finite numbers and non-empty numeric strings; Boolean values are not numeric. |
| `BLANKVALUE` | Supported | Lazy fallback for null or empty-string input; zero and false are preserved. |
| `NULLVALUE` | Partial | Lazy fallback for null/undefined; empty text, zero, and false are preserved. Field-type-specific behavior needs field metadata. |
| `TEXT` | Partial | Boolean values render as `TRUE`/`FALSE`; scalar and picklist values convert consistently. Locale-sensitive date, time, percent, and currency formatting needs field/user locale metadata. |
| `VALUE` | Partial | Finite decimal strings are parsed. Locale-specific grouping, decimal separators, and currency/percent display forms are not implemented. |
| `T` | Supported | Returns string inputs; other scalar inputs produce blank. |
| `LEN` | Partial | Counts Unicode code points; supplementary-character behavior needs Salesforce certification. |
| `LEFT` | Partial | Optional count; positions use Unicode code points. Supplementary-character parity needs certification. |
| `RIGHT` | Partial | Optional count and zero-length behavior; positions use Unicode code points. Supplementary-character parity needs certification. |
| `MID` | Partial | One-based start position and bounded length; positions use Unicode code points. Supplementary-character parity needs certification. |
| `FIND` | Partial | Case-sensitive, one-based position; missing text returns zero. Positions use Unicode code points; supplementary-character parity needs certification. |
| `BEGINS` | Supported | Case-sensitive prefix check; empty search text matches. |
| `CONTAINS` | Supported | Case-sensitive substring check; empty search text matches. |
| `EXACT` | Supported | Case-sensitive text equality. |
| `UPPER` | Supported | Unicode case conversion using the JavaScript runtime. |
| `LOWER` | Supported | Unicode case conversion using the JavaScript runtime. |
| `PROPER` | Partial | Unicode-aware word-start capitalization is consistent across clients; locale-specific casing rules need certification. |
| `TRIM` | Partial | Removes JavaScript-recognized surrounding whitespace and preserves internal spaces. Exact Salesforce whitespace rules need certification. |
| `CONCATENATE` | Supported | Nulls become empty text; one to twenty arguments. |
| `SUBSTITUTE` | Supported | Replaces all matches by default or a selected one-based occurrence; negative occurrence is rejected. |
| `REPLACE` | Partial | Uses one-based start and character count with Unicode code-point indexing; supplementary-character parity needs certification. |
| `REPT` | Supported | Repeats text with a 4,000-Unicode-code-point output bound. |
| `LPAD` | Partial | Optional pad character defaults to space; Unicode code-point lengths; inputs longer than target are truncated; 4,000-character bound. Truncation parity needs Salesforce certification. |
| `RPAD` | Partial | Optional pad character defaults to space; Unicode code-point lengths; inputs longer than target are truncated; 4,000-character bound. Truncation parity needs Salesforce certification. |
| `REVERSE` | Supported | Reverses Unicode code points without splitting surrogate pairs. |
| `ASCII` | Partial | Returns the first Unicode code point; non-ASCII behavior needs Salesforce certification. Empty input returns zero. |
| `CHAR` | Partial | Truncates numeric input, then accepts codes 1–255. Extended Unicode and zero-code behavior are not supported. |
| `ENCODEURL` | Partial | Uses the shared JavaScript URI-component encoding. Exact Salesforce escaping of punctuation needs certification. |
| `URLENCODE` | Partial | Retained as a compatibility alias of `ENCODEURL`; it is not a separate form-encoding implementation. |
| `URLDECODE` | Supported | Decodes URI-component text and rejects malformed escape sequences. |

No named Phase 1B function is currently a gap: every function has a runtime handler and table-driven positive, null, edge, nested, arity, and authoring-type fixtures. Partial items are explicit compatibility limits, not claims of complete Salesforce equivalence.

## Additional picklist coverage

`ISPICKVAL` and `INCLUDES` remain available as existing platform extensions. Tests verify picklist-to-text conversion and exact picklist/multipicklist matching across the same consumer contexts.

## Validation

`apps/server/test/system/formula-phase1b.test.ts` exercises every function in the matrix across formula-field, validation-rule, Flow, and ribbon-binding evaluation. The tests also check lazy branches, nulls, invalid arity, edge cases, nested expressions, declared argument types, and picklist helpers.
