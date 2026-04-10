import fs from 'fs';

const ACCESS_TOKEN = "sbp_ecf42220711428453caa1a1147ea3015000cccaa";
const PROJECT_REF = "swtxnhcmpgozzspghisn";

async function runSQL(sql) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });
    
    if (res.ok) {
        console.log(`Success!`, await res.text());
        return true;
    } else {
        console.log(`Failed HTTP ${res.status}:`, await res.text());
        return false;
    }
}

async function run() {
    await runSQL("SELECT table_type FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';");
}

run();
