import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
// Use anon key, though usually we can't query information_schema, let's try to insert to see errors.
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('role_permissions').insert([{ 'role': 'admin', 'module': 'courses', 'actions': ['view'] }]).select();
  console.log(data, error);
}
main();
