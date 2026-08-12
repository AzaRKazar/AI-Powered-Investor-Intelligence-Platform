export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Lightweight, safe markdown renderer for chat responses: escapes HTML
 * first, then supports paragraphs, line breaks, **bold**, and "- "/"1. "
 * lists - covers the formatting LLM answers actually use without pulling
 * in a full markdown library. Escape-before-transform order is what makes
 * the later dangerouslySetInnerHTML safe - do not reorder.
 */
export function renderMarkdown(rawText: string): string {
  const escaped = escapeHtml(rawText);
  const inline = (line: string) =>
    line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  const blocks = escaped.split(/\n\s*\n/);
  const html = blocks
    .map((block) => {
      const lines = block.split('\n').filter((l) => l.trim() !== '');
      if (lines.length === 0) return '';

      const isBulletList = lines.every((l) => /^\s*[-*]\s+/.test(l));
      const isNumberedList = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));

      if (isBulletList) {
        const items = lines
          .map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      if (isNumberedList) {
        const items = lines
          .map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`)
          .join('');
        return `<ol>${items}</ol>`;
      }
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('');

  return html || `<p>${escaped}</p>`;
}
