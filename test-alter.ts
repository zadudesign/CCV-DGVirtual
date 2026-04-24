import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: "ALTER TYPE estado_tarea ADD VALUE IF NOT EXISTS 'En Revisión';" });
  console.log(error || data || 'No errors altering type');
}
run();
