/** Shared, side-effect-free comparison for metadata record filters and visibility rules.
 * Validity, read permissions and field presence are checked by callers.
 * Preserve the existing locale-specific Contains behaviour for record filters.
 */
export function compareMetadataValue(
  actual: unknown, operator: string, expected: unknown, localeCase = false
): boolean {
  const blank = actual === null || actual === undefined
    || (typeof actual === 'string' && actual.trim() === '');
  if (operator === 'Is Blank') return blank;
  if (operator === 'Is Not Blank') return !blank;
  if (blank) return false;
  const left = String(actual);
  const right = String(expected ?? '');
  switch (operator) {
    case 'Equals': return left === right;
    case 'Not Equals': return left !== right;
    case 'Contains': return localeCase
      ? left.toLocaleLowerCase().includes(right.toLocaleLowerCase())
      : left.toLowerCase().includes(right.toLowerCase());
    case 'Greater Than':
    case 'Greater Than or Equal':
    case 'Less Than':
    case 'Less Than or Equal': {
      const numericLeft = Number(actual);
      const numericRight = Number(right);
      let leftValue = numericLeft;
      let rightValue = numericRight;
      if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
        const isoDate = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
        if (typeof actual !== 'string' || typeof expected !== 'string'
          || !isoDate.test(actual) || !isoDate.test(expected)) return false;
        leftValue = Date.parse(actual);
        rightValue = Date.parse(expected);
        if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return false;
      }
      if (operator === 'Greater Than') return leftValue > rightValue;
      if (operator === 'Greater Than or Equal') return leftValue >= rightValue;
      if (operator === 'Less Than') return leftValue < rightValue;
      return leftValue <= rightValue;
    }
    default: return false;
  }
}
