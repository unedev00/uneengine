# Formula Engine Phase 1C Numeric Coverage

This matrix describes the shared numeric formula contract implemented by the server evaluator and page-binding evaluator. Currency, percent, integer, and number field values use the platform's underlying finite numeric value; formula evaluation does not apply display formatting or currency conversion.

The roadmap lists the Salesforce Help formula references, but they currently return only a loading shell. Accordingly, the table states tested MetaDrive behavior and does not claim unverified release-specific Salesforce behavior.

| Function | Verified behavior |
|---|---|
| `ABS` | Finite absolute value. |
| `ROUND` | Decimal scale from -100 to 100; decimal half values round away from zero. |
| `ROUNDUP` | Rounds away from zero at the requested decimal scale. |
| `ROUNDDOWN` | Rounds toward zero at the requested decimal scale. |
| `TRUNC` | Truncates toward zero at the requested decimal scale. |
| `MIN`, `MAX` | One to twenty finite numeric arguments. |
| `MOD` | JavaScript-style remainder; divisor zero is rejected. |
| `SIGN` | Returns -1, 0, or 1. |
| `SQRT` | Accepts non-negative inputs; negative values produce a specific domain error. |
| `POWER` | Exponentiation; non-finite/domain results are rejected. |
| `CEILING`, `MCEILING` | Round toward positive infinity to an integer. |
| `FLOOR`, `MFLOOR` | Round toward negative infinity to an integer. |
| `EXP` | Natural exponential; non-finite results are rejected. |
| `LN` | Natural logarithm; requires a positive input. |
| `LOG` | Base-10 by default or an explicit positive base other than one; input must be positive. |
| `PI` | Zero-argument constant; supported in server consumers and page bindings. |
| `SIN`, `COS`, `TAN` | Radian input. |
| `ASIN`, `ACOS` | Input must be in [-1, 1]; returns radians. |
| `ATAN`, `ATAN2` | Radian output; `ATAN2(y, x)` argument order. |
| `SINH`, `COSH`, `TANH` | Hyperbolic functions. |
| `DEGREES`, `RADIANS` | Convert between radians and degrees. |

## Validation

`apps/server/test/system/formula-phase1c.test.ts` exercises every function across formula-field, validation-rule, Flow, and page-binding contexts. It checks normal/nested results, arity, argument types, sign and scale boundaries, numeric field categories, invalid domains, overflow, and display-independent numeric values.
