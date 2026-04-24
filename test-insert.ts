import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('notificaciones_tareas').insert({
    titulo: 'Test constraint',
    estado: 'En Revisión'
  }).select();
  
  if (error) {
    console.log("INSERT ERROR:", error);
  } else {
    console.log("INSERT SUCCESS, deleting...");
    await supabase.from('notificaciones_tareas').delete().eq('id', data[0].id);
  }
}
run();
