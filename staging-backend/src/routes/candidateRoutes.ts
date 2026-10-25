import logger from '../lib/logger';
import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { formatCandidate, formatLockedCandidate, ensureUsageReset, getSearchLimit, syncFormProfile } from '../lib/helpers';
import { DEFAULT_PLAN_TIER } from '../config/plans';
import { validateCandidateOwnsCv } from '../lib/validateCandidateCvOwnership';

const router = Router();

// Doctor-level degrees used to classify Premium candidates
const DOCTOR_DEGREES = ['MBBS', 'MD', 'DM', 'DNB', 'MS', 'MCh', 'DrNB'];

// Helper function to check if query matches key fields exactly as a whole word
export function isExactMatch(candidate: any, query: string): boolean {
  if (!query) return true;
  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const name = candidate.name || '';
  const role = candidate.role || '';
  const specialty = candidate.specialty || '';

  const degrees: string[] = [];
  if (candidate.education) {
    let eduList: any[] = [];
    if (typeof candidate.education === 'string') {
      try {
        eduList = JSON.parse(candidate.education);
      } catch {}
    } else if (Array.isArray(candidate.education)) {
      eduList = candidate.education;
    }
    for (const edu of eduList) {
      if (edu && typeof edu === 'object' && edu.degree) {
        degrees.push(edu.degree);
      } else if (typeof edu === 'string') {
        degrees.push(edu);
      }
    }
  }

  let skillsList: string[] = [];
  if (candidate.skills) {
    if (typeof candidate.skills === 'string') {
      try {
        skillsList = JSON.parse(candidate.skills);
      } catch {}
    } else if (Array.isArray(candidate.skills)) {
      skillsList = candidate.skills;
    }
  }

  const textToSearch = [
    name,
    role,
    specialty,
    ...degrees,
    ...skillsList
  ].join(' ');

  return terms.every((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(textToSearch);
  });
}

// ─── GET /api/candidates/search ───────────────────────────────────────────────
// Query params:
//   q       – free text (name / role / specialty / skills / education)
//   role    – exact role filter (optional)
//   type    – "basic" (non-doctors) | "premium" (doctors) | omitted = all
//   degrees – comma-separated degree list for premium filter
//   take    – page size (default 50, max 100)
//   skip    – offset for pagination
router.get('/search', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  try {
    const q        = (req.query.q as string | undefined)?.trim() || '';
    const roleFilter = (req.query.role as string | undefined)?.trim();
    const type     = (req.query.type as string | undefined) || 'all';
    const degrees  = (req.query.degrees as string | undefined)
      ? (req.query.degrees as string).split(',').map(d => d.trim().toUpperCase()).filter(Boolean)
      : DOCTOR_DEGREES;
    const take     = Math.min(100, Math.max(1, parseInt(req.query.take as string) || 50));
    const skip     = Math.max(0, parseInt(req.query.skip as string) || 0);

    const specialtyFilter = (req.query.specialty as string | undefined)?.trim();
    const experienceMin = parseInt(req.query.experienceMin as string);
    const experienceMax = parseInt(req.query.experienceMax as string);
    const locationFilter = (req.query.location as string | undefined)?.trim();
    const currentOrg = (req.query.currentOrg as string | undefined)?.trim();
    const expectedSalaryMin = parseInt(req.query.expectedSalaryMin as string);
    const expectedSalaryMax = parseInt(req.query.expectedSalaryMax as string);
    const noticePeriod = (req.query.noticePeriod as string | undefined)
      ? (req.query.noticePeriod as string).split(',').map(d => d.trim()).filter(Boolean)
      : undefined;
    const currentSalaryMin = parseInt(req.query.currentSalaryMin as string);
    const currentSalaryMax = parseInt(req.query.currentSalaryMax as string);
    const preferredLocation = (req.query.preferredLocation as string | undefined)?.trim();
    const availabilityStatus = (req.query.availabilityStatus as string | undefined)
      ? (req.query.availabilityStatus as string).split(',').map(d => d.trim()).filter(Boolean)
      : undefined;

    // Build the WHERE clause using Prisma's typed API where possible,
    // falling back to $queryRaw for JSON-column text search on PostgreSQL.
    // Strategy: fetch with scalar filters first, then post-filter in JS for JSON fields
    // (avoids complex raw SQL while keeping things readable).

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { hospital: true } });
    if (!user || !user.hospital) {
      res.status(400).json({ error: 'No hospital linked to your account' });
      return;
    }

    if (type === 'premium') {
      const limit = getSearchLimit(user.hospital.onboardingPlan || DEFAULT_PLAN_TIER);

      if (skip === 0) {
        const allowed = await prisma.$transaction(async (tx) => {
          const txUser = await tx.user.findUnique({ where: { id: req.user!.id }, include: { hospital: true } });
          const updatedUser = await ensureUsageReset(tx, txUser);
          const incrementResult = await tx.user.updateMany({
            where: {
              id: updatedUser.id,
              premiumSearchesThisMonth: { lt: limit },
            },
            data: { premiumSearchesThisMonth: { increment: 1 } },
          });
          return incrementResult.count > 0;
        });
        if (!allowed) {
          res.status(403).json({
            error: `You have reached your limit of ${limit} premium searches this month.`,
            code: 'PLAN_QUOTA_EXCEEDED',
          });
          return;
        }
      } else {
        const updatedUser = await ensureUsageReset(prisma, user);
        if (updatedUser.premiumSearchesThisMonth >= limit) {
          res.status(403).json({
            error: `You have reached your limit of ${limit} premium searches this month.`,
            code: 'PLAN_QUOTA_EXCEEDED',
          });
          return;
        }
      }
    } else {
      await ensureUsageReset(prisma, user);
    }

    // Create a search log entry for pull-to-job token tracking
    const searchLog = await prisma.searchLog.create({
      data: { userId: req.user!.id },
    });
    const searchToken = searchLog.id;

    // Scalar filter conditions
    const scalarWhere: any = {
      isSuspended: false,
      deletedAt: null
    };

    if (roleFilter && roleFilter !== 'All') {
      scalarWhere.role = { equals: roleFilter, mode: 'insensitive' as const };
    }
    
    if (specialtyFilter) {
      scalarWhere.specialty = { contains: specialtyFilter, mode: 'insensitive' as const };
    }
    if (!isNaN(experienceMin) || !isNaN(experienceMax)) {
      scalarWhere.experienceYears = {};
      if (!isNaN(experienceMin)) scalarWhere.experienceYears.gte = experienceMin;
      if (!isNaN(experienceMax)) scalarWhere.experienceYears.lte = experienceMax;
    }
    if (locationFilter) {
      scalarWhere.location = { contains: locationFilter, mode: 'insensitive' as const };
    }
    if (currentOrg) {
      scalarWhere.currentEmployer = { contains: currentOrg, mode: 'insensitive' as const };
    }
    if (!isNaN(expectedSalaryMin)) {
      scalarWhere.expectedSalaryMax = { gte: expectedSalaryMin };
    }
    if (!isNaN(expectedSalaryMax)) {
      scalarWhere.expectedSalaryMin = { lte: expectedSalaryMax };
    }
    if (noticePeriod && noticePeriod.length > 0) {
      scalarWhere.noticePeriod = { in: noticePeriod };
    }
    if (!isNaN(currentSalaryMin)) {
      scalarWhere.currentSalaryMax = { gte: currentSalaryMin };
    }
    if (!isNaN(currentSalaryMax)) {
      scalarWhere.currentSalaryMin = { lte: currentSalaryMax };
    }
    if (availabilityStatus && availabilityStatus.length > 0) {
      scalarWhere.availabilityStatus = { in: availabilityStatus };
    }

    const andConditions: any[] = [];
    const andConditionsWithoutQ: any[] = [];

    if (q) {
      const searchTerms = q.split(' ').filter(Boolean);
      for (const term of searchTerms) {
        andConditions.push({
          searchBlob: { contains: term, mode: 'insensitive' }
        });
      }
    }

    if (preferredLocation) {
      const cond = {
        searchBlob: { contains: preferredLocation, mode: 'insensitive' }
      };
      andConditions.push(cond);
      andConditionsWithoutQ.push(cond);
    }

    const scalarWhereWithoutQ = { ...scalarWhere };

    if (andConditions.length > 0) {
      scalarWhere.AND = andConditions;
    }
    if (andConditionsWithoutQ.length > 0) {
      scalarWhereWithoutQ.AND = andConditionsWithoutQ;
    }

    // Determine premium constraint (must contain at least one doctor degree)
    const doctorDegreeConditions = degrees.map(degree => ({
      searchBlob: { contains: degree, mode: 'insensitive' }
    }));

    if (type === 'basic') {
      scalarWhere.NOT = { OR: doctorDegreeConditions };
    } else {
      scalarWhere.OR = doctorDegreeConditions;
      scalarWhereWithoutQ.OR = doctorDegreeConditions;
    }

    if (type === 'premium' && q) {
      // Execute Query A (exact candidate search with contains q) and Query B (recommendations without q)
      const [candidatesWithQuery, recommendedRaw] = await prisma.$transaction([
        prisma.candidate.findMany({
          where: scalarWhere,
          orderBy: [
            { matchPercent: 'desc' },
            { name: 'asc' },
          ],
          take: Math.max(100, take * 2),
        }),
        prisma.candidate.findMany({
          where: scalarWhereWithoutQ,
          orderBy: [
            { matchPercent: 'desc' },
            { name: 'asc' },
          ],
          take: Math.max(100, take * 2),
        })
      ]);

      const exactMatches = candidatesWithQuery.filter(c => isExactMatch(c, q));
      const exactIds = new Set(exactMatches.map(c => c.id));
      const recommendedCandidates = recommendedRaw.filter(c => !exactIds.has(c.id));

      const paginatedExact = exactMatches.slice(skip, skip + take);
      const paginatedRecs = recommendedCandidates.slice(skip, skip + take);

      res.json({
        candidates: paginatedExact.map((candidate) => formatCandidate(candidate, { redactContact: true })),
        recommendedCandidates: paginatedRecs.map((candidate) => formatCandidate(candidate, { redactContact: true })),
        total: exactMatches.length,
        take,
        skip,
        searchToken,
      });
    } else {
      // Execute paginated search securely within the database
      const [candidates, total] = await prisma.$transaction([
        prisma.candidate.findMany({
          where: scalarWhere,
          orderBy: [
            { matchPercent: 'desc' },
            { name: 'asc' },
          ],
          take,
          skip,
        }),
        prisma.candidate.count({ where: scalarWhere })
      ]);

      if (type === 'basic') {
        // Fetch top 5 premium candidates for the locked teaser
        const premiumWhere = { ...scalarWhere };
        delete premiumWhere.NOT;
        premiumWhere.OR = doctorDegreeConditions;
        
        const lockedCandidatesRaw = await prisma.candidate.findMany({
          where: premiumWhere,
          orderBy: [{ matchPercent: 'desc' }, { name: 'asc' }],
          take: 5
        });
        const lockedCandidates = lockedCandidatesRaw.map(formatLockedCandidate);
        
        res.json({
          candidates: candidates.map((candidate) => formatCandidate(candidate, { redactContact: true })),
          lockedCandidates,
          total,
          take,
          skip,
          searchToken,
        });
      } else {
        res.json({
          candidates: candidates.map((candidate) => formatCandidate(candidate, { redactContact: true })),
          total,
          take,
          skip,
          searchToken,
        });
      }
    }
  } catch (error) {
    logger.error('[candidate search]', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/candidates
router.get('/', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { hospital: true } });
    if (!user || !user.hospital) {
      res.status(400).json({ error: 'No hospital linked to your account' });
      return;
    }
    
    if (user.hospital.onboardingPlan === DEFAULT_PLAN_TIER) {
      res.status(403).json({ error: 'Upgrade to Pro or Premium to browse all candidates.', code: 'PLAN_UPGRADE_REQUIRED' });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const where = {
      isSuspended: false,
      deletedAt: null
    };

    const [candidates, total] = await prisma.$transaction([
      prisma.candidate.findMany({
        where,
        orderBy: { matchPercent: 'desc' },
        take: limit,
        skip,
      }),
      prisma.candidate.count({ where })
    ]);

    res.json({
      candidates: candidates.map((candidate) => formatCandidate(candidate, { redactContact: true })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/candidates/me
router.get('/me', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  try {
    const candidateId = req.user!.candidateId;
    if (!candidateId) {
      res.status(404).json({ error: 'No candidate profile linked to your account' });
      return;
    }
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { applications: true },
    });
    if (!candidate) {
      res.status(404).json({ error: 'Candidate profile not found' });
      return;
    }
    res.json(formatCandidate(candidate));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/candidates/me
router.put('/me', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  try {
    const candidateId = req.user!.candidateId;
    if (!candidateId) {
      res.status(400).json({ error: 'No candidate profile linked to your account' });
      return;
    }
    
    const { profile, profileJson, cvUrl, cvCloudinaryId, cvName, cvMime, supportingDocuments, ...rest } = req.body;

    if (cvUrl || cvCloudinaryId) {
      const cvCheck = validateCandidateOwnsCv(candidateId, cvUrl, cvCloudinaryId);
      if (!cvCheck.ok) {
        res.status(400).json({ error: cvCheck.error });
        return;
      }
    }

    // If the frontend form sent `profile`, sync it fully
    if (profile) {
      await syncFormProfile(
        candidateId, 
        profile, 
        req.user!.email, 
        {
          cvUrl,
          cvCloudinaryId,
          name: cvName,
          mime: cvMime,
        },
        supportingDocuments
      );
      const fullyUpdated = await prisma.candidate.findUnique({ where: { id: candidateId } });
      res.json(formatCandidate(fullyUpdated));
      return;
    }

    // Fallback direct update
    const data: any = { ...rest };
    if (profileJson !== undefined) {
      data.profileJson = profileJson;
    }
    if (cvUrl) data.cvUrl = String(cvUrl);
    if (cvCloudinaryId) data.cvCloudinaryId = String(cvCloudinaryId);
    
    // Clean up empty fields
    Object.keys(data).forEach(k => {
      if (data[k] === undefined) delete data[k];
    });

    const existingCandidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    const mergedForBlob = { ...existingCandidate, ...data };
    const { buildSearchBlob } = require('../lib/helpers');
    data.searchBlob = buildSearchBlob(mergedForBlob);

    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data,
    });
    res.json(formatCandidate(updated));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update candidate profile' });
  }
});

export default router;
