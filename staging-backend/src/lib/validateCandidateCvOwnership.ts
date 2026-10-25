/** Cloudinary folder + public_id prefix for a candidate's CV uploads (see uploadRoutes POST /cv). */
export function candidateCvPublicIdPrefix(candidateId: string): string {
  return `candidates/cv/${candidateId}_`;
}

/**
 * Validates that cvUrl / cvCloudinaryId belong to the given candidate.
 * Legitimate uploads use folder `candidates/cv` and public_id `{candidateId}_{timestamp}`.
 */
export function validateCandidateOwnsCv(
  candidateId: string,
  cvUrl?: string | null,
  cvCloudinaryId?: string | null,
): { ok: true } | { ok: false; error: string } {
  const hasUrl = cvUrl != null && String(cvUrl).trim() !== '';
  const hasId = cvCloudinaryId != null && String(cvCloudinaryId).trim() !== '';

  if (!hasUrl && !hasId) {
    return { ok: true };
  }

  const prefix = candidateCvPublicIdPrefix(candidateId);

  if (hasId) {
    const id = String(cvCloudinaryId).trim();
    if (!id.startsWith(prefix)) {
      return { ok: false, error: 'CV does not belong to your account.' };
    }
  }

  if (hasUrl) {
    const url = String(cvUrl).trim();
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.cloudinary.com')) {
        return { ok: false, error: 'Invalid CV URL.' };
      }
      const path = decodeURIComponent(parsed.pathname);
      if (!path.includes(`/candidates/cv/${candidateId}_`)) {
        return { ok: false, error: 'CV does not belong to your account.' };
      }
    } catch {
      return { ok: false, error: 'Invalid CV URL.' };
    }
  }

  return { ok: true };
}
