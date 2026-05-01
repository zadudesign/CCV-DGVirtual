import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  const json = await res.json();
  fs.writeFileSync('openapi.json', JSON.stringify(json, null, 2));
  console.log('done');
}
main();
