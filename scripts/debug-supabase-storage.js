const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../client/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Debugging Supabase Storage...');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugStorage() {
  try {
    console.log('\n📋 Listing buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }
    
    console.log('✅ Buckets found:', buckets?.length || 0);
    
    if (buckets && buckets.length > 0) {
      for (const bucket of buckets) {
        console.log(`\n📦 Bucket: ${bucket.name}`);
        console.log(`   ID: ${bucket.id}`);
        console.log(`   Public: ${bucket.public}`);
        console.log(`   Created: ${bucket.created_at}`);
        
        // List files in bucket
        const { data: files, error: filesError } = await supabase.storage
          .from(bucket.name)
          .list('', { limit: 10 });
          
        if (filesError) {
          console.log(`   ❌ Error listing files: ${filesError.message}`);
        } else {
          console.log(`   📁 Files: ${files?.length || 0}`);
          if (files && files.length > 0) {
            files.slice(0, 5).forEach(file => {
              console.log(`      - ${file.name} (${file.metadata?.size || 'unknown size'})`);
            });
            if (files.length > 5) {
              console.log(`      ... and ${files.length - 5} more files`);
            }
          }
        }
      }
    } else {
      console.log('⚠️  No buckets found');
      
      // Try to access known bucket names
      const knownBuckets = ['module-backups', 'module-content', 'vark-modules'];
      
      for (const bucketName of knownBuckets) {
        console.log(`\n🔍 Trying to access bucket: ${bucketName}`);
        const { data: files, error } = await supabase.storage
          .from(bucketName)
          .list('', { limit: 1 });
          
        if (error) {
          console.log(`   ❌ ${bucketName}: ${error.message}`);
        } else {
          console.log(`   ✅ ${bucketName}: Accessible, ${files?.length || 0} items`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugStorage();