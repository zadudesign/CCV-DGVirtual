import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function main() {
  const { data, error } = await supabase.from('role_permissions').insert([{ role: 'test', permissions: { "courses": ["view"] } }]).select();
  console.log('insert result:', data, error);
}
main();
