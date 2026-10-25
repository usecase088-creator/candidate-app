import logger from './logger';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary only if the env vars are present
const configured = !!process.env.CLOUDINARY_CLOUD_NAME;

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  logger.warn('WARNING: Cloudinary is not configured. Uploads will fail if attempted.');
}

/**
 * Upload a raw buffer to Cloudinary (used for PDFs, Docs)
 * @param buffer File buffer from multer
 * @param folder Cloudinary folder path
 * @param publicId Desired file ID (without extension)
 */
export async function uploadRawBuffer(
  buffer: Buffer,
  folder: string,
  publicId: string
): Promise<{ public_id: string; secure_url: string }> {
  if (!configured) throw new Error('Cloudinary is not configured');
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { 
        folder, 
        public_id: publicId, 
        resource_type: 'raw', 
        // Do NOT force a format — let Cloudinary preserve the original file extension
        // (previously had format: 'pdf' which corrupted DOCX uploads)
        use_filename: true 
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          public_id: result!.public_id,
          secure_url: result!.secure_url,
        });
      }
    ).end(buffer);
  });
}

/**
 * Upload an image buffer to Cloudinary (used for avatars/logos)
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  folder: string,
  publicId: string
): Promise<{ public_id: string; secure_url: string }> {
  if (!configured) throw new Error('Cloudinary is not configured');

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { 
        folder, 
        public_id: publicId, 
        resource_type: 'image',
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          public_id: result!.public_id,
          secure_url: result!.secure_url,
        });
      }
    ).end(buffer);
  });
}

export async function deleteCloudinaryAsset(publicId: string, resourceType = 'raw') {
  if (!configured) return;
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
