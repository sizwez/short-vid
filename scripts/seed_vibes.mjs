import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const MOCK_VIDEOS = [
  {
    title: 'Amapiano Dance Challenge',
    caption: 'Killing it at the braai! #amapiano #dance #southafrica',
    video_url: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.mp4',
    thumbnail_url: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.jpg',
    hashtags: ['amapiano', 'dance', 'southafrica'],
    is_public: true,
    is_active: true,
    likes: 1250,
    views: 5400,
  },
  {
    title: 'Sunday Braai Vibes',
    caption: 'Nothing beats a Mzansi Sunday. #braai #vibes #meat',
    video_url: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.mp4',
    thumbnail_url: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.jpg',
    hashtags: ['braai', 'vibes', 'meat'],
    is_public: true,
    is_active: true,
    likes: 890,
    views: 3200,
  },
  {
    title: 'Cape Town Sunset',
    caption: 'Magic at Signal Hill. #capetown #sunset #mothercity',
    video_url: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.mp4',
    thumbnail_url: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.jpg',
    hashtags: ['capetown', 'sunset', 'mothercity'],
    is_public: true,
    is_active: true,
    likes: 2100,
    views: 8900,
  },
  {
    title: 'Taxi Rank Chronicles',
    caption: 'Only in Jozi! 😂 #johannesburg #taxi #mzansi',
    video_url: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.mp4',
    thumbnail_url: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.jpg',
    hashtags: ['johannesburg', 'taxi', 'mzansi'],
    is_public: true,
    is_active: true,
    likes: 4500,
    views: 15000,
  }
];

async function seed() {
  console.log('🚀 Seeding Mzansi Vibe Data...');
  
  // 1. Get a demo user ID (first one found)
  const { data: users, error: userError } = await supabase.from('users').select('id').limit(1);
  
  if (userError || !users?.length) {
    console.error('❌ No users found in DB. Please sign up at least one user first.');
    return;
  }
  
  const userId = users[0].id;
  
  // 2. Insert videos
  const videosToInsert = MOCK_VIDEOS.map(v => ({
    ...v,
    user_id: userId,
  }));
  
  const { error: videoError } = await supabase.from('videos').insert(videosToInsert);
  
  if (videoError) {
    console.error('❌ Error seeding videos:', videoError.message);
  } else {
    console.log('✅ Successfully seeded ' + MOCK_VIDEOS.length + ' videos with SA vibes!');
  }
}

seed();
