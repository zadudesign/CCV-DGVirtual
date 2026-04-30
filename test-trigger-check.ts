import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('pg_trigger').select('*').limit(1);
  console.log("pg_trigger Error details:", error);

  const { data: d2, error: e2 } = await supabase.from('information_schema.triggers').select('*').limit(1);
  console.log("i_s Error details:", e2);
}
run();
