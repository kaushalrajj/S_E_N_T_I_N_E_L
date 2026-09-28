import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/auth.js';
import { uploadBufferToCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

/**
 * Universal Cloudinary Upload Endpoint
 * POST /api/upload
 * Field name: 'file'
 */
router.post('/', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided in upload request' });
    }

    if (!isCloudinaryConfigured) {
      return res.status(400).json({
        error: 'Cloudinary is not configured on the server. Please provide CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY in server/.env'
      });
    }

    const folder = req.body.folder || `campus_portal/${req.user.role}s`;
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder,
      filename: req.file.originalname,
      resource_type: 'auto'
    });

    res.json({
      success: true,
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      resource_type: uploadResult.resource_type
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file to Cloudinary: ' + error.message });
  }
});

export default router;
