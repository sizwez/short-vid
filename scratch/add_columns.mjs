import dotenv from 'dotenv';
dotenv.config();

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = "swtxnhcmpgozzspghisn";

async function runSQL(sql) {
    console.log(`Running SQL...`);
    // Note: The /sql endpoint of the management API is the correct one for project management
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/sql`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });
    
    const text = await res.text();
    if (res.ok) {
        console.log(`Success:`, text);
        return true;
    } else {
        console.log(`Failed:`, res.status, text);
        // Try alternate endpoint if /sql fails
        const res2 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: sql })
        });
        const text2 = await res2.text();
        if (res2.ok) {
            console.log(`Success on second try:`, text2);
            return true;
        }
        console.log(`Failed on second try:`, res2.status, text2);
        return false;
    }
}

const sql = `
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT true;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS allow_duet BOOLEAN DEFAULT true;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS allow_stitch BOOLEAN DEFAULT true;
`;

runSQL(sql);
