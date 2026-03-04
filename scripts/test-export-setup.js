/**
 * Test Export Setup
 * 
 * This script verifies that the export scripts are properly configured
 * and can connect to Supabase.
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         EXPORT SCRIPTS SETUP TEST                          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Check environment variables
console.log('📋 Checking environment variables...\n');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set');
} else {
  console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}`);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
} else {
  console.log(`✅ SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);
}

// Check if @supabase/supabase-js is installed
console.log('\n📦 Checking dependencies...\n');

try {
  require('@supabase/supabase-js');
  console.log('✅ @supabase/supabase-js is installed');
} catch (error) {
  console.error('❌ @supabase/supabase-js is not installed');
  console.error('   Run: npm install @supabase/supabase-js');
}

// Check if export scripts exist
console.log('\n📄 Checking export scripts...\n');

const scripts = [
  'export-supabase-data.js',
  'export-supabase-auth.js',
  'export-supabase-storage.js',
  'export-all.js'
];

scripts.forEach(script => {
  const scriptPath = path.join(__dirname, script);
  if (fs.existsSync(scriptPath)) {
    console.log(`✅ ${script} exists`);
  } else {
    console.error(`❌ ${script} not found`);
  }
});

// Test Supabase connection
console.log('\n🔌 Testing Supabase connection...\n');

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Try to list buckets as a connection test
    supabase.storage.listBuckets()
      .then(({ data, error }) => {
        if (error) {
          console.error('❌ Failed to connect to Supabase:', error.message);
        } else {
          console.log('✅ Successfully connected to Supabase');
          console.log(`   Found ${data ? data.length : 0} storage buckets`);
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SETUP TEST SUMMARY');
        console.log('='.repeat(60));
        
        if (SUPABASE_URL && SUPABASE_SERVICE_KEY && !error) {
          console.log('\n✅ All checks passed! You can now run the export scripts.');
          console.log('\nTo export all data, run:');
          console.log('   node scripts/export-all.js');
          console.log('\nOr export individually:');
          console.log('   node scripts/export-supabase-data.js');
          console.log('   node scripts/export-supabase-auth.js');
          console.log('   node scripts/export-supabase-storage.js');
        } else {
          console.log('\n⚠️  Some checks failed. Please fix the issues above.');
        }
        
        console.log('\n' + '='.repeat(60) + '\n');
      })
      .catch(error => {
        console.error('❌ Connection test failed:', error.message);
      });

  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error.message);
  }
} else {
  console.log('⚠️  Skipping connection test (missing credentials)');
  console.log('\n' + '='.repeat(60));
  console.log('⚠️  Please set up environment variables before running exports');
  console.log('='.repeat(60) + '\n');
}
