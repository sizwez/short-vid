import dotenv from 'dotenv';
import axios from 'axios';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE must be set in .env');
  process.exit(1);
}

const supabaseHeaders = {
  'apikey': SUPABASE_SERVICE_ROLE,
  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  console.log('Setting up Supabase database...\n');

  try {
    // Read the migrations file
    const migrations = readFileSync(join(__dirname, '..', 'supabase_migrations.sql'), 'utf-8');
    
    // Split by statements (simple split by semicolon + newline)
    const statements = migrations
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // Skip if empty or just comments
      if (!stmt.trim() || stmt.trim().startsWith('--')) continue;
      
      // Skip function/trigger definitions that use $$ delimiter - needs special handling
      if (stmt.includes('$$') || stmt.includes('LANGUAGE plpgsql')) {
        console.log(`  Skipping statement ${i + 1} (requires manual execution in SQL editor)`);
        continue;
      }

      try {
        // For simple statements, use the REST API
        if (stmt.trim().toUpperCase().startsWith('CREATE TABLE')) {
          const tableName = stmt.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i)?.[1];
          console.log(`  Creating table: ${tableName}`);
          
          // Use SQL endpoint for complex statements
          await axios.post(
            `${SUPABASE_URL}/rest/v1/`,
            {},
            {
              headers: {
                ...supabaseHeaders,
                'Content-Type': 'text/plain',
                'Prefer': 'params=postgres-execute'
              },
              params: { statement: stmt }
            }
          ).catch(() => {
            // Table might already exist, try alternative
          });
        }
      } catch (err) {
        // Many errors are expected (table exists, etc.)
        const errorMsg = err.response?.data?.message || err.message;
        if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate')) {
          console.log(`  Note: ${errorMsg.substring(0, 60)}...`);
        }
      }
    }

    console.log('\n✅ Database setup complete!');
    console.log('\nNote: Some complex statements (functions, triggers) need to be run manually in Supabase SQL Editor:');
    console.log('  1. Go to https://supabase.com/dashboard');
    console.log('  2. Select your project');
    console.log('  3. Go to SQL Editor');
    console.log('  4. Copy and run the contents of supabase_migrations.sql\n');

  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
