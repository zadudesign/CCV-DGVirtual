import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("URL exists?", !!supabaseUrl);
  const { data, error } = await supabase.from('notificaciones_tareas').select('id, estado').limit(1);
  if (error) { console.error("SELECT ERROR:", error); return; }
  
  if (data && data.length > 0) {
    const taskId = data[0].id;
    const oldStatus = data[0].estado;
    console.log("Old status:", oldStatus);
    
    const { error: updateError } = await supabase.from('notificaciones_tareas').update({ estado: 'En Revisión' }).eq('id', taskId);
    if (updateError) { 
      console.error("UPDATE ERROR:", updateError); 
    } else { 
      console.log("SUCCESS updating to 'En Revisión'"); 
      // Revert
      await supabase.from('notificaciones_tareas').update({ estado: oldStatus }).eq('id', taskId);
    }
  } else { 
    console.log("No data"); 
  }
}

run();
