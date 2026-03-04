/**
 * Storage Files Import Script
 * 
 * This script imports files from Supabase Storage export to new storage system.
 * It supports both local file storage (development) and S3 (production).
 * Updates file URLs in the database after import.
 * 
 * Requirements: 5.4, 5.5
 * 
 * Usage:
 *   node scripts/import-storage-files.js
 * 
 * Environment Variables Required:
 *   STORAGE_TYPE - 'local' or 's3'
 *   STORAGE_PATH - Local storage path (for local storage)
 *   AWS_REGION - AWS region (for S3)
 *   AWS_ACCESS_KEY_ID - AWS access key (for S3)
 *   AWS_SECRET_ACCESS_KEY - AWS secret key (for S3)
 *   AWS_S3_BUCKET - S3 bucket name (for S3)
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME - Database credentials
 * 
 * Features:
 *   - Uploads files to local storage or S3
 *   - Maintains bucket and folder structure
 *   - Updates file URLs in database
 *   - Tracks import progress
 *   - Handles errors gracefully
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

// Import database utilities
const db = require('../src/utils/db');
const { initialize: initializeDatabase } = require('../src/config/database');
const logger = require('../src/utils/logger');

// Configuration
const EXPORT_DIR = path.join(__dirname, '../exports/storage');
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';
const LOCAL_STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../uploads');
const DELAY_BETWEEN_UPLOADS = 50; // ms delay between uploads

// S3 client (initialized if needed)
let s3Client = null;

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Initialize S3 client
 */
function initializeS3() {
  if (STORAGE_TYPE !== 's3') {
    return;
  }
  
  const required = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing S3 configuration: ${missing.join(', ')}`);
  }
  
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  
  console.log('✅ S3 client initialized');
  console.log(`   Region: ${process.env.AWS_REGION}`);
  console.log(`   Bucket: ${process.env.AWS_S3_BUCKET}`);
}

/**
 * Load URL mapping from export
 * @returns {Array} - Array of file mappings
 */
function loadUrlMapping() {
  const filename = path.join(EXPORT_DIR, '_url_mapping.json');
  
  if (!fs.existsSync(filename)) {
    throw new Error(`URL mapping file not found: ${filename}`);
  }
  
  try {
    const content = fs.readFileSync(filename, 'utf8');
    const mapping = JSON.parse(content);
    
    if (!Array.isArray(mapping)) {
      throw new Error('Invalid URL mapping format: expected array');
    }
    
    return mapping;
  } catch (error) {
    throw new Error(`Failed to load URL mapping: ${error.message}`);
  }
}

/**
 * Upload file to local storage
 * @param {string} sourcePath - Source file path
 * @param {string} destinationPath - Destination path (relative)
 * @returns {Promise<string>} - New file URL
 */
async function uploadToLocal(sourcePath, destinationPath) {
  try {
    const fullDestPath = path.join(LOCAL_STORAGE_PATH, destinationPath);
    
    // Ensure directory exists
    const dir = path.dirname(fullDestPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Copy file
    fs.copyFileSync(sourcePath, fullDestPath);
    
    // Return URL path (relative to storage root)
    return `/files/${destinationPath}`;
  } catch (error) {
    throw new Error(`Failed to upload to local storage: ${error.message}`);
  }
}

/**
 * Upload file to S3
 * @param {string} sourcePath - Source file path
 * @param {string} destinationPath - Destination path (S3 key)
 * @returns {Promise<string>} - New file URL
 */
async function uploadToS3(sourcePath, destinationPath) {
  try {
    // Read file
    const fileContent = fs.readFileSync(sourcePath);
    
    // Determine content type from file extension
    const ext = path.extname(sourcePath).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.json': 'application/json'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: destinationPath,
      Body: fileContent,
      ContentType: contentType
    });
    
    await s3Client.send(command);
    
    // Return S3 URL
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${destinationPath}`;
  } catch (error) {
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
}

/**
 * Upload a single file
 * @param {Object} fileMapping - File mapping object
 * @returns {Promise<Object>} - Upload result
 */
async function uploadFile(fileMapping) {
  const { bucket, path: filePath, localPath } = fileMapping;
  
  try {
    // Source file path
    const sourcePath = path.join(EXPORT_DIR, localPath);
    
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      throw new Error('Source file not found');
    }
    
    // Destination path (maintain bucket structure)
    const destinationPath = `${bucket}/${filePath}`;
    
    // Upload based on storage type
    let newUrl;
    if (STORAGE_TYPE === 's3') {
      newUrl = await uploadToS3(sourcePath, destinationPath);
    } else {
      newUrl = await uploadToLocal(sourcePath, destinationPath);
    }
    
    logger.info('File uploaded', {
      bucket,
      path: filePath,
      newUrl,
      storageType: STORAGE_TYPE
    });
    
    return {
      bucket,
      path: filePath,
      originalUrl: fileMapping.originalUrl,
      newUrl,
      success: true
    };
  } catch (error) {
    logger.error('Failed to upload file', {
      bucket,
      path: filePath,
      error: error.message
    });
    
    return {
      bucket,
      path: filePath,
      originalUrl: fileMapping.originalUrl,
      success: false,
      error: error.message
    };
  }
}

/**
 * Upload all files
 * @param {Array} urlMapping - Array of file mappings
 * @returns {Promise<Object>} - Upload statistics
 */
async function uploadAllFiles(urlMapping) {
  console.log(`\n📦 Uploading ${urlMapping.length} files to ${STORAGE_TYPE} storage...`);
  
  const results = {
    total: urlMapping.length,
    uploaded: 0,
    failed: 0,
    files: []
  };
  
  for (let i = 0; i < urlMapping.length; i++) {
    const fileMapping = urlMapping[i];
    const progress = `[${i + 1}/${urlMapping.length}]`;
    
    console.log(`   ${progress} Uploading ${fileMapping.bucket}/${fileMapping.path}...`);
    
    const result = await uploadFile(fileMapping);
    
    if (result.success) {
      console.log(`   ${progress} ✓ Uploaded successfully`);
      results.uploaded++;
    } else {
      console.log(`   ${progress} ❌ Failed: ${result.error}`);
      results.failed++;
    }
    
    results.files.push(result);
    
    // Add delay between uploads
    if (i + 1 < urlMapping.length) {
      await sleep(DELAY_BETWEEN_UPLOADS);
    }
  }
  
  return results;
}

/**
 * Update file URLs in database
 * @param {Array} uploadResults - Upload results with new URLs
 * @returns {Promise<Object>} - Update statistics
 */
async function updateDatabaseUrls(uploadResults) {
  console.log(`\n🔄 Updating file URLs in database...`);
  
  const stats = {
    total: 0,
    updated: 0,
    failed: 0
  };
  
  // Get successful uploads
  const successfulUploads = uploadResults.filter(r => r.success);
  stats.total = successfulUploads.length;
  
  if (stats.total === 0) {
    console.log('   ⚠️  No successful uploads to update in database');
    return stats;
  }
  
  // Check if file_storage or files table exists
  let tableExists = false;
  let tableName = null;
  
  try {
    await db.query('SELECT 1 FROM file_storage LIMIT 1');
    tableExists = true;
    tableName = 'file_storage';
  } catch (error) {
    try {
      await db.query('SELECT 1 FROM files LIMIT 1');
      tableExists = true;
      tableName = 'files';
    } catch (error2) {
      console.log('   ⚠️  No file_storage or files table found, skipping database updates');
      return stats;
    }
  }
  
  console.log(`   Using table: ${tableName}`);
  
  // Update URLs in database
  for (let i = 0; i < successfulUploads.length; i++) {
    const file = successfulUploads[i];
    const progress = `[${i + 1}/${stats.total}]`;
    
    try {
      // Try to update by matching original URL
      const result = await db.query(
        `UPDATE ${tableName} SET url = ? WHERE url = ?`,
        [file.newUrl, file.originalUrl]
      );
      
      if (result.affectedRows > 0) {
        console.log(`   ${progress} ✓ Updated ${result.affectedRows} record(s)`);
        stats.updated += result.affectedRows;
      } else {
        // Try to update by path if URL doesn't match
        const pathPattern = `%${file.path}%`;
        const result2 = await db.query(
          `UPDATE ${tableName} SET url = ? WHERE url LIKE ?`,
          [file.newUrl, pathPattern]
        );
        
        if (result2.affectedRows > 0) {
          console.log(`   ${progress} ✓ Updated ${result2.affectedRows} record(s) by path`);
          stats.updated += result2.affectedRows;
        } else {
          console.log(`   ${progress} ⚠️  No matching records found`);
        }
      }
    } catch (error) {
      console.log(`   ${progress} ❌ Failed to update: ${error.message}`);
      stats.failed++;
    }
  }
  
  return stats;
}

/**
 * Save import results
 * @param {Object} uploadResults - Upload results
 * @param {Object} updateStats - Database update statistics
 */
function saveResults(uploadResults, updateStats) {
  const results = {
    importDate: new Date().toISOString(),
    storageType: STORAGE_TYPE,
    uploadResults,
    databaseUpdateStats: updateStats
  };
  
  const resultsFilename = path.join(EXPORT_DIR, '_import_results.json');
  fs.writeFileSync(resultsFilename, JSON.stringify(results, null, 2));
  console.log(`\n💾 Import results saved to: _import_results.json`);
  
  // Save failed uploads for retry
  const failedUploads = uploadResults.files.filter(f => !f.success);
  if (failedUploads.length > 0) {
    const failedFilename = path.join(EXPORT_DIR, '_failed_uploads.json');
    fs.writeFileSync(failedFilename, JSON.stringify(failedUploads, null, 2));
    console.log(`⚠️  Failed uploads list saved to: _failed_uploads.json`);
  }
}

/**
 * Display summary
 * @param {Object} uploadResults - Upload results
 * @param {Object} updateStats - Database update statistics
 * @param {number} duration - Duration in seconds
 */
function displaySummary(uploadResults, updateStats, duration) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 STORAGE IMPORT SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n📦 File Upload:`);
  console.log(`   ✅ Files uploaded: ${uploadResults.uploaded}`);
  console.log(`   ❌ Files failed: ${uploadResults.failed}`);
  console.log(`   📝 Total files: ${uploadResults.total}`);
  
  const uploadRate = ((uploadResults.uploaded / uploadResults.total) * 100).toFixed(1);
  console.log(`   📈 Success rate: ${uploadRate}%`);
  
  console.log(`\n🔄 Database Updates:`);
  console.log(`   ✅ Records updated: ${updateStats.updated}`);
  console.log(`   ❌ Updates failed: ${updateStats.failed}`);
  console.log(`   📝 Total to update: ${updateStats.total}`);
  
  console.log(`\n⏱️  Duration: ${duration} seconds`);
  console.log(`💾 Storage type: ${STORAGE_TYPE}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Storage import complete!');
  console.log('='.repeat(60));
  
  if (uploadResults.failed > 0) {
    console.log('\n⚠️  WARNING: Some files failed to upload');
    console.log('   Review _failed_uploads.json and retry if needed');
  }
  
  console.log('\n📝 NEXT STEPS:');
  console.log('   1. Verify files are accessible through new API');
  console.log('   2. Test file downloads with different user roles');
  console.log('   3. Check file permissions and access control');
  console.log('   4. Update any hardcoded file URLs in frontend');
  console.log('   5. Monitor file access logs\n');
}

/**
 * Verify storage configuration
 */
function verifyStorageConfig() {
  console.log('\n🔍 Verifying storage configuration...');
  
  if (STORAGE_TYPE === 's3') {
    const required = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error(`❌ Missing S3 configuration: ${missing.join(', ')}`);
      return false;
    }
  } else if (STORAGE_TYPE === 'local') {
    // Ensure local storage directory exists
    if (!fs.existsSync(LOCAL_STORAGE_PATH)) {
      console.log(`   Creating local storage directory: ${LOCAL_STORAGE_PATH}`);
      fs.mkdirSync(LOCAL_STORAGE_PATH, { recursive: true });
    }
  } else {
    console.error(`❌ Invalid STORAGE_TYPE: ${STORAGE_TYPE} (must be 'local' or 's3')`);
    return false;
  }
  
  console.log(`✅ Storage configuration verified (${STORAGE_TYPE})`);
  return true;
}

/**
 * Verify export files exist
 */
function verifyExportFiles() {
  console.log('\n🔍 Verifying export files...');
  
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`❌ Export directory not found: ${EXPORT_DIR}`);
    console.error('\nPlease run the storage export script first:');
    console.error('  node scripts/export-supabase-storage.js');
    return false;
  }
  
  const mappingFile = path.join(EXPORT_DIR, '_url_mapping.json');
  if (!fs.existsSync(mappingFile)) {
    console.error(`❌ URL mapping file not found: ${mappingFile}`);
    console.error('\nPlease run the storage export script first:');
    console.error('  node scripts/export-supabase-storage.js');
    return false;
  }
  
  console.log('✅ Export files found');
  return true;
}

/**
 * Verify database connection
 */
async function verifyConnection() {
  console.log('\n🔍 Verifying database connection...');
  
  try {
    await initializeDatabase();
    console.log('✅ Database connection verified');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      STORAGE FILES IMPORT SCRIPT                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    // Verify prerequisites
    if (!verifyStorageConfig()) {
      process.exit(1);
    }
    
    if (!verifyExportFiles()) {
      process.exit(1);
    }
    
    if (!await verifyConnection()) {
      process.exit(1);
    }
    
    // Initialize S3 if needed
    if (STORAGE_TYPE === 's3') {
      initializeS3();
    }
    
    // Load URL mapping
    console.log('\n📂 Loading URL mapping...');
    const urlMapping = loadUrlMapping();
    console.log(`✅ Loaded ${urlMapping.length} files to import`);
    
    // Display warning
    console.log('\n⚠️  WARNING: This will upload files to storage');
    console.log(`   Storage type: ${STORAGE_TYPE}`);
    if (STORAGE_TYPE === 's3') {
      console.log(`   S3 bucket: ${process.env.AWS_S3_BUCKET}`);
      console.log(`   S3 region: ${process.env.AWS_REGION}`);
    } else {
      console.log(`   Local path: ${LOCAL_STORAGE_PATH}`);
    }
    console.log(`   Files to upload: ${urlMapping.length}`);
    console.log('\n   This operation will:');
    console.log('   - Upload files to new storage system');
    console.log('   - Update file URLs in database');
    console.log('   - May take several minutes for large file sets');
    
    // Start import
    const startTime = Date.now();
    
    // Upload files
    const uploadResults = await uploadAllFiles(urlMapping);
    
    // Update database URLs
    const updateStats = await updateDatabaseUrls(uploadResults.files);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Save results
    saveResults(uploadResults, updateStats);
    
    // Display summary
    displaySummary(uploadResults, updateStats, duration);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    logger.error('Fatal error during storage import', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  uploadAllFiles,
  uploadFile,
  updateDatabaseUrls,
  uploadToLocal,
  uploadToS3
};
