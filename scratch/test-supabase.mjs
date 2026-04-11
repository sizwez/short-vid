import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const res = await fetch('https://api.supabase.com/v1/projects/swtxnhcmpgozzspghisn/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer sbp_ecf42220711428453caa1a1147ea3015000cccaa`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "SELECT routine_definition FROM information_schema.routines WHERE routine_name = 'handle_new_user';"
      })
    });
    const data = await res.json();
    console.log("HANDLE USER: ", JSON.stringify(data, null, 2));

    const res2 = await fetch('https://api.supabase.com/v1/projects/swtxnhcmpgozzspghisn/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer sbp_ecf42220711428453caa1a1147ea3015000cccaa`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "SELECT * FROM information_schema.columns WHERE table_name = 'users';"
      })
    });
    const data2 = await res2.json();
    console.log("COLUMNS: ", JSON.stringify(data2.map(c => c.column_name), null, 2));
  } catch (e) { 
    console.error(e); 
  }
}
run();
