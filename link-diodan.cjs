const VITE_SUPABASE_URL = 'https://keyfnghpisdwwayrmlfk.supabase.co';
const VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleWZuZ2hwaXNkd3dheXJtbGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjA3NDUsImV4cCI6MjA5NTYzNjc0NX0.IWdepYM5NNQp23Qa8YVxwTYY7ngzwtqBW6HSFNI71EQ';
const MGMT_SECRET = 'sika_industrie_admin_2026_secure';

async function run() {
  try {
    const res = await fetch(`${VITE_SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`,
        'x-sika-admin': MGMT_SECRET,
      },
      body: JSON.stringify({
        action: 'link-auth',
        id: 13, // ID #013
        email: 'diodan@sika-industrie.com',
        password: 'SikaIndustrie2026!'
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      console.log(await res.json());
    } else {
      console.log(await res.text());
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
}

run();
