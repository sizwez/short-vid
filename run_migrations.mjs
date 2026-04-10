const ACCESS_TOKEN = "sbp_ecf42220711428453caa1a1147ea3015000cccaa";
const PROJECT_REF = "swtxnhcmpgozzspghisn";

async function runSQL(label, sql) {
    console.log(`\n=== ${label} ===`);
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });
    const text = await res.text();
    console.log(`[${res.status}]`, text.substring(0, 500));
    return res.ok;
}

async function run() {
    // Create follows table
    await runSQL("Create follows table", `
        CREATE TABLE IF NOT EXISTS public.follows (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
            following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(follower_id, following_id),
            CHECK (follower_id != following_id)
        );
        ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
        DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
        DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
        CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);
        CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
        CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);
    `);

    // Create saves table
    await runSQL("Create saves table", `
        CREATE TABLE IF NOT EXISTS public.saves (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
            video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, video_id)
        );
        ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own saves" ON public.saves;
        DROP POLICY IF EXISTS "Users can save videos" ON public.saves;
        DROP POLICY IF EXISTS "Users can unsave videos" ON public.saves;
        CREATE POLICY "Users can view own saves" ON public.saves FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can save videos" ON public.saves FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can unsave videos" ON public.saves FOR DELETE USING (auth.uid() = user_id);
    `);

    // Create indexes
    await runSQL("Create indexes", `
        CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
        CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
        CREATE INDEX IF NOT EXISTS idx_saves_user_id ON public.saves(user_id);
        CREATE INDEX IF NOT EXISTS idx_saves_video_id ON public.saves(video_id);
    `);

    // Create follower count trigger
    await runSQL("Create follower count function", `
        CREATE OR REPLACE FUNCTION update_follower_counts()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                UPDATE public.users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
                UPDATE public.users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
                RETURN NEW;
            ELSIF TG_OP = 'DELETE' THEN
                UPDATE public.users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
                UPDATE public.users SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
                RETURN OLD;
            END IF;
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        DROP TRIGGER IF EXISTS on_follow_change ON public.follows;
        CREATE TRIGGER on_follow_change
            AFTER INSERT OR DELETE ON public.follows
            FOR EACH ROW EXECUTE FUNCTION update_follower_counts();
    `);

    // Create challenge_participants table 
    await runSQL("Create challenge_participants", `
        CREATE TABLE IF NOT EXISTS public.challenge_participants (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
            joined_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(challenge_id, user_id)
        );
        ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Anyone can view participants" ON public.challenge_participants;
        DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;
        CREATE POLICY "Anyone can view participants" ON public.challenge_participants FOR SELECT USING (true);
        CREATE POLICY "Users can join challenges" ON public.challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
    `);

    // Create blocks table 
    await runSQL("Create blocks table", `
        CREATE TABLE IF NOT EXISTS public.blocks (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            blocker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
            blocked_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(blocker_id, blocked_id)
        );
        ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can block others" ON public.blocks;
        DROP POLICY IF EXISTS "Users can view their blocks" ON public.blocks;
        DROP POLICY IF EXISTS "Users can unblock" ON public.blocks;
        CREATE POLICY "Users can block others" ON public.blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
        CREATE POLICY "Users can view their blocks" ON public.blocks FOR SELECT USING (auth.uid() = blocker_id);
        CREATE POLICY "Users can unblock" ON public.blocks FOR DELETE USING (auth.uid() = blocker_id);
    `);

    console.log("\n=== DONE ===");
}

run();
