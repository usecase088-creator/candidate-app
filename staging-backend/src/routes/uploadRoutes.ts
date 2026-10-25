import logger from '../lib/logger';
import { validateUploadMagicBytes } from '../lib/validateUploadMagicBytes';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { uploadRawBuffer, uploadImageBuffer, deleteCloudinaryAsset } from '../lib/cloudinary';

import { wrapMulter } from '../lib/multerErrors';

const router = Router();

// Store files in memory buffer so we can send straight to Cloudinary
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

function validateMime(mimetype: string) {
  if (!ALLOWED_MIMES.has(mimetype)) {
    throw new Error('Unsupported file format. Please upload a PDF, DOCX, JPG, or PNG.');
  }
}

// POST /api/upload/cv
// Candidate uploads their CV
router.post('/cv', requireAuth, requireRole('CANDIDATE'), upload.single('cv'), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No CV file provided' });
      return;
    }
    
    validateMime(file.mimetype);
    if (!(await validateUploadMagicBytes(file.buffer))) {
      res.status(400).json({ error: 'Invalid file type.' });
      return;
    }
    
    const candidateId = req.user!.candidateId;
    if (!candidateId) {
      res.status(400).json({ error: 'No candidate profile linked' });
      return;
    }

    const timestamp = Date.now();
    const publicId = `${candidateId}_${timestamp}`;
    
    // Upload to cloudinary folder `candidates/cv/`
    const result = await uploadRawBuffer(file.buffer, 'candidates/cv', publicId);

    // Immediately persist the Cloudinary URL + filename in the candidate record
    // so the filename is never lost even if the frontend doesn't do a separate profile save.
    try {
      const prisma = (await import('../lib/prisma')).default;
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          cvUrl: result.secure_url,
          cvCloudinaryId: result.public_id,
          uploadedCvName: file.originalname,
          uploadedCvMime: file.mimetype,
        },
      });
    } catch (dbErr: any) {
      // Non-fatal: the URL is still returned to the caller; they can still submit the application
      logger.warn('Could not persist CV metadata to candidate record after upload: %s', dbErr?.message);
    }

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      name: file.originalname,
      mime: file.mimetype
    });
  } catch (error: any) {
    logger.error('CV Upload error:', error);
    res.status(error.message?.startsWith('Unsupported file format') ? 400 : 500).json({ error: error.message || 'Failed to upload CV' });
  }
});


// DELETE /api/upload/cv/:publicId
// Used if the candidate uploads a new CV and wants to delete the old one from Cloudinary
router.delete('/cv/:publicId', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  try {
    // Only allow deletion if the publicId starts with candidate's folder & ID
    // (Basic security check so they can't delete other people's files)
    const publicId = req.params.publicId;
    
    // Since Cloudinary public_ids include the folder, we need to decode if it was URL encoded, 
    // or just pass it straight through if the frontend sends it accurately.
    const decodedPublicId = decodeURIComponent(publicId as string);

    if (!decodedPublicId.startsWith('candidates/cv/' + req.user!.candidateId)) {
      res.status(403).json({ error: 'Forbidden. You can only delete your own CVs.' });
      return;
    }

    await deleteCloudinaryAsset(decodedPublicId, 'raw');
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete CV error:', error);
    res.status(500).json({ error: 'Failed to delete old CV' });
  }
});

const ALLOWED_AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// POST /api/upload/avatar
// Candidate uploads their profile picture (< 5MB)
router.post('/avatar', requireAuth, requireRole('CANDIDATE'), wrapMulter(upload.single('avatar')), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Profile picture must be less than 5MB.' });
      return;
    }

    if (!ALLOWED_AVATAR_MIMES.has(file.mimetype)) {
      res.status(400).json({ error: 'Unsupported file format. Please upload a JPG, PNG, or WEBP image.' });
      return;
    }

    if (!(await validateUploadMagicBytes(file.buffer))) {
      res.status(400).json({ error: 'Invalid image file.' });
      return;
    }

    const candidateId = req.user!.candidateId;
    if (!candidateId) {
      res.status(400).json({ error: 'No candidate profile linked' });
      return;
    }

    const timestamp = Date.now();
    const publicId = `${candidateId}_avatar_${timestamp}`;

    // Upload to Cloudinary folder `candidates/avatars`
    const result = await uploadImageBuffer(file.buffer, 'candidates/avatars', publicId);

    const prisma = (await import('../lib/prisma')).default;
    const existing = await prisma.candidate.findUnique({ where: { id: candidateId } });

    // Remove old avatar asset from Cloudinary if existed
    if (existing?.avatarCloudinaryId) {
      try {
        await deleteCloudinaryAsset(existing.avatarCloudinaryId, 'image');
      } catch (cleanErr: any) {
        logger.warn('Could not remove previous avatar from Cloudinary: %s', cleanErr?.message);
      }
    }

    let updatedProfileJson = existing?.profileJson;
    if (updatedProfileJson && typeof updatedProfileJson === 'object') {
      updatedProfileJson = { ...(updatedProfileJson as any), avatarUrl: result.secure_url };
    }

    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        avatarUrl: result.secure_url,
        avatarCloudinaryId: result.public_id,
        ...(updatedProfileJson ? { profileJson: updatedProfileJson } : {}),
      },
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error: any) {
    logger.error('Avatar upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload profile picture' });
  }
});

// DELETE /api/upload/avatar
// Candidate removes their profile picture
router.delete('/avatar', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  try {
    const candidateId = req.user!.candidateId;
    if (!candidateId) {
      res.status(400).json({ error: 'No candidate profile linked' });
      return;
    }

    const prisma = (await import('../lib/prisma')).default;
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (candidate?.avatarCloudinaryId) {
      try {
        await deleteCloudinaryAsset(candidate.avatarCloudinaryId, 'image');
      } catch (cleanErr: any) {
        logger.warn('Could not remove avatar asset from Cloudinary: %s', cleanErr?.message);
      }
    }

    let updatedProfileJson = candidate?.profileJson;
    if (updatedProfileJson && typeof updatedProfileJson === 'object') {
      const p = { ...(updatedProfileJson as any) };
      delete p.avatarUrl;
      updatedProfileJson = p;
    }

    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        avatarUrl: null,
        avatarCloudinaryId: null,
        ...(updatedProfileJson ? { profileJson: updatedProfileJson } : {}),
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete Avatar error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove profile picture' });
  }
});

// POST /api/upload/documents
// Candidate uploads multiple supporting documents
router.post('/documents', requireAuth, requireRole('CANDIDATE'), upload.array('documents', 10), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No documents provided' });
      return;
    }
    
    for (const file of files) {
      validateMime(file.mimetype);
      if (!(await validateUploadMagicBytes(file.buffer))) {
        res.status(400).json({ error: 'Invalid file type.' });
        return;
      }
    }
    
    const candidateId = req.user!.candidateId;
    if (!candidateId) {
      res.status(400).json({ error: 'No candidate profile linked' });
      return;
    }

    const timestamp = Date.now();
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const publicId = `${candidateId}_doc_${timestamp}_${i}`;
      
      const result = await uploadRawBuffer(file.buffer, 'candidates/documents', publicId);
      
      results.push({
        url: result.secure_url,
        publicId: result.public_id,
        name: file.originalname,
        mime: file.mimetype
      });
    }

    res.json(results);
  } catch (error: any) {
    logger.error('Documents Upload error:', error);
    res.status(error.message?.startsWith('Unsupported file format') ? 400 : 500).json({ error: error.message || 'Failed to upload documents' });
  }
});

// POST /api/upload/document
// Recruiter uploads a hospital verification document for their own hospital
router.post('/document', requireAuth, requireRole('RECRUITER'), upload.single('document'), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No document file provided' });
      return;
    }
    
    validateMime(file.mimetype);
    if (!(await validateUploadMagicBytes(file.buffer))) {
      res.status(400).json({ error: 'Invalid file type.' });
      return;
    }

    const { hospitalId, type } = req.body;
    if (!hospitalId) {
      res.status(400).json({ error: 'hospitalId is required' });
      return;
    }
    if (!req.user!.hospitalId || String(hospitalId) !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden. You can only upload documents for your own hospital.' });
      return;
    }

    const docType = type || 'verification';
    const timestamp = Date.now();
    const publicId = `${hospitalId}_${docType}_${timestamp}`;
    
    const result = await uploadRawBuffer(file.buffer, 'hospitals/documents', publicId);

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      name: file.originalname,
      mime: file.mimetype
    });
  } catch (error: any) {
    logger.error('Document Upload error:', error);
    res.status(error.message?.startsWith('Unsupported file format') ? 400 : 500).json({ error: error.message || 'Failed to upload document' });
  }
});

const ALLOWED_LOGO_MIMES = new Set(['image/jpeg', 'image/png']);

// POST /api/upload/hospital-logo-temp
// Public route for hospital onboarding form (pre-auth)
router.post('/hospital-logo-temp', wrapMulter(upload.single('logo')), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No logo file provided' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Logo must be less than 5MB.' });
      return;
    }

    if (!ALLOWED_LOGO_MIMES.has(file.mimetype)) {
      res.status(400).json({ error: 'Unsupported file format. Please upload a JPG or PNG image.' });
      return;
    }

    if (!(await validateUploadMagicBytes(file.buffer))) {
      res.status(400).json({ error: 'Invalid image file.' });
      return;
    }

    const timestamp = Date.now();
    const publicId = `temp_logo_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;

    const result = await uploadImageBuffer(file.buffer, 'hospitals/logos/temp', publicId);

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error: any) {
    logger.error('Hospital temp logo upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload hospital logo' });
  }
});

// POST /api/upload/hospital-logo
// Recruiter uploads/updates their hospital logo
router.post('/hospital-logo', requireAuth, requireRole('RECRUITER'), wrapMulter(upload.single('logo')), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No logo file provided' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Logo must be less than 5MB.' });
      return;
    }

    if (!ALLOWED_LOGO_MIMES.has(file.mimetype)) {
      res.status(400).json({ error: 'Unsupported file format. Please upload a JPG or PNG image.' });
      return;
    }

    if (!(await validateUploadMagicBytes(file.buffer))) {
      res.status(400).json({ error: 'Invalid image file.' });
      return;
    }

    const hospitalId = req.user!.hospitalId;
    if (!hospitalId) {
      res.status(400).json({ error: 'No hospital linked to your account' });
      return;
    }

    const timestamp = Date.now();
    const publicId = `${hospitalId}_logo_${timestamp}`;

    const result = await uploadImageBuffer(file.buffer, 'hospitals/logos', publicId);

    const prisma = (await import('../lib/prisma')).default;
    const existing = await prisma.hospital.findUnique({ where: { id: hospitalId } });

    if (existing?.logoCloudinaryId) {
      try {
        await deleteCloudinaryAsset(existing.logoCloudinaryId, 'image');
      } catch (cleanErr: any) {
        logger.warn('Could not remove previous hospital logo from Cloudinary: %s', cleanErr?.message);
      }
    }

    await prisma.hospital.update({
      where: { id: hospitalId },
      data: {
        logoUrl: result.secure_url,
        logoCloudinaryId: result.public_id,
      },
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error: any) {
    logger.error('Hospital logo upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload hospital logo' });
  }
});

// DELETE /api/upload/hospital-logo
// Recruiter removes their hospital logo
router.delete('/hospital-logo', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user!.hospitalId;
    if (!hospitalId) {
      res.status(400).json({ error: 'No hospital linked to your account' });
      return;
    }

    const prisma = (await import('../lib/prisma')).default;
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (hospital?.logoCloudinaryId) {
      try {
        await deleteCloudinaryAsset(hospital.logoCloudinaryId, 'image');
      } catch (cleanErr: any) {
        logger.warn('Could not remove logo asset from Cloudinary: %s', cleanErr?.message);
      }
    }

    await prisma.hospital.update({
      where: { id: hospitalId },
      data: {
        logoUrl: null,
        logoCloudinaryId: null,
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete hospital logo error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove hospital logo' });
  }
});

export default router;
