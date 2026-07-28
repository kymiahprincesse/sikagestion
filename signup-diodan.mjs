import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://keyfnghpisdwwayrmlfk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleWZuZ2hwaXNkd3dheXJtbGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjA3NDUsImV4cCI6MjA5NTYzNjc0NX0.IWdepYM5NNQp23Qa8YVxwTYY7ngzwtqBW6HSFNI71EQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Signing up DIODAN...");
  const { data, error } = await supabase.auth.signUp({
    email: 'diodan@sika-industrie.com',
    password: 'SikaIndustrie2026!',
    options: {
      data: {
        nom: 'Arnaud Diodan',
        login: 'Arnaud Diodan',
        role: 'ADMIN' // or SUPER_ADMIN depending on DB
      }
    }
  });

  if (error) {
    console.error("Signup error:", error);
    return;
  }

  console.log("Signup success:", data.user?.id);
  
  if (data.user) {
    const { data: updateData, error: updateError } = await supabase
      .from('utilisateurs')
      .update({ auth_user_id: data.user.id })
      .eq('id', 13)
      .select();

    if (updateError) {
      console.error("Update error:", updateError);
    } else {
      console.log("Linked user successfully:", updateData);
    }
  }
}

run();
