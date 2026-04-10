const SUPABASE_URL = "https://swtxnhcmpgozzspghisn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3dHhuaGNtcGdvenpzcGdoaXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM4NTkwOSwiZXhwIjoyMDcyOTYxOTA5fQ.ReXohpOhAMJWt-jRSrm1vRJJ2DsXy8pUBQxGy6pNjvc";

async function checkTable(tableName) {
    console.log(`\nChecking table: ${tableName}`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`, {
        headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
    });
    const text = await res.text();
    console.log(`  [${res.status}] ${text.substring(0, 200)}`);
    return res.ok;
}

async function run() {
    const tables = ['users', 'videos', 'follows', 'comments', 'saves', 'likes', 'notifications', 'challenges', 'reports', 'blocks', 'conversations', 'messages'];
    
    console.log("=== Checking Database Tables ===");
    const results = {};
    for (const t of tables) {
        results[t] = await checkTable(t);
    }
    
    console.log("\n=== Summary ===");
    for (const [table, exists] of Object.entries(results)) {
        console.log(`  ${table}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }
}

run();
