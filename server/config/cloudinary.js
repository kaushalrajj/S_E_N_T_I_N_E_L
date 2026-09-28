import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Check if credentials are validly configured
const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();

const isPlaceholder = (val) => !val || val.includes('your_') || val.includes('<') || val === 'undefined';

export const isCloudinaryConfigured = Boolean(
  (cloudinaryUrl && !isPlaceholder(cloudinaryUrl)) ||
  (cloudName && apiKey && apiSecret && !isPlaceholder(cloudName) && !isPlaceholder(apiKey) && !isPlaceholder(apiSecret))
);

// Initialize Cloudinary
if (cloudinaryUrl && !isPlaceholder(cloudinaryUrl)) {
  cloudinary.config({
    cloudinary_url: cloudinaryUrl
  });
} else if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
}

/**
 * Upload an in-memory buffer directly to Cloudinary
 * No files are written to local disk.
 *
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - Cloudinary upload options (folder, resource_type, filename, etc.)
 * @returns {Promise<Object>} Cloudinary upload response containing secure_url, public_id, etc.
 */
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured) {
      return reject(new Error(
        'Cloudinary is not fully configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
      ));
    }

    const {
      folder = 'campus_portal',
      resource_type = 'auto',
      filename = '',
      tags = ['campus_portal'],
      ...restOptions
    } = options;

    // Clean public_id from filename if provided
    let publicId = undefined;
    if (filename) {
      const sanitizedName = filename
        .replace(/\.[^/.]+$/, '') // remove extension
        .replace(/[^a-zA-Z0-9_-]/g, '_'); // sanitize
      publicId = `${Date.now()}_${sanitizedName}`;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type,
        public_id: publicId,
        tags,
        ...restOptions
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary by public ID
 *
 * @param {string} publicId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export const deleteFromCloudinary = async (publicId, options = {}) => {
  if (!isCloudinaryConfigured || !publicId) return null;
  const { resource_type = 'image' } = options;
  return cloudinary.uploader.destroy(publicId, { resource_type });
};

export default cloudinary;
