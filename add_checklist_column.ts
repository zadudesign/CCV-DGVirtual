import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function run() {
  console.log('Adding checklist column to solicitudes_cursos...');
  const { data, error } = await supabase.rpc('execute_sql', { 
    sql: "ALTER TABLE solicitudes_cursos ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::JSONB;" 
  });
  
  if (error) {
    console.error('Error adding column (maybe RPC execute_sql is not enabled):', error);
  } else {
    console.log('Column added or already exists:', data);
  }
}

run();
