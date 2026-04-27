import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const userId = '97a035d8-87ab-4247-a66c-7024b5ce2b28';
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
  } else {
    console.log('User found:', data);
  }
}

checkUser();
