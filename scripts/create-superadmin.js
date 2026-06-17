import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD

if (!supabaseUrl || !supabaseServiceKey || !superAdminEmail || !superAdminPassword) {
  console.error('ERREUR: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD sont requis.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createSuperAdmin() {
  const email = superAdminEmail
  const password = superAdminPassword

  // Supprimer si existe
  const { data: existing } = await supabase.auth.admin.listUsers()
  const user = existing?.users?.find(u => u.email === email)
  
  if (user) {
    await supabase.auth.admin.updateUserById(user.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'superadmin' }
    })
    console.log('✅ Utilisateur mis à jour:', user.id)
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'superadmin' }
    })
    if (error) console.error('❌ Erreur:', error)
    else console.log('✅ Utilisateur créé:', data.user.id)
  }

  // Mettre à jour le rôle dans la table utilisateurs (table réelle du projet)
  const { error: upsertError } = await supabase.from('utilisateurs').upsert({
    nom: 'SYSTEM ADMINISTRATOR',
    login: email,
    role: 'SUPER_ADMIN',
    email: email,
    is_actif: true
  }, { onConflict: 'email' })
  if (upsertError) console.error('❌ Erreur upsert utilisateurs:', upsertError)
  else console.log('✅ Profil utilisateurs mis à jour')
}

createSuperAdmin()
