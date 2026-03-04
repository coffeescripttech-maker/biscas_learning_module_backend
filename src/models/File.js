const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const logger = require('../utils/logger');

class File {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.userId = data.user_id || data.userId;
    this.filename = data.filename;
    this.originalName = data.original_name || data.originalName;
    this.mimetype = data.mimetype;
    this.size = data.size;
    this.path = data.path;
    this.folder = data.folder;
    this.url = data.url;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  /**
   * Create a new file record
   * @param {Object} fileData - File data
   * @returns {Promise<File>}
   */
  static async create(fileData) {
    try {
      const file = new File(fileData);
      
      const query = `
        INSERT INTO files (
          id, user_id, filename, original_name, mimetype, 
          size, path, folder, url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      await db.query(query, [
        file.id,
        file.userId,
        file.filename,
        file.originalName,
        file.mimetype,
        file.size,
        file.path,
        file.folder,
        file.url
      ]);

      logger.info('File record created', { fileId: file.id, userId: file.userId });
      return file;
    } catch (error) {
      logger.error('Failed to create file record', {
        error: error.message,
        fileData
      });
      throw error;
    }
  }

  /**
   * Find file by ID
   * @param {string} id - File ID
   * @returns {Promise<File|null>}
   */
  static async findById(id) {
    try {
      const query = 'SELECT * FROM files WHERE id = ?';
      const rows = await db.query(query, [id]);

      if (rows.length === 0) {
        return null;
      }

      return new File(rows[0]);
    } catch (error) {
      logger.error('Failed to find file by ID', {
        error: error.message,
        fileId: id
      });
      throw error;
    }
  }

  /**
   * Find files by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array<File>>}
   */
  static async findByUserId(userId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      
      const query = `
        SELECT * FROM files 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;

      const rows = await db.query(query, [userId, limit, offset]);
      return rows.map(row => new File(row));
    } catch (error) {
      logger.error('Failed to find files by user ID', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Find files by folder
   * @param {string} folder - Folder name
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array<File>>}
   */
  static async findByFolder(folder, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      
      const query = `
        SELECT * FROM files 
        WHERE folder = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;

      const rows = await db.query(query, [folder, limit, offset]);
      return rows.map(row => new File(row));
    } catch (error) {
      logger.error('Failed to find files by folder', {
        error: error.message,
        folder
      });
      throw error;
    }
  }

  /**
   * Update file record
   * @param {string} id - File ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<File|null>}
   */
  static async update(id, updates) {
    try {
      const allowedFields = ['filename', 'original_name', 'url', 'path'];
      const fields = [];
      const values = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (fields.length === 0) {
        return await File.findById(id);
      }

      fields.push('updated_at = NOW()');
      values.push(id);

      const query = `UPDATE files SET ${fields.join(', ')} WHERE id = ?`;
      await db.query(query, values);

      logger.info('File record updated', { fileId: id });
      return await File.findById(id);
    } catch (error) {
      logger.error('Failed to update file record', {
        error: error.message,
        fileId: id
      });
      throw error;
    }
  }

  /**
   * Delete file record
   * @param {string} id - File ID
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM files WHERE id = ?';
      const result = await db.query(query, [id]);

      logger.info('File record deleted', { fileId: id });
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Failed to delete file record', {
        error: error.message,
        fileId: id
      });
      throw error;
    }
  }

  /**
   * Check if user owns the file
   * @param {string} fileId - File ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  static async isOwner(fileId, userId) {
    try {
      const query = 'SELECT user_id FROM files WHERE id = ?';
      const rows = await db.query(query, [fileId]);

      if (rows.length === 0) {
        return false;
      }

      return rows[0].user_id === userId;
    } catch (error) {
      logger.error('Failed to check file ownership', {
        error: error.message,
        fileId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get total storage used by user
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Total bytes used
   */
  static async getTotalStorageByUser(userId) {
    try {
      const query = 'SELECT SUM(size) as total FROM files WHERE user_id = ?';
      const rows = await db.query(query, [userId]);

      return rows[0].total || 0;
    } catch (error) {
      logger.error('Failed to get total storage by user', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

module.exports = File;
