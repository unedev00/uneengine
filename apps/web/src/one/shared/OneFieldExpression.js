/**
 * Evaluate a deliberately tiny field-expression grammar:
 *   @FieldApiName & " literal " & @OtherField
 * This is not JavaScript and never executes user-provided code.
 */
export function evaluateFieldExpression(expression, record) {
  if (typeof expression !== "string" || expression.length > 2048) return "";
  const input = expression.trim();
  if (!input) return "";
  const values = [];
  let index = 0;
  let requireTerm = true;
  let parts = 0;
  while (index < input.length && parts <= 64) {
    while (/\\s/.test(input[index] || "") && index < input.length) index++;
    if (index >= input.length) break;
    if (!requireTerm) {
      if (input[index] !== "&") return "";
      index++;
      requireTerm = true;
      continue;
    }
    if (input[index] === "@") {
      const match = /^@([A-Za-z][A-Za-z0-9_]*)/.exec(input.slice(index));
      if (!match) return "";
      const name = match[1];
      const raw = record && Object.prototype.hasOwnProperty.call(record, name) ? record[name] : "";
      values.push(raw === undefined || raw === null ? "" : String(raw));
      index += match[0].length;
    } else if (input[index] === '"') {
      let literal = "";
      let closed = false;
      index++;
      while (index < input.length) {
        const ch = input[index++];
        if (ch === '"') {
          if (input[index] === '"') { literal += '"'; index++; }
          else { closed = true; break; }
        } else {
          literal += ch;
        }
      }
      if (!closed) return "";
      values.push(literal);
    } else {
      return "";
    }
    requireTerm = false;
    parts++;
  }
  return requireTerm || parts > 64 ? "" : values.join("");
}
