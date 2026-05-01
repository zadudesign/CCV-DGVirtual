import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('role_permissions').select('role, permissions').limit(1);
  console.log('Test role, permissions:', error);
  const { data: d2, error: e2 } = await supabase.from('role_permissions').select('role, module, actions').limit(1);
  console.log('Test role, module, actions:', e2);
}
main();
