# Formula Engine Phase 1D Date/Time Coverage

The shared date/time implementation is used by Flow formulas, formula fields,
validation rules, formula defaults, and browser page bindings. Formula
evaluation uses canonical `YYYY-MM-DD` strings for Date results and UTC ISO
8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`) for DateTime results. Locale affects
display formatting, not stored formula values.

Server formula adapters use the executing user's configured IANA time zone.
Each evaluation pass snapshots one `now` instant, so `NOW()`, `TODAY()`, and
`TIMENOW()` remain consistent while formulas or rules in that pass execute.
The shared browser evaluator accepts an explicit `{ timeZone, now }` context
and otherwise uses UTC. Registered page bindings receive the authenticated
user's time zone from `/auth/me`; they capture one clock instant per property
resolution pass and fail explicitly if a time-zone-sensitive expression has
no authenticated time-zone context.

| Function or behavior | Verified semantics |
|---|---|
| `DATE`, `DATEVALUE` | Strict Gregorian date parsing; DateTime-to-Date conversion uses the evaluation time zone. |
| `DATETIMEVALUE` | Offset-bearing values are normalized to UTC; offset-free values are interpreted as local wall time in the evaluation time zone. |
| `TIMEVALUE` | Returns a canonical `HH:mm:ss.sss` value, applying the evaluation zone to DateTime input. |
| `TODAY`, `NOW`, `TIMENOW` | Derived from one captured evaluation instant; `NOW()` returns UTC ISO DateTime. |
| `DAY`, `MONTH`, `YEAR`, `HOUR`, `MINUTE`, `SECOND`, `WEEKDAY` | Extracted in the evaluation time zone; `WEEKDAY` numbers Sunday as 1. |
| `ISOWEEK`, `ISOYEAR` | ISO-8601 week and week-year, including year-boundary cases. |
| `ADDDAYS`, `ADDMONTHS` | Date and DateTime inputs preserve their result type; arithmetic supports leap days and month-end clamping. DateTime function arithmetic preserves local wall time; nonexistent destination times are rejected. |
| Date/DateTime operators | Same-kind temporal comparisons are chronological; subtracting matching values returns a day count. DateTime numeric arithmetic uses elapsed 24-hour days, while `ADDDAYS`/`ADDMONTHS` preserve local wall time. Mixed Date and DateTime operations are rejected. |
| `TZOFFSET` | Returns the time-zone offset in milliseconds at the supplied instant, including daylight-saving changes. |

DST gaps, deterministic overlap resolution, leap years, month ends, invalid
input, UTC offsets, blank/default context handling, chronological comparison,
and stable time-dependent values are covered by
`apps/server/test/system/formula-phase1d.test.ts`.

The Phase 1D roadmap references Salesforce Help pages that returned only a
loading shell during verification. This matrix records tested MetaDrive
behavior and does not claim release-specific Salesforce behavior that could
not be independently confirmed.
