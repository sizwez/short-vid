
const SUPABASE_URL = "https://swtxnhcmpgozzspghisn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3dHhuaGNtcGdvenpzcGdoaXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM4NTkwOSwiZXhwIjoyMDcyOTYxOTA5fQ.ReXohpOhAMJWt-jRSrm1vRJJ2DsXy8pUBQxGy6pNjvc";

async function runSQL(label, sql) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_db_status`, {
            method: 'POST',
            headers: {
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query_str: sql })
        });
        
        // If RPC doesn't exist, we'll try a different approach or fail gracefully
        if (res.status === 404) {
             // Fallback: Try querying information_schema via standard REST if possible
             // However PostgREST doesn't easily allow raw SQL without an RPC
             return { error: "RPC check_db_status not found. Cannot run raw SQL." };
        }
        
        return await res.json();
    } catch (err) {
        return { error: err.message };
    }
}

// Since I might not have a generic SQL RPC, I'll use the REST API to explore tables and columns
async function getTables() {
    // PostgREST exposes the schema via the root endpoint
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
    });
    return await res.json();
}

async function getRLSPolicies() {
    // Policies usually aren't exposed via PostgREST unless there's an RPC
    // But we can check if we can query for them anyway
    console.log("Attempting to fetch RLS policies via custom RPC if available...");
    // ...
}

async function run() {
    console.log("=== SUPABASE DATABASE INTROSPECTION ===");
    
    try {
        const schema = await getTables();
        if (schema.definitions) {
            console.log("\nFound Tables in Schema:");
            Object.keys(schema.definitions).forEach(table => {
                const columns = Object.keys(schema.definitions[table].properties || {});
                console.log(`- ${table} (${columns.length} columns)`);
                // console.log(`  Columns: ${columns.join(', ')}`);
            });
        } else {
            console.log("Could not retrieve schema definitions. Trying individual table checks...");
        }
        
        // Check row counts for key tables
        const tablesToCount = ['users', 'videos', 'comments', 'likes', 'follows'];
        console.log("\nRow Counts:");
        for (const table of tablesToCount) {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count`, {
                headers: {
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                    'Prefer': 'count=exact'
                }
            });
            const range = res.headers.get('content-range');
            const count = range ? range.split('/')[1] : 'unknown';
            console.log(`- ${table}: ${count} rows`);
        }

    } catch (err) {
        console.error("Introspection failed:", err);
    }
}

run();
