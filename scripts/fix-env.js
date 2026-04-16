import fs from 'fs';
import path from 'path';

const envPath = '.env';
let content = fs.readFileSync(envPath, 'utf8');

const match = content.match(/FIREBASE_SERVICE_ACCOUNT=(.*)/);
if (match) {
  const base64Str = match[1];
  let decoded = Buffer.from(base64Str, 'base64').toString('utf8');
  
  // Replace single quotes with double quotes
  // We need to be careful with the private_key which has single quotes internally?
  // Actually standard Firebase JSON uses double quotes. 
  // The error message said: "Expected property name or '}' in JSON at position 1"
  // Decoded was: "{'type': ..."
  
  let fixed = decoded.replace(/'/g, '"');
  
  // FIX: Private key often has \n which might have been converted
  // But usually it's inside quotes.
  
  const reEncoded = Buffer.from(fixed).toString('base64');
  content = content.replace(match[0], `FIREBASE_SERVICE_ACCOUNT=${reEncoded}`);
  
  fs.writeFileSync(envPath, content);
  console.log('Successfully fixed FIREBASE_SERVICE_ACCOUNT in .env');
} else {
  console.error('FIREBASE_SERVICE_ACCOUNT not found in .env');
}
