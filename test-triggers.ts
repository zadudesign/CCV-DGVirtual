import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // wait, actually service key is better
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: "SELECT trigger_name, event_object_table, action_statement FROM information_schema.triggers WHERE event_object_table = 'users' OR event_object_table = 'profiles';"
  });
  console.log("Triggers:", data);
  console.log("Error:", error);
}
run();
