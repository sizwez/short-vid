import fs from 'fs';

const ACCESS_TOKEN = "sbp_ecf42220711428453caa1a1147ea3015000cccaa";
const PROJECT_REF = "swtxnhcmpgozzspghisn";

async function runTest(endpoint) {
    console.log(`Testing endpoint: ${endpoint}`);
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 'SELECT 1;' })
    });
    
    if (res.ok) {
        console.log(`Success on ${endpoint}:`, await res.text());
        return true;
    } else {
        console.log(`Failed on ${endpoint}:`, res.status, await res.text());
        return false;
    }
}

async function run() {
    let success = await runTest('query');
    if (!success) {
        success = await runTest('sql');
    }
    if (!success) {
        success = await runTest('database/query');
    }
}
run();
