// The CV as a printable A4 page for expo-print, laid out like the website's CvDocument (components/cv/CvDocument.tsx),
// which the website prints for "Download PDF": a navy gradient header with the "Doctor CV" badge and a credentials box,
// a strip of four figures, then a wide main column and a sidebar. Every value is escaped: names and summaries are typed
// by users. Colours are the website's (oklch converted to hex), as in src/theme/tokens.ts.
import type { Cv, CvItem, CvSection } from './cvModel';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

const lines = (s: string) => escapeHtml(s).replace(/\n/g, '<br/>');

function chips(list: string[] | undefined, cls: string): string {
  if (!list || list.length === 0) return '';
  return `<div class="chips">${list.map((c) => `<span class="${cls}">${escapeHtml(c)}</span>`).join('')}</div>`;
}

/** Main-column entry: a card; experience gets the brand bar on the left and its key procedures as dark chips. */
function mainItem(i: CvItem, s: CvSection): string {
  const bar = s.title === 'Clinical Experience' ? ' bar' : '';
  const head = `${i.heading ? `<div class="h">${escapeHtml(i.heading)}</div>` : ''}${
    i.sub ? `<div class="sub">${escapeHtml(i.sub)}</div>` : ''
  }`;
  return `<article class="card${bar}">
    <div class="row"><div>${head}</div>${i.tag ? `<span class="pill">${escapeHtml(i.tag)}</span>` : ''}</div>
    ${chips(i.chips, 'chip')}
    ${i.body ? `<p>${lines(i.body)}</p>` : ''}
    ${chips(i.keyChips, 'key')}
  </article>`;
}

/** Sidebar entry: label/value rows for Registration, plain lines for Availability, small boxes for the rest. */
function sideItem(i: CvItem, s: CvSection): string {
  if (s.title === 'Registration') {
    return `<div class="kv"><span>${escapeHtml(i.heading)}</span><b>${escapeHtml(i.tag ?? '')}</b></div>`;
  }
  if (!i.heading && !i.sub && !i.tag) return chips(i.chips, s.title === 'Clinical Skills' ? 'soft' : 'chip');
  if (s.title === 'Availability') return `<div class="line">${escapeHtml(i.heading)}</div>`;
  return `<div class="box">${i.heading ? `<div class="h small">${escapeHtml(i.heading)}</div>` : ''}${
    i.sub ? `<div class="meta">${escapeHtml(i.sub)}</div>` : ''
  }${i.tag ? `<div class="meta">${escapeHtml(i.tag)}</div>` : ''}${chips(i.chips, 'chip')}</div>`;
}

function sectionBody(s: CvSection): string {
  if (s.title === 'Registration') return `<div class="box">${s.items.map((i) => sideItem(i, s)).join('')}</div>`;
  if (s.title === 'Procedure Exposure') {
    const rows = s.items.map(
      (i) => `<div class="proc"><span>${escapeHtml(i.heading)}</span><b>${escapeHtml(i.tag ?? '')}</b></div>`,
    );
    return `<div class="grid2">${rows.join('')}</div>`;
  }
  return s.items.map((i) => (s.column === 'main' ? mainItem(i, s) : sideItem(i, s))).join('');
}

function section(s: CvSection): string {
  const stats = s.stats
    ? `<div class="stats">${s.stats
        .map(([k, v]) => `<div><small>${escapeHtml(k)}</small><b>${escapeHtml(v)}</b></div>`)
        .join('')}</div>`
    : '';
  const notes = s.notes ? `<div class="notes">${s.notes.map((n) => `<span>${escapeHtml(n)}</span>`).join('')}</div>` : '';
  return `<section>
    <h3>${escapeHtml(s.title)}</h3>
    ${stats}${sectionBody(s)}${notes}
  </section>`;
}

const STYLE = `
  @page { margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: Inter, -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #0A121F; font-size: 10pt; line-height: 1.45; }
  .doc { border: 1px solid #D4DAE1; border-radius: 16px; overflow: hidden; }
  header { position: relative; background: linear-gradient(135deg, #0A1328, #152B4E 55%, #326AD9); color: #F7FBFD; padding: 22px 24px 24px; display: flex; justify-content: space-between; gap: 18px; }
  header::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: #DEA143; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); font-size: 8pt; font-weight: 500; }
  h1 { margin: 12px 0 0; font-size: 22pt; font-weight: 600; letter-spacing: -0.01em; }
  .title { margin-top: 2px; font-size: 10pt; opacity: .9; }
  .summary { margin: 10px 0 0; font-size: 9.5pt; opacity: .85; }
  .contact { margin-top: 12px; font-size: 8.5pt; opacity: .9; }
  .contact span { margin-right: 16px; }
  .creds { min-width: 170px; align-self: flex-start; padding: 10px 12px; border-radius: 14px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); font-size: 8.5pt; }
  .creds div { display: flex; justify-content: space-between; gap: 12px; margin: 3px 0; }
  .creds span { opacity: .7; }
  .metrics { display: flex; background: #F2F8FC; border-bottom: 1px solid #D4DAE1; padding: 6px 12px; }
  .metrics div { flex: 1; padding: 6px 12px; border-right: 1px solid #D4DAE1; }
  .metrics div:last-child { border-right: 0; }
  small { display: block; font-size: 7pt; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #596475; }
  .metrics b { display: block; margin-top: 2px; font-size: 14pt; font-weight: 600; }
  .cols { display: flex; gap: 18px; padding: 18px 20px; }
  .main { flex: 1.4; min-width: 0; }
  .side { flex: 0.6; min-width: 0; border-left: 1px solid #D4DAE1; padding-left: 16px; }
  section { margin-bottom: 16px; }
  h3 { margin: 0 0 8px; padding-bottom: 4px; border-bottom: 1px solid #E1F0FF; font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: .12em; color: #0D172F; }
  .card { position: relative; border: 1px solid #D4DAE1; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; page-break-inside: avoid; }
  .card.bar { padding-left: 18px; }
  .card.bar::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #326AD9; }
  .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .h { font-size: 10.5pt; font-weight: 600; }
  .h.small { font-size: 9pt; }
  .sub { margin-top: 1px; font-size: 9pt; font-weight: 500; color: #0D172F; }
  .meta { font-size: 8pt; color: #596475; }
  .pill { white-space: nowrap; padding: 2px 9px; border-radius: 999px; background: #E1F0FF; color: #0D172F; font-size: 8pt; font-weight: 600; }
  p { margin: 6px 0 0; font-size: 9pt; color: #3B4558; }
  .chips { margin-top: 6px; }
  .chips span { display: inline-block; margin: 0 4px 4px 0; padding: 2px 8px; border-radius: 999px; font-size: 7.5pt; }
  .chip { border: 1px solid #D4DAE1; background: #F2F8FC; color: #3B4558; }
  .soft { background: #E1F0FF; color: #0D172F; font-weight: 600; }
  .key { background: #0D172F; color: #F7FBFD; font-weight: 500; }
  .stats { display: flex; gap: 8px; margin-bottom: 8px; }
  .stats div { flex: 1; border: 1px solid #D4DAE1; background: #F2F8FC; border-radius: 10px; padding: 7px 10px; }
  .stats b { display: block; margin-top: 2px; font-size: 12pt; font-weight: 600; color: #326AD9; }
  .notes { font-size: 7.5pt; color: #596475; }
  .notes span { margin-right: 10px; }
  .grid2 { display: flex; flex-wrap: wrap; gap: 6px; }
  .proc { width: calc(50% - 3px); display: flex; justify-content: space-between; border: 1px solid #D4DAE1; background: #F2F8FC; border-radius: 8px; padding: 5px 9px; font-size: 8.5pt; }
  .proc b { color: #326AD9; }
  .box { border: 1px solid #D4DAE1; border-radius: 8px; padding: 6px 9px; margin-bottom: 6px; page-break-inside: avoid; }
  .kv { display: flex; justify-content: space-between; gap: 10px; margin: 2px 0; font-size: 8pt; }
  .kv span { color: #596475; }
  .kv b { text-align: right; font-weight: 500; }
  .line { font-size: 8.5pt; font-weight: 500; margin-bottom: 3px; }
`;

export function buildCvHtml(cv: Cv): string {
  const main = cv.sections.filter((s) => s.column === 'main');
  const side = cv.sections.filter((s) => s.column === 'side');
  const creds =
    cv.credentials.length > 0
      ? `<div class="creds">${cv.credentials
          .map(([k, v]) => `<div><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`)
          .join('')}</div>`
      : '';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(cv.name)} - CV</title>
<style>${STYLE}</style></head>
<body><div class="doc">
  <header>
    <div>
      <span class="badge">Doctor CV</span>
      <h1>${escapeHtml(cv.name)}</h1>
      ${cv.titleLine ? `<div class="title">${escapeHtml(cv.titleLine)}</div>` : ''}
      ${cv.summary ? `<div class="summary">${lines(cv.summary)}</div>` : ''}
      <div class="contact">${cv.contact.map((c) => `<span>${escapeHtml(c)}</span>`).join('')}</div>
    </div>
    ${creds}
  </header>
  <div class="metrics">${cv.metrics
    .map(([k, v]) => `<div><small>${escapeHtml(k)}</small><b>${escapeHtml(v)}</b></div>`)
    .join('')}</div>
  <div class="cols">
    <div class="main">${main.map(section).join('')}</div>
    <div class="side">${side.map(section).join('')}</div>
  </div>
</div></body></html>`;
}
