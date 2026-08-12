export function parseNumericValue(valStr: string | null): number {
  if (!valStr) return 0;
  let cleaned = valStr.replace(/[$,\s]/g, '');
  let isNegative = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1);
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : isNegative ? -num : num;
}

// '' -> [], and every line is checked (not just the first, unlike the old
// Jinja/JS port this replaces).
export function splitLines(value: string | null): string[] {
  return value ? value.split('\n').filter((l) => l.trim() !== '') : [];
}
