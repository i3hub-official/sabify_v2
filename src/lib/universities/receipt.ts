import * as cheerio from 'cheerio';

export function maskValue(value: string, showStart: number, showEnd: number): string {
  if (value.length <= showStart + showEnd) return value;
  return (
    value.slice(0, showStart) +
    '•'.repeat(value.length - showStart - showEnd) +
    value.slice(-showEnd)
  );
}

export function extractRefFromUrl(raw: string, param: string): string {
  const trimmed = raw.trim();

  // Case 1: full URL with query param e.g. ?ivn=xxx or ?pmid=xxx
  try {
    const u = new URL(trimmed);
    const val = u.searchParams.get(param);
    if (val) return val.trim();

    // Case 2: path segment after param e.g. /validate/2025030223877
    const segments = u.pathname.split('/');
    const idx = segments.indexOf(param);
    if (idx !== -1 && segments[idx + 1]) return segments[idx + 1].trim();
  } catch { /* not a URL */ }

  // Case 3: bare query param e.g. "id=xxx"
  const match = trimmed.match(new RegExp(`[?&]?${param}=([^&\\s]+)`, 'i'));
  if (match) return match[1].trim();

  // Case 4: raw value
  return trimmed;
}

export function parseReceiptHtml(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const map: Record<string, string> = {};

  $('tr').each((_, row) => {
    const cells = $(row).find('td, th');
    const texts = cells.map((_, el) => $(el).text().trim()).get();
    for (let i = 0; i < texts.length - 1; i++) {
      if (texts[i].endsWith(':')) {
        const label = texts[i].replace(/:$/, '').trim().toLowerCase();
        const value = texts[i + 1].trim();
        if (label && value) map[label] = value;
        i++;
      }
    }
  });

  return map;
}