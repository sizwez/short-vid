import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function check() {
  console.log('--- Database Diagnostic ---');
  
  // 1. Check public.users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username, email, display_name');
    
  if (usersError) {
    console.error('Error fetching users:', usersError);
  } else {
    console.log(`Found ${users.length} users in public.users:`);
    console.table(users);
  }

  // 2. Check videos (to see if they are linked correctly)
  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('id, user_id, title');
    
  if (videosError) {
    console.error('Error fetching videos:', videosError);
  } else {
    console.log(`Found ${videos.length} videos:`);
    console.table(videos);
  }
}

check();
