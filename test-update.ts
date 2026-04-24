import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: tasks, error: fetchError } = await supabase.from('notificaciones_tareas').select('*').limit(1);
  if (fetchError || !tasks || tasks.length === 0) {
    console.error("Fetch error or no tasks", fetchError);
    return;
  }
  
  const tarea = tasks[0];
  console.log("Found task ID:", tarea.id);
  
  const { data, error } = await supabase
    .from('notificaciones_tareas')
    .update({ estado: 'En Revisión' })
    .eq('id', tarea.id)
    .select();
    
  if (error) {
    console.error("Update error:", error);
  } else {
    console.log("Update success:", data);
  }
}
run();
