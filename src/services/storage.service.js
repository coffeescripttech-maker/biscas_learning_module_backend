const fs = require('fs').promises;
const path = require('path');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local';
    this.localStoragePath = process.env.STORAGE_PATH || './uploads';
    
    // Initialize S3 if using cloud storage
    if (this.storageType === 's3') {
      this.s3 = new AWS.S3({
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      });
      this.bucket = process.env.AWS_S3_BUCKET;
    }
    
    // Ensure local storage directory exists
    if (this.storageType === 'local') {
      this.ensureLocalStorageExists();
    }
  }

  async ensureLocalStorageExists() {
    try {
      await fs.mkdir(this.localStoragePath, { recursive: true });
      await fs.mkdir(path.join(this.localStoragePath, 'modules'), { recursive: true });
      await fs.mkdir(path.join(this.localStoragePath, 'profiles'), { recursive: true });
      await fs.mkdir(path.join(this.localStoragePath, 'temp'), { recursive: true });
    } catch (error) {
      logger.error('Failed to create local storage directories', { error: error.message });
    }
  }

  /**
   * Validate file type and size
   * @param {Object} file - Multer file object
   * @param {Object} options - Validation options
   * @returns {Object} - { valid: boolean, error: string }
   */
  validateFile(file, options = {}) {
    const {
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
      maxSize = 10 * 1024 * 1024 // 10MB default
    } = options;

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
      };
    }

    return { valid: true };
  }

  /**
   * Upload file to storage
   * @param {Object} file - Multer file object
   * @param {string} folder - Folder path (e.g., 'modules', 'profiles')
   * @returns {Promise<Object>} - { fileId, url, path }
   */
  async uploadFile(file, folder = 'temp') {
    if (this.storageType === 's3') {
      return this.uploadToS3(file, folder);
    }
    return this.uploadToLocal(file, folder);
  }

  /**
   * Upload file to local storage
   * @param {Object} file - Multer file object
   * @param {string} folder - Folder path
   * @returns {Promise<Object>}
   */
  async uploadToLocal(file, folder) {
    try {
      const fileId = uuidv4();
      const ext = path.extname(file.originalname);
      const filename = `${fileId}${ext}`;
      const folderPath = path.join(this.localStoragePath, folder);
      const filePath = path.join(folderPath, filename);

      // Ensure folder exists
      await fs.mkdir(folderPath, { recursive: true });

      // Write file
      await fs.writeFile(filePath, file.buffer);

      logger.info('File uploaded to local storage', {
        fileId,
        filename,
        folder,
        size: file.size
      });

      return {
        fileId,
        url: `/api/files/${fileId}`,
        path: `${folder}/${filename}`,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };
    } catch (error) {
      logger.error('Failed to upload file to local storage', {
        error: error.message,
        folder
      });
      throw new Error('File upload failed');
    }
  }

  /**
   * Upload file to S3
   * @param {Object} file - Multer file object
   * @param {string} folder - Folder path
   * @returns {Promise<Object>}
   */
  async uploadToS3(file, folder) {
    try {
      const fileId = uuidv4();
      const ext = path.extname(file.originalname);
      const filename = `${fileId}${ext}`;
      const key = `${folder}/${filename}`;

      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private'
      };

      await this.s3.upload(params).promise();

      logger.info('File uploaded to S3', {
        fileId,
        filename,
        folder,
        size: file.size
      });

      return {
        fileId,
        url: `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
        path: key,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };
    } catch (error) {
      logger.error('Failed to upload file to S3', {
        error: error.message,
        folder
      });
      throw new Error('File upload failed');
    }
  }

  /**
   * Get file from storage
   * @param {string} filePath - File path
   * @returns {Promise<Buffer>}
   */
  async getFile(filePath) {
    if (this.storageType === 's3') {
      return this.getFileFromS3(filePath);
    }
    return this.getFileFromLocal(filePath);
  }

  /**
   * Get file from local storage
   * @param {string} filePath - File path
   * @returns {Promise<Buffer>}
   */
  async getFileFromLocal(filePath) {
    try {
      const fullPath = path.join(this.localStoragePath, filePath);
      const fileBuffer = await fs.readFile(fullPath);
      return fileBuffer;
    } catch (error) {
      logger.error('Failed to read file from local storage', {
        error: error.message,
        filePath
      });
      throw new Error('File not found');
    }
  }

  /**
   * Get file from S3
   * @param {string} filePath - File path (S3 key)
   * @returns {Promise<Buffer>}
   */
  async getFileFromS3(filePath) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: filePath
      };

      const data = await this.s3.getObject(params).promise();
      return data.Body;
    } catch (error) {
      logger.error('Failed to read file from S3', {
        error: error.message,
        filePath
      });
      throw new Error('File not found');
    }
  }

  /**
   * Delete file from storage
   * @param {string} filePath - File path
   * @returns {Promise<boolean>}
   */
  async deleteFile(filePath) {
    if (this.storageType === 's3') {
      return this.deleteFileFromS3(filePath);
    }
    return this.deleteFileFromLocal(filePath);
  }

  /**
   * Delete file from local storage
   * @param {string} filePath - File path
   * @returns {Promise<boolean>}
   */
  async deleteFileFromLocal(filePath) {
    try {
      const fullPath = path.join(this.localStoragePath, filePath);
      await fs.unlink(fullPath);
      
      logger.info('File deleted from local storage', { filePath });
      return true;
    } catch (error) {
      logger.error('Failed to delete file from local storage', {
        error: error.message,
        filePath
      });
      return false;
    }
  }

  /**
   * Delete file from S3
   * @param {string} filePath - File path (S3 key)
   * @returns {Promise<boolean>}
   */
  async deleteFileFromS3(filePath) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: filePath
      };

      await this.s3.deleteObject(params).promise();
      
      logger.info('File deleted from S3', { filePath });
      return true;
    } catch (error) {
      logger.error('Failed to delete file from S3', {
        error: error.message,
        filePath
      });
      return false;
    }
  }

  /**
   * Get file URL
   * @param {string} filePath - File path
   * @returns {string}
   */
  getFileUrl(filePath) {
    if (this.storageType === 's3') {
      return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`;
    }
    // For local storage, return API endpoint
    const fileId = path.basename(filePath, path.extname(filePath));
    return `/api/files/${fileId}`;
  }

  /**
   * Generate signed URL for S3 (temporary access)
   * @param {string} filePath - File path (S3 key)
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>}
   */
  async getSignedUrl(filePath, expiresIn = 3600) {
    if (this.storageType !== 's3') {
      return this.getFileUrl(filePath);
    }

    try {
      const params = {
        Bucket: this.bucket,
        Key: filePath,
        Expires: expiresIn
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      logger.error('Failed to generate signed URL', {
        error: error.message,
        filePath
      });
      throw new Error('Failed to generate file URL');
    }
  }
}

// Export singleton instance
module.exports = new StorageService();
