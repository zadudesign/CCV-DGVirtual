import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function run() {
  const { data, error } = await supabase.from('solicitudes_cursos').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Columns in solicitudes_cursos:', Object.keys(data[0]));
  } else {
    console.log('No data found or error:', error);
  }
}

run();
