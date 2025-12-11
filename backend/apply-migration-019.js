/**
 * Script to apply migration 019: Fix get_user_permissions function
 * 
 * This script applies the SQL migration to fix the "operator does not exist: text = text[]" error
 * 
 * Usage:
 *   node apply-migration-019.js
 * 
 * Or run the SQL directly in Supabase SQL Editor:
 *   Copy contents of migrations/019_apply_get_user_permissions_fix.sql
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabaseAdmin } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    console.log('🔄 Applying migration 019: Fix get_user_permissions function...\n');

    // Read the SQL migration file
    const migrationPath = join(__dirname, 'migrations', '019_apply_get_user_permissions_fix.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    if (!supabaseAdmin) {
      console.error('❌ Supabase admin client not available. Please set SUPABASE_SERVICE_ROLE_KEY in .env');
      console.log('\n📝 Alternative: Run the SQL directly in Supabase SQL Editor:');
      console.log('   1. Open Supabase Dashboard');
      console.log('   2. Go to SQL Editor');
      console.log('   3. Copy and paste the contents of:');
      console.log(`      ${migrationPath}`);
      process.exit(1);
    }

    // Execute the SQL
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct query (Supabase doesn't support multi-statement queries via RPC easily)
      console.log('⚠️  Direct RPC not available. Please run the SQL manually:');
      console.log('\n📝 Instructions:');
      console.log('   1. Open Supabase Dashboard');
      console.log('   2. Go to SQL Editor');
      console.log('   3. Copy and paste the contents of:');
      console.log(`      ${migrationPath}`);
      console.log('\n📄 SQL Content:');
      console.log('─'.repeat(60));
      console.log(sql);
      console.log('─'.repeat(60));
      process.exit(0);
    }

    console.log('✅ Migration applied successfully!');
    console.log('✅ The get_user_permissions function has been updated');
    console.log('✅ The "operator does not exist: text = text[]" error should be fixed');
  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
    console.log('\n📝 Please run the SQL manually in Supabase SQL Editor:');
    console.log(`   File: ${join(__dirname, 'migrations', '019_apply_get_user_permissions_fix.sql')}`);
    process.exit(1);
  }
}

applyMigration();

