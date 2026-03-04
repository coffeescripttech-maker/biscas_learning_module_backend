const express = require('express');
const multer = require('multer');
const { verifyToken, requireRole } = require('../middleware/auth');
const filesController = require('../controllers/files.controller');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB default limit
  }
});

/**
 * @route   POST /api/files/upload
 * @desc    Upload a file
 * @access  Private (authenticated users)
 */
router.post(
  '/upload',
  verifyToken,
  upload.single('file'),
  filesController.uploadFile
);

/**
 * @route   GET /api/files
 * @desc    Get user's files
 * @access  Private (authenticated users)
 */
router.get(
  '/',
  verifyToken,
  filesController.getUserFiles
);

/**
 * @route   GET /api/files/:id
 * @desc    Get a file (view inline)
 * @access  Private (authenticated users)
 */
router.get(
  '/:id',
  verifyToken,
  filesController.getFile
);

/**
 * @route   GET /api/files/:id/download
 * @desc    Download a file
 * @access  Private (authenticated users)
 */
router.get(
  '/:id/download',
  verifyToken,
  filesController.downloadFile
);

/**
 * @route   GET /api/files/:id/metadata
 * @desc    Get file metadata
 * @access  Private (authenticated users)
 */
router.get(
  '/:id/metadata',
  verifyToken,
  filesController.getFileMetadata
);

/**
 * @route   DELETE /api/files/:id
 * @desc    Delete a file
 * @access  Private (file owner or admin)
 */
router.delete(
  '/:id',
  verifyToken,
  filesController.deleteFile
);

module.exports = router;
