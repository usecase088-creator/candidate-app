// The CV as a printable page for expo-print (A4). Every value is escaped: names and summaries are typed by users.
import type { Cv, CvItem } from './cvModel';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

const lines = (s: string) => escapeHtml(s).replace(/\n/g, '<br/>');

function item(i: CvItem): string {
  return `<div class="item">
    ${i.heading || i.tag ? `<div class="row"><b>${escapeHtml(i.heading)}</b>${i.tag ? `<span class="tag">${escapeHtml(i.tag)}</span>` : ''}</div>` : ''}
    ${i.sub ? `<div class="sub">${escapeHtml(i.sub)}</div>` : ''}
    ${i.body ? `<p>${lines(i.body)}</p>` : ''}
    ${i.chips && i.chips.length > 0 ? `<div class="chips">${i.chips.map((c) => `<span>${escapeHtml(c)}</span>`).join('')}</div>` : ''}
  </div>`;
}

export function buildCvHtml(cv: Cv): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(cv.name)} - CV</title>
<style>
  @page { margin: 14mm; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #1a2233; font-size: 11pt; line-height: 1.4; }
  header { background: #1f2c52; color: #fff; padding: 18px 20px; border-bottom: 4px solid #f2b84b; border-radius: 8px; }
  h1 { margin: 0; font-size: 22pt; }
  header .title { margin-top: 2px; opacity: .9; }
  header p { margin: 10px 0 0; opacity: .9; font-size: 10pt; }
  .contact { margin-top: 10px; font-size: 9pt; opacity: .9; }
  .contact span { margin-right: 14px; }
  .metrics { display: flex; gap: 10px; margin: 12px 0; }
  .metrics div { flex: 1; border: 1px solid #dde3ee; border-radius: 8px; padding: 8px; text-align: center; }
  .metrics b { display: block; font-size: 13pt; }
  .metrics small { color: #5b6577; }
  h2 { font-size: 12pt; margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 2px solid #3778d7; color: #1f2c52; }
  .item { margin: 8px 0; page-break-inside: avoid; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .tag { color: #3778d7; font-weight: 600; font-size: 9pt; white-space: nowrap; }
  .sub { color: #3b4a66; font-size: 10pt; }
  p { margin: 4px 0 0; font-size: 10pt; color: #3b4a66; }
  .chips span { display: inline-block; margin: 4px 4px 0 0; padding: 2px 8px; border: 1px solid #c6d0e3; border-radius: 10px; font-size: 9pt; }
</style></head>
<body>
  <header>
    <h1>${escapeHtml(cv.name)}</h1>
    ${cv.titleLine ? `<div class="title">${escapeHtml(cv.titleLine)}</div>` : ''}
    ${cv.summary ? `<p>${lines(cv.summary)}</p>` : ''}
    <div class="contact">${cv.contact.map((c) => `<span>${escapeHtml(c)}</span>`).join('')}</div>
  </header>
  <div class="metrics">${cv.metrics.map(([k, v]) => `<div><b>${escapeHtml(v)}</b><small>${escapeHtml(k)}</small></div>`).join('')}</div>
  ${cv.sections.map((s) => `<section><h2>${escapeHtml(s.title)}</h2>${s.items.map(item).join('')}</section>`).join('')}
</body></html>`;
}
