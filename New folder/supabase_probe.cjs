require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async function(){
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_KEY;
  if (!url || !serviceKey) {
    console.log('Supabase probe: MISSING SUPABASE_URL or SUPABASE_SERVICE_ROLE/SUPABASE_KEY');
    return;
  }

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1) Try admin users list if available
  try {
    if (sb.auth && sb.auth.admin && typeof sb.auth.admin.listUsers === 'function') {
      const r = await sb.auth.admin.listUsers({ per_page: 1 });
      if (r && (r.data || r.users)) {
        const count = Array.isArray(r.data) ? r.data.length : (Array.isArray(r.users) ? r.users.length : 'unknown');
        console.log('Supabase probe: admin.listUsers() OK — returned', count, 'record(s)');
        return;
      }
    }
  } catch (err) {
    console.log('Supabase probe: admin.listUsers() ERROR —', err.message || err.toString());
  }

  // 2) Fallback: try simple authenticated RPC or table select on common public table 'users' (non-destructive)
  const candidates = ['users', 'profiles'];
  for (const tbl of candidates) {
    try {
      const r = await sb.from(tbl).select('id').limit(1).throwOnError();
      if (r && Array.isArray(r.data)) {
        console.log(`Supabase probe: SELECT from '${tbl}' OK — rows: ${r.data.length}`);
        return;
      }
    } catch (err) {
      // swallow — table might not exist or permission denied
      // console.log(`probe ${tbl} failed: ${err.message}`);
    }
  }

  // 3) As last resort report that client connected but no accessible public tables found
  try {
    // Try a safe HEAD to the project URL
    const fetchRes = await fetch(url, { method: 'HEAD' });
    console.log('Supabase probe: HEAD to project URL returned', fetchRes.status);
  } catch (err) {
    console.log('Supabase probe: final HEAD check failed —', err.message || err.toString());
  }
})();
