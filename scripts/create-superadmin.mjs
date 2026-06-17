import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD

if (!supabaseUrl || !supabaseServiceKey || !superAdminEmail || !superAdminPassword) {
  console.error('ERREUR: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD sont requis.')
  process.exit(1)
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
)

const email = superAdminEmail
const password = superAdminPassword

const { data: list } = await supabase.auth.admin.listUsers()
const existing = list?.users?.find(u => u.email === email)

if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { role: 'superadmin' }
  })
  if (error) console.error('ERREUR:', error.message)
  else console.log('✅ Compte mis à jour! ID:', existing.id)
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'superadmin' }
  })
  if (error) console.error('ERREUR:', error.message)
  else console.log('✅ Compte créé! ID:', data.user.id)
}
