import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const email = 'munokolive@gmail.com'
const password = '1989@Sik@2026'

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
