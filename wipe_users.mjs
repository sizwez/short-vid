import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function wipe() {
  console.log('--- Wiping Test Users ---');
  
  // 1. Get all users from auth.users (Admin)
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  console.log(`Found ${users.length} users in Auth.`);

  for (const user of users) {
    // PROTECT: Don't delete the system creator if we can identify it
    // Based on diagnose_db, d19826f0-482e-440b-929f-ff5d71a94e77 is the creator
    if (user.id === 'd19826f0-482e-440b-929f-ff5d71a94e77' || user.email?.includes('official')) {
      console.log(`Skipping system creator: ${user.email}`);
      continue;
    }

    console.log(`Deleting user: ${user.email} (${user.id})...`);
    
    // Delete from auth.users (cascades to public.users if references exist)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error(`Failed to delete ${user.email}:`, deleteError);
    } else {
      console.log(`Successfully deleted ${user.email}.`);
    }
  }

  console.log('--- Wipe Complete ---');
}

wipe();
