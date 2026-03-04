/**
 * Supabase Storage Export Script
 * 
 * This script downloads all files from Supabase Storage buckets.
 * It maintains the directory structure and creates a manifest for tracking.
 * 
 * Requirements: 5.4
 * 
 * Usage:
 *   node scripts/export-supabase-storage.js
 * 
 * Environment Variables Required:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 * 
 * Output:
 *   - Downloads all files to server/exports/storage/
 *   - Maintains bucket and folder structure
 *   - Creates manifest.json with file metadata
 *   - Generates migration mapping for URL updates
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load environment variables from root .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPORT_DIR = path.join(__dirname, '../exports/storage');
const DELAY_BETWEEN_DOWNLOADS = 50; // ms delay to avoid rate limiting

// Common Supabase storage bucket names
const BUCKETS_TO_EXPORT = [
  'avatars',
  'profile-photos',
  'module-images',
  'module-content',
  'submissions',
  'attachments',
  'public',
  'private'
];

// Initialize Supabase client
let supabase;

/**
 * Initialize the Supabase client
 */
function initializeSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: Missing Supabase credentials');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('✅ Supabase client initialized');
}

/**
 * Create export directory if it doesn't exist
 */
function ensureExportDirectory() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    console.log(`✅ Created export directory: ${EXPORT_DIR}`);
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Download a file from URL
 * @param {string} url - File URL
 * @param {string} destination - Local file path
 * @returns {Promise<void>}
 */
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    // Ensure directory exists
    const dir = path.dirname(destination);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(destination);
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(destination, () => {}); // Delete partial file
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {}); // Delete partial file
      reject(err);
    });
  });
}

/**
 * List all buckets
 * @returns {Promise<Array>} Array of bucket objects
 */
async function listBuckets() {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error listing buckets:', error.message);
    return [];
  }
}

/**
 * List all files in a bucket recursively
 * @param {string} bucketName - Name of the bucket
 * @param {string} folder - Folder path (empty for root)
 * @returns {Promise<Array>} Array of file objects
 */
async function listFilesInBucket(bucketName, folder = '') {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folder, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    let allFiles = [];

    for (const item of data) {
      const itemPath = folder ? `${folder}/${item.name}` : item.name;

      if (item.id === null) {
        // It's a folder, recurse into it
        const subFiles = await listFilesInBucket(bucketName, itemPath);
        allFiles = allFiles.concat(subFiles);
      } else {
        // It's a file
        allFiles.push({
          name: item.name,
          path: itemPath,
          size: item.metadata?.size || 0,
          contentType: item.metadata?.mimetype || 'application/octet-stream',
          lastModified: item.updated_at || item.created_at,
          bucket: bucketName
        });
      }
    }

    return allFiles;
  } catch (error) {
    console.error(`Error listing files in ${bucketName}/${folder}:`, error.message);
    return [];
  }
}

/**
 * Export a single bucket
 * @param {string} bucketName - Name of the bucket to export
 * @returns {Promise<Object>} Export statistics
 */
async function exportBucket(bucketName) {
  console.log(`\n📦 Exporting bucket: ${bucketName}`);

  try {
    // List all files in bucket
    console.log(`   Listing files...`);
    const files = await listFilesInBucket(bucketName);

    if (files.length === 0) {
      console.log(`   ⚠️  No files found in bucket ${bucketName}`);
      return {
        bucketName,
        filesDownloaded: 0,
        totalSize: 0,
        skipped: true
      };
    }

    console.log(`   Found ${files.length} files`);

    // Create bucket directory
    const bucketDir = path.join(EXPORT_DIR, bucketName);
    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
    }

    // Download each file
    let downloadedCount = 0;
    let totalSize = 0;
    const downloadedFiles = [];

    for (const file of files) {
      try {
        // Get public URL
        const { data } = supabase.storage
          .from(bucketName)
          .getPublicUrl(file.path);

        if (!data || !data.publicUrl) {
          console.log(`   ⚠️  Could not get URL for ${file.path}, skipping...`);
          continue;
        }

        // Download file
        const localPath = path.join(bucketDir, file.path);
        console.log(`   Downloading: ${file.path} (${(file.size / 1024).toFixed(2)} KB)`);

        await downloadFile(data.publicUrl, localPath);

        downloadedCount++;
        totalSize += file.size;

        downloadedFiles.push({
          ...file,
          localPath: path.relative(EXPORT_DIR, localPath),
          originalUrl: data.publicUrl,
          downloaded: true
        });

        // Add delay between downloads
        await sleep(DELAY_BETWEEN_DOWNLOADS);

      } catch (error) {
        console.log(`   ❌ Failed to download ${file.path}: ${error.message}`);
        downloadedFiles.push({
          ...file,
          downloaded: false,
          error: error.message
        });
      }
    }

    console.log(`   ✅ Downloaded ${downloadedCount}/${files.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

    // Save manifest for this bucket
    const manifestPath = path.join(bucketDir, '_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(downloadedFiles, null, 2));

    return {
      bucketName,
      filesTotal: files.length,
      filesDownloaded: downloadedCount,
      filesFailed: files.length - downloadedCount,
      totalSize,
      files: downloadedFiles,
      skipped: false
    };

  } catch (error) {
    console.error(`   ❌ Error exporting bucket ${bucketName}:`, error.message);
    return {
      bucketName,
      filesDownloaded: 0,
      totalSize: 0,
      error: error.message,
      skipped: false
    };
  }
}

/**
 * Export all storage buckets
 */
async function exportAllBuckets() {
  console.log('\n🚀 Starting Supabase Storage export...');
  console.log(`   Export directory: ${EXPORT_DIR}`);

  const startTime = Date.now();

  try {
    // List all buckets
    console.log('\n📋 Discovering buckets...');
    const allBuckets = await listBuckets();
    
    if (allBuckets.length === 0) {
      console.log('   ⚠️  No buckets found in Supabase Storage');
      return;
    }

    console.log(`   Found ${allBuckets.length} buckets:`);
    allBuckets.forEach(bucket => {
      console.log(`      - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });

    // Export each bucket
    const results = [];
    for (const bucket of allBuckets) {
      const result = await exportBucket(bucket.name);
      results.push(result);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 STORAGE EXPORT SUMMARY');
    console.log('='.repeat(60));

    const successful = results.filter(r => !r.error && !r.skipped);
    const skipped = results.filter(r => r.skipped);
    const failed = results.filter(r => r.error);
    const totalFiles = successful.reduce((sum, r) => sum + r.filesDownloaded, 0);
    const totalSize = successful.reduce((sum, r) => sum + r.totalSize, 0);

    console.log(`\n✅ Successfully exported: ${successful.length} buckets`);
    console.log(`⚠️  Skipped (empty): ${skipped.length} buckets`);
    console.log(`❌ Failed: ${failed.length} buckets`);
    console.log(`📝 Total files downloaded: ${totalFiles.toLocaleString()}`);
    console.log(`💾 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⏱️  Duration: ${duration} seconds`);

    // Show details for each bucket
    console.log('\n📋 Details by bucket:');
    results.forEach(result => {
      if (result.skipped) {
        console.log(`   ⚠️  ${result.bucketName.padEnd(25)} - SKIPPED (empty)`);
      } else if (result.error) {
        console.log(`   ❌ ${result.bucketName.padEnd(25)} - ERROR: ${result.error}`);
      } else {
        const sizeMB = (result.totalSize / 1024 / 1024).toFixed(2);
        console.log(`   ✓  ${result.bucketName.padEnd(25)} - ${result.filesDownloaded.toString().padStart(5)} files (${sizeMB} MB)`);
      }
    });

    // Generate URL mapping for migration
    const urlMapping = [];
    results.forEach(result => {
      if (result.files) {
        result.files.forEach(file => {
          if (file.downloaded) {
            urlMapping.push({
              originalUrl: file.originalUrl,
              bucket: file.bucket,
              path: file.path,
              localPath: file.localPath,
              newUrl: `/api/files/${file.bucket}/${file.path}` // Placeholder for new API
            });
          }
        });
      }
    });

    const urlMappingPath = path.join(EXPORT_DIR, '_url_mapping.json');
    fs.writeFileSync(urlMappingPath, JSON.stringify(urlMapping, null, 2));
    console.log(`\n🔗 URL mapping saved to: _url_mapping.json`);

    // Save summary
    const summary = {
      exportDate: new Date().toISOString(),
      duration: `${duration} seconds`,
      totalBuckets: allBuckets.length,
      successfulBuckets: successful.length,
      skippedBuckets: skipped.length,
      failedBuckets: failed.length,
      totalFiles,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      results,
      urlMappingFile: '_url_mapping.json'
    };

    const summaryPath = path.join(EXPORT_DIR, '_storage_export_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`💾 Summary saved to: _storage_export_summary.json`);

    // Generate migration instructions
    const instructions = `
STORAGE MIGRATION INSTRUCTIONS
===============================

FILES EXPORTED: ${totalFiles} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)
BUCKETS: ${allBuckets.length}

DIRECTORY STRUCTURE:
--------------------
exports/storage/
├── bucket1/
│   ├── file1.jpg
│   ├── folder/
│   │   └── file2.png
│   └── _manifest.json
├── bucket2/
│   └── ...
├── _url_mapping.json
└── _storage_export_summary.json

NEXT STEPS:
-----------

1. REVIEW EXPORTED FILES
   - Check that all files downloaded successfully
   - Review _storage_export_summary.json for any errors
   - Verify file integrity (sizes, types)

2. UPLOAD TO NEW STORAGE
   
   For Local Storage (Development):
   - Copy files to server/uploads/
   - Maintain bucket structure
   - Update file paths in database
   
   For S3 (Production):
   - Use AWS CLI or SDK to upload
   - aws s3 sync exports/storage/ s3://your-bucket/
   - Set appropriate permissions
   - Configure CDN if needed

3. UPDATE DATABASE URLS
   - Use _url_mapping.json to update file URLs
   - Run database migration script
   - Update file_storage and files tables
   - Test file access through new API

4. VERIFY MIGRATION
   - Test file downloads through new API
   - Verify file permissions
   - Check file metadata
   - Test with different user roles

URL MAPPING:
------------
The _url_mapping.json file contains:
- originalUrl: Supabase Storage URL
- newUrl: New API endpoint (placeholder)
- bucket: Original bucket name
- path: File path within bucket
- localPath: Local file system path

Use this mapping to update database records that reference files.

SECURITY NOTES:
---------------
- Maintain original bucket privacy settings
- Set appropriate file permissions
- Implement access control in new API
- Use signed URLs for private files
- Enable CORS for public files

For questions or issues, refer to the migration documentation.
`;

    const instructionsPath = path.join(EXPORT_DIR, 'MIGRATION_INSTRUCTIONS.txt');
    fs.writeFileSync(instructionsPath, instructions);
    console.log(`📄 Migration instructions saved to: MIGRATION_INSTRUCTIONS.txt`);

    console.log('\n' + '='.repeat(60));
    console.log('✨ Storage export complete!');
    console.log('='.repeat(60) + '\n');

    return summary;

  } catch (error) {
    console.error('\n❌ Fatal error during storage export:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       SUPABASE STORAGE EXPORT SCRIPT                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    initializeSupabase();
    ensureExportDirectory();
    await exportAllBuckets();

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  exportBucket,
  exportAllBuckets,
  listBuckets,
  listFilesInBucket
};
