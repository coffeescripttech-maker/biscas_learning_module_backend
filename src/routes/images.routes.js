const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const logger = require('../utils/logger');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

// Initialize R2 client using AWS SDK v2
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4'
});

/**
 * Upload image to R2 storage
 * POST /api/images/upload
 */
router.post('/upload', auth, upload.single('image'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No image file provided',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { moduleId, folder = 'module-images' } = req.body;
    
    logger.info('📤 [IMAGE UPLOAD] Starting upload', {
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / 1024 / 1024).toFixed(2)}MB`,
      mimeType: req.file.mimetype,
      moduleId: moduleId || 'unknown',
      userId: req.user.userId
    });

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = moduleId 
      ? `module-${moduleId}-image-${timestamp}-${sanitizedName}`
      : `image-${timestamp}-${sanitizedName}`;

    const key = `${folder}/${uniqueFileName}`;

    // Upload to R2
    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ContentLength: req.file.size,
      Metadata: {
        'uploaded-by': req.user.userId,
        'module-id': moduleId || 'unknown',
        'original-name': req.file.originalname
      }
    };

    const uploadResult = await s3.upload(uploadParams).promise();

    // Generate public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    const uploadTime = Date.now() - startTime;
    logger.info('✅ [IMAGE UPLOAD] Upload successful', {
      fileName: uniqueFileName,
      publicUrl: publicUrl,
      uploadTime: `${uploadTime}ms`,
      fileSize: `${(req.file.size / 1024 / 1024).toFixed(2)}MB`
    });

    res.json({
      success: true,
      data: {
        url: publicUrl,
        key: key,
        fileName: uniqueFileName,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadTime: uploadTime
      }
    });

  } catch (error) {
    const uploadTime = Date.now() - startTime;
    logger.error('❌ [IMAGE UPLOAD] Upload failed', {
      error: error.message,
      fileName: req.file?.originalname,
      uploadTime: `${uploadTime}ms`
    });

    // Handle specific multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 10MB limit',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    res.status(500).json({
      error: {
        code: 'UPLOAD_FAILED',
        message: 'Failed to upload image',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Upload multiple images to R2 storage
 * POST /api/images/upload-multiple
 */
router.post('/upload-multiple', auth, upload.array('images', 10), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_FILES',
          message: 'No image files provided',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { moduleId, folder = 'module-images' } = req.body;
    const uploadResults = [];
    const errors = [];

    logger.info('📤 [MULTIPLE IMAGE UPLOAD] Starting batch upload', {
      fileCount: req.files.length,
      moduleId: moduleId || 'unknown',
      userId: req.user.userId
    });

    // Upload each file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      try {
        // Generate unique filename
        const timestamp = Date.now() + i; // Add index to avoid collisions
        const fileExtension = file.originalname.split('.').pop() || 'jpg';
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = moduleId 
          ? `module-${moduleId}-image-${timestamp}-${sanitizedName}`
          : `image-${timestamp}-${sanitizedName}`;

        const key = `${folder}/${uniqueFileName}`;

        // Upload to R2
        const uploadParams = {
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
          Metadata: {
            'uploaded-by': req.user.userId,
            'module-id': moduleId || 'unknown',
            'original-name': file.originalname
          }
        };

        const uploadResult = await s3.upload(uploadParams).promise();

        // Generate public URL
        const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

        uploadResults.push({
          success: true,
          url: publicUrl,
          key: key,
          fileName: uniqueFileName,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        });

      } catch (uploadError) {
        logger.error('❌ [MULTIPLE IMAGE UPLOAD] Individual upload failed', {
          fileName: file.originalname,
          error: uploadError.message
        });

        errors.push({
          fileName: file.originalname,
          error: uploadError.message
        });

        uploadResults.push({
          success: false,
          originalName: file.originalname,
          error: uploadError.message
        });
      }
    }

    const uploadTime = Date.now() - startTime;
    const successCount = uploadResults.filter(r => r.success).length;

    logger.info('✅ [MULTIPLE IMAGE UPLOAD] Batch upload completed', {
      totalFiles: req.files.length,
      successCount: successCount,
      errorCount: errors.length,
      uploadTime: `${uploadTime}ms`
    });

    res.json({
      success: errors.length === 0,
      data: {
        results: uploadResults,
        summary: {
          total: req.files.length,
          successful: successCount,
          failed: errors.length,
          uploadTime: uploadTime
        }
      },
      ...(errors.length > 0 && { errors })
    });

  } catch (error) {
    const uploadTime = Date.now() - startTime;
    logger.error('❌ [MULTIPLE IMAGE UPLOAD] Batch upload failed', {
      error: error.message,
      uploadTime: `${uploadTime}ms`
    });

    res.status(500).json({
      error: {
        code: 'BATCH_UPLOAD_FAILED',
        message: 'Failed to upload images',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;