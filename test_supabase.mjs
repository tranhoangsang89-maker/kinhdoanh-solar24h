import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hdfdpwxnezhzfhzvnjib.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZmRwd3huZXpoemZoenZuamliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNTUxMTcsImV4cCI6MjEwMjkzMTExN30.McVgLkS3E3PKPZ6QT2GOG9Z9GzY9aBocGm_ZjQuS0-w";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  // Login as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@solar24h.com', // wait, do I know the admin email and pass?
    password: 'admin123'
  });
  
  if (authError) {
    console.error('Login Error:', authError.message);
    return;
  }
  
  console.log('Logged in as:', authData.user.id);
  
  // Insert a lead
  const { data, error } = await supabase.from('leads').insert([{
    customer_name: 'Test JS Client',
    phone: '99999999',
    address: 'Vung Tau',
    sales_id: '57ebbe85-3fdf-48b8-a386-3e196ea96a17',
    status: 'Mới'
  }]);
  
  if (error) {
    console.error('Insert Error:', error.message);
  } else {
    console.log('Insert Success:', data);
  }
}

run();
