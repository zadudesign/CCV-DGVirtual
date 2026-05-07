import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function run() {
  const { data, error } = await supabase.from('solicitudes_cursos').select('*');
  console.log('Error:', error);
  if (data && data.length > 0) {
    console.log('Columns in solicitudes_cursos:', Object.keys(data[0]));
  } else if (data) {
    console.log('Data is empty array');
  }
}

run();
