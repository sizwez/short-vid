import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = "swtxnhcmpgozzspghisn";

async function runSQL(sql) {
    const data = JSON.stringify({ query: sql });
    
    const options = {
        hostname: 'api.supabase.com',
        port: 443,
        path: `/v1/projects/${PROJECT_REF}/database/query`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ success: true, data: body });
                } else {
                    resolve({ success: false, status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

const sql = `
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT true;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS allow_duet BOOLEAN DEFAULT true;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS allow_stitch BOOLEAN DEFAULT true;
`;

async function main() {
    console.log('Attempting to run SQL via Management API...');
    try {
        const result = await runSQL(sql);
        if (result.success) {
            console.log('✅ SQL executed successfully!');
            console.log(result.data);
        } else {
            console.error(`❌ SQL failed with status ${result.status}`);
            console.error(result.data);
            
            console.log('\nTrying alternate endpoint /sql...');
            const result2 = await runSQL(sql.replace('/database/query', '/sql'));
             if (result2.success) {
                console.log('✅ SQL executed successfully (on second try)!');
            } else {
                console.error(`❌ Second try failed too.`);
            }
        }
    } catch (err) {
        console.error('An error occurred:', err);
    }
}

main();
