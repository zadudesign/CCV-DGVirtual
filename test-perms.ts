import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('role_permissions').select('*');
  console.log('role_permissions:', JSON.stringify(data), error);
  const { data: d2, error: e2 } = await supabase.from('roles_permissions').select('*');
  console.log('roles_permissions:', JSON.stringify(d2), e2);
}
main();
