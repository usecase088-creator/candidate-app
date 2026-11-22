// The generated CV as plain data (website components/cv/CvDocument.tsx). The in-app preview and the PDF both draw
// from this, so they cannot disagree. Everything is read defensively: the profile is loose JSON from the server.
export type CvItem = {
  heading: string;
  sub?: string;
  /** Right-hand label: a period, a citation count, a year. */
  tag?: string;
  body?: string;
  chips?: string[];
  /** Key procedures of a job: the website draws them as dark chips after the details. */
  keyChips?: string[];
};
export type CvSection = {
  title: string;
  items: CvItem[];
  /** Website layout: the wide main column or the sidebar. */
  column: 'main' | 'side';
  /** Figures drawn as boxes above the items (publications: citations, h-index, i10-index). */
  stats?: [string, string][];
  /** Small lines under the items (Scholar, ORCID). */
  notes?: string[];
};
export type Cv = {
  name: string;
  titleLine: string;
  summary: string;
  contact: string[];
  /** The box on the right of the website header. */
  credentials: [string, string][];
  metrics: [string, string][];
  sections: CvSection[];
};

type Row = Record<string, unknown>;
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const rows = (v: unknown): Row[] =>
  Array.isArray(v) ? v.filter((x): x is Row => typeof x === 'object' && x !== null) : [];
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const join = (parts: unknown[], sep: string) => parts.map(text).filter(Boolean).join(sep);

function parseDate(val: unknown, isEnd = false): Date | null {
  const s = text(val);
  if (!s || /^(present|current)$/i.test(s)) return null;
  const m = s.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
  if (m) {
    const month = m[2] ? Number(m[2]) - 1 : isEnd ? 11 : 0;
    const day = m[3] ? Number(m[3]) : isEnd && !m[2] ? 31 : 1;
    const d = new Date(Number(m[1]), month, day);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value: unknown): string {
  const s = text(value);
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

const formatPeriod = (start: unknown, end: unknown, current: unknown) =>
  [formatDate(start), current ? 'Present' : formatDate(end)].filter(Boolean).join(' - ');

/** Website calculateExperienceYears: overlapping jobs are counted once, rounded to half a year. */
function experienceYears(experience: Row[]): number {
  const now = Date.now();
  const spans: [number, number][] = [];
  for (const e of experience) {
    const start = parseDate(e.start);
    if (!start) continue;
    const open = e.current || !text(e.end) || /^(present|current)$/i.test(text(e.end));
    const end = open ? now : (parseDate(e.end, true)?.getTime() ?? now);
    if (start.getTime() < end) spans.push([start.getTime(), end]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else merged.push([s[0], s[1]]);
  }
  const years = merged.reduce((t, [a, b]) => t + (b - a), 0) / (1000 * 60 * 60 * 24) / 365.25;
  return years <= 0.1 ? 0 : Math.round(years * 2) / 2;
}

const formatLPA = (min: number, max: number) =>
  min === 0 && max === 0 ? 'Unpaid / Stipend' : min === max ? `₹${min} LPA` : `₹${min}–${max} LPA`;

type Publication = { title: string; meta: string; doi: string; citations: number };

function publicationsOf(p: Row): Publication[] {
  const detailed = rows(p.publicationDetails)
    .filter((x) => text(x.title) || text(x.journal) || text(x.authors))
    .map((x) => ({
      title: text(x.title) || 'Untitled publication',
      meta: join([text(x.authors), join([x.journal, x.year], ' ')], ' · '),
      doi: text(x.doi),
      citations: num(x.citations),
    }));
  if (detailed.length > 0) return detailed;
  return strings(p.publications).map((title) => ({ title, meta: 'Publication', doi: '', citations: 0 }));
}

export function buildCv(profile: Row): Cv {
  const p = profile;
  const experience = rows(p.experience);
  const years = num(p.yearsExperience) > 0 ? num(p.yearsExperience) : experienceYears(experience);
  const publications = publicationsOf(p);
  const citations = text(p.totalCitations) || String(publications.reduce((t, x) => t + x.citations, 0) || '');
  const procedures = rows(p.procedures).filter((x) => text(x.name));
  const procedureVolume = procedures.reduce((t, x) => t + num(x.count), 0);
  const qualifications = rows(p.qualifications);
  const certifications = rows(p.certifications);
  const highlights = rows(p.professionalHighlights);
  const clinicalSkills = strings(p.clinicalSkills);
  const technicalSkills = strings(p.technicalSkills);
  const languages = strings(p.languages);
  const expMin = num(p.expectedSalaryMin);
  const expMax = num(p.expectedSalaryMax);
  const sections: CvSection[] = [];

  if (experience.length > 0) {
    sections.push({
      title: 'Clinical Experience',
      column: 'main',
      items: experience.map((e) => ({
        heading: text(e.role),
        sub: join([e.hospital, e.city], ' · '),
        tag: formatPeriod(e.start, e.end, e.current),
        body: text(e.summary) || undefined,
        chips: [e.specialty, e.hospitalType, e.department, e.patientLoad, e.rota].map(text).filter(Boolean),
        keyChips: strings(e.keyProcedures),
      })),
    });
  }
  if (publications.length > 0) {
    const notes = [
      text(p.scholarUrl) && `Scholar: ${text(p.scholarUrl)}`,
      text(p.orcid) && `ORCID: ${text(p.orcid)}`,
    ].filter((x): x is string => Boolean(x));
    sections.push({
      title: 'Publications & Citations',
      column: 'main',
      stats: [
        ['Total citations', citations || '0'],
        ['h-index', text(p.hIndex) || '—'],
        ['i10-index', text(p.i10Index) || '—'],
      ],
      notes: notes.length > 0 ? notes : undefined,
      items: publications.map((x) => ({
        heading: x.title,
        sub: x.meta,
        tag: `${x.citations} cites`,
        body: x.doi ? `DOI/PMID: ${x.doi}` : undefined,
      })),
    });
  }
  if (procedures.length > 0) {
    sections.push({
      title: 'Procedure Exposure',
      column: 'main',
      items: procedures.map((x) => ({ heading: text(x.name), tag: text(x.count) })),
    });
  }
  if (highlights.length > 0) {
    sections.push({
      title: 'Audit, Teaching & Leadership',
      column: 'main',
      items: highlights.map((h) => ({
        heading: text(h.title),
        sub: text(h.category),
        tag: text(h.year) || undefined,
        body: text(h.detail) || undefined,
      })),
    });
  }
  if (p.verified || text(p.registrationNumber) || text(p.registrationCouncil)) {
    sections.push({
      title: 'Registration',
      column: 'side',
      items: (
        [
          ['Number', text(p.registrationNumber)],
          ['Council', text(p.registrationCouncil)],
          ['Status', text(p.licenseStatus)],
          ['Renewal', formatDate(p.revalidationDate)],
          ['Indemnity', text(p.indemnityProvider)],
          ['Work status', text(p.rightToWork)],
        ] as const
      )
        .filter(([, v]) => v)
        .map(([k, v]) => ({ heading: k, tag: v })),
    });
  }
  if (qualifications.length > 0) {
    sections.push({
      title: 'Education',
      column: 'side',
      items: qualifications.map((q) => ({
        heading: text(q.degree),
        sub: text(q.institution),
        tag: text(q.year),
      })),
    });
  }
  if (clinicalSkills.length > 0) {
    sections.push({ title: 'Clinical Skills', column: 'side', items: [{ heading: '', chips: clinicalSkills }] });
  }
  if (certifications.length > 0) {
    sections.push({
      title: 'Certifications',
      column: 'side',
      items: certifications.map((c) => ({ heading: text(c.name), sub: text(c.issuer), tag: text(c.year) })),
    });
  }
  if (technicalSkills.length > 0) {
    sections.push({ title: 'Systems', column: 'side', items: [{ heading: '', chips: technicalSkills }] });
  }
  if (languages.length > 0) {
    sections.push({ title: 'Languages', column: 'side', items: [{ heading: '', chips: languages }] });
  }
  const preferred = strings(p.preferredRoleTypes);
  sections.push({
    title: 'Availability',
    column: 'side',
    // Website order: the availability, the expected salary, then the preferred role types.
    items: [
      { heading: text(p.availability) } as CvItem,
      ...(expMin > 0 || expMax > 0 ? [{ heading: `Expected: ${formatLPA(expMin, expMax)}` }] : []),
      ...(preferred.length > 0 ? [{ heading: '', chips: preferred }] : []),
    ].filter((i) => i.heading || i.chips),
  });

  return {
    name: text(p.name),
    titleLine: join([p.grade, text(p.specialty) || text(p.role)], ' · ') || text(p.headline),
    summary: text(p.summary),
    contact: [text(p.email), text(p.phone), text(p.state) || text(p.city)].filter(Boolean),
    credentials: (
      [
        ['Registration', text(p.registrationNumber)],
        ['Council', text(p.registrationCouncil)],
        ['License', text(p.licenseStatus)],
        ['Specialist', text(p.specialistRegisterStatus)],
      ] as [string, string][]
    ).filter(([, v]) => v),
    metrics: [
      ['Experience', `${years || 0}+ yrs`],
      ['Procedure volume', procedureVolume ? `${procedureVolume}+` : `${procedures.length}`],
      ['Publications', String(publications.length)],
      ['Citations', citations || '0'],
    ],
    sections,
  };
}
