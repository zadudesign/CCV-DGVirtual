import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('notificaciones_tareas').select('*').limit(1);
  if (error) console.error("SELECT ERROR:", error);
  console.log("Sample Data:", data);
}
run();
