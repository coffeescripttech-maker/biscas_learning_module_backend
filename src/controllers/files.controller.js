const File = require('../models/File');
const storageService = require('../services/storage.service');
const logger = require('../utils/logger');

/**
 * Upload a file
 * POST /api/files/upload
 */
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No file provided'
        }
      });
    }

    const userId = req.user.userId;
    const folder = req.body.folder || 'temp';

    // Validate file
    const validation = storageService.validateFile(req.file, {
      allowedTypes: req.body.allowedTypes 
        ? req.body.allowedTypes.split(',') 
        : undefined,
      maxSize: req.body.maxSize ? parseInt(req.body.maxSize) : undefined
    });

    if (!validation.valid) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error
        }
      });
    }

    // Upload file to storage
    const uploadResult = await storageService.uploadFile(req.file, folder);

    // Create file record in database
    const file = await File.create({
      id: uploadResult.fileId,
      userId: userId,
      filename: uploadResult.fileId + require('path').extname(req.file.originalname),
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: uploadResult.path,
      folder: folder,
      url: uploadResult.url
    });

    logger.info('File uploaded successfully', {
      fileId: file.id,
      userId: userId,
      filename: file.originalName
    });

    res.status(201).json({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimetype: file.mimetype,
      size: file.size,
      url: file.url,
      folder: file.folder,
      createdAt: file.createdAt
    });
  } catch (error) {
    logger.error('File upload failed', {
      error: error.message,
      userId: req.user?.userId
    });

    res.status(500).json({
      error: {
        code: 'STORAGE_UPLOAD_FAILED',
        message: 'File upload failed',
        details: error.message
      }
    });
  }
};

/**
 * Get a file
 * GET /api/files/:id
 */
exports.getFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Find file record
    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).json({
        error: {
          code: 'STORAGE_FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    // Check permissions (user must own the file or be admin/teacher)
    if (file.userId !== userId && userRole !== 'admin' && userRole !== 'teacher') {
      return res.status(403).json({
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'You do not have permission to access this file'
        }
      });
    }

    // Get file from storage
    const fileBuffer = await storageService.getFile(file.path);

    // Set appropriate headers
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);

    res.send(fileBuffer);
  } catch (error) {
    logger.error('Failed to retrieve file', {
      error: error.message,
      fileId: req.params.id,
      userId: req.user?.userId
    });

    if (error.message === 'File not found') {
      return res.status(404).json({
        error: {
          code: 'STORAGE_FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve file',
        details: error.message
      }
    });
  }
};

/**
 * Download a file (force download instead of inline)
 * GET /api/files/:id/download
 */
exports.downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Find file record
    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).json({
        error: {
          code: 'STORAGE_FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    // Check permissions
    if (file.userId !== userId && userRole !== 'admin' && userRole !== 'teacher') {
      return res.status(403).json({
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'You do not have permission to download this file'
        }
      });
    }

    // Get file from storage
    const fileBuffer = await storageService.getFile(file.path);

    // Set headers for download
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);

    res.send(fileBuffer);
  } catch (error) {
    logger.error('Failed to download file', {
      error: error.message,
      fileId: req.params.id,
      userId: req.user?.userId
    });

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to download file',
        details: error.message
      }
    });
  }
};

/**
 * Delete a file
 * DELETE /api/files/:id
 */
exports.deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Find file record
    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).json({
        error: {
          code: 'STORAGE_FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    // Check permissions (user must own the file or be admin)
    if (file.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'You do not have permission to delete this file'
        }
      });
    }

    // Delete file from storage
    await storageService.deleteFile(file.path);

    // Delete file record from database
    await File.delete(fileId);

    logger.info('File deleted successfully', {
      fileId: fileId,
      userId: userId
    });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete file', {
      error: error.message,
      fileId: req.params.id,
      userId: req.user?.userId
    });

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete file',
        details: error.message
      }
    });
  }
};

/**
 * Get user's files
 * GET /api/files
 */
exports.getUserFiles = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0, folder } = req.query;

    let files;
    if (folder) {
      files = await File.findByFolder(folder, { 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      });
      // Filter by user
      files = files.filter(f => f.userId === userId);
    } else {
      files = await File.findByUserId(userId, { 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      });
    }

    // Get total storage used
    const totalStorage = await File.getTotalStorageByUser(userId);

    res.json({
      files: files.map(f => ({
        id: f.id,
        filename: f.filename,
        originalName: f.originalName,
        mimetype: f.mimetype,
        size: f.size,
        url: f.url,
        folder: f.folder,
        createdAt: f.createdAt
      })),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: files.length
      },
      totalStorage: totalStorage
    });
  } catch (error) {
    logger.error('Failed to get user files', {
      error: error.message,
      userId: req.user?.userId
    });

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve files',
        details: error.message
      }
    });
  }
};

/**
 * Get file metadata
 * GET /api/files/:id/metadata
 */
exports.getFileMetadata = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Find file record
    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).json({
        error: {
          code: 'STORAGE_FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    // Check permissions
    if (file.userId !== userId && userRole !== 'admin' && userRole !== 'teacher') {
      return res.status(403).json({
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'You do not have permission to access this file'
        }
      });
    }

    res.json({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimetype: file.mimetype,
      size: file.size,
      url: file.url,
      folder: file.folder,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    });
  } catch (error) {
    logger.error('Failed to get file metadata', {
      error: error.message,
      fileId: req.params.id,
      userId: req.user?.userId
    });

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve file metadata',
        details: error.message
      }
    });
  }
};
