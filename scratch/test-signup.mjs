import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const randomStr = Math.random().toString(36).substring(7);
  console.log("Trying to sign up user with username: test_" + randomStr);
  const { data, error } = await supabase.auth.signUp({
    email: `test_${randomStr}@test.com`,
    password: 'password123',
    options: {
      data: {
        username: `test_${randomStr}`,
        display_name: 'Test User'
      }
    }
  });

  if (error) {
    console.error("SIGNUP ERROR:", error.message);
  } else {
    console.log("SUCCESS! User ID:", data.user?.id);
  }
}

run();
