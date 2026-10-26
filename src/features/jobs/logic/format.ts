// Display text for jobs. Same output as the website (../job/candidates/src/lib/format.ts, routes/jobs.$jobId.tsx).

type Num = number | null | undefined;

export function formatLPA(min: number, max: number): string {
  if (min === 0 && max === 0) return 'Unpaid / Stipend';
  if (min === max) return `₹${min} LPA`;
  return `₹${min}–${max} LPA`;
}

/** The website prints NaN when the backend has no numbers; the app prints a dash. */
export function formatExp(min: Num, max: Num): string {
  if (min == null || max == null) return '—';
  if (min === max) return `${min} yr`;
  return `${min}–${max} yrs`;
}

/** "Today" / "3d ago"; `sentence` is the details header form: "today" / "3d ago" after "Posted". */
export function postedLabel(days: number, opts?: { sentence?: boolean }): string {
  if (days === 0) return opts?.sentence ? 'today' : 'Today';
  return `${days}d ago`;
}

/** Job details "Experience" stat: numbers when either is above 0, else the free text, else a dash. */
export function experienceStat(job: {
  experienceMin?: Num;
  experienceMax?: Num;
  experience?: string | null;
}): string {
  const { experienceMin: min, experienceMax: max } = job;
  if (min != null && max != null && (min > 0 || max > 0)) return formatExp(min, max);
  return job.experience || '—';
}

export function applicantsLine(applicants: Num): string | null {
  if (!applicants || applicants <= 0) return null;
  return `🧑‍⚕️ ${applicants} ${applicants === 1 ? 'person has' : 'people have'} already applied`;
}

/** Website lib/renderHtml.ts. */
export function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&amp;': '&',
};

/**
 * Job descriptions can be HTML (the recruiter's editor). The app shows them as plain text with paragraphs and bullet
 * points instead of a WebView: tags are dropped, scripts and styles removed, so nothing from the description can run.
 */
export function htmlToText(html: string): string {
  if (!isHtml(html)) return html;
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6])>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(ul|ol)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(nbsp|lt|gt|quot|#39|amp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
