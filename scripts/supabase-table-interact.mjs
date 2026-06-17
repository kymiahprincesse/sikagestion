#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('ERREUR: VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (ou SUPABASE_SERVICE_ROLE_KEY) sont nécessaires.')
  console.error('  - Source ton .env.local ou exporte ces variables avant d’exécuter le script.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const args = process.argv.slice(2)
const command = args[0]

const usage = `Usage:
  node ./scripts/supabase-table-interact.mjs status
  node ./scripts/supabase-table-interact.mjs list <table> [limit]
  node ./scripts/supabase-table-interact.mjs count <table>
  node ./scripts/supabase-table-interact.mjs get <table> <id>
  node ./scripts/supabase-table-interact.mjs delete <table> <id>
  node ./scripts/supabase-table-interact.mjs upsert <table> '<json>' [onConflict]

Examples:
  node ./scripts/supabase-table-interact.mjs status
  node ./scripts/supabase-table-interact.mjs list clients 20
  node ./scripts/supabase-table-interact.mjs count utilisateurs
  node ./scripts/supabase-table-interact.mjs get clients 123
  node ./scripts/supabase-table-interact.mjs delete achats 456
  node ./scripts/supabase-table-interact.mjs upsert utilisateurs '{"login":"admin@example.com","role":"SUPER_ADMIN"}' login
`

async function run() {
  if (!command || command === 'help') {
    console.log(usage)
    return
  }

  if (command === 'status') {
    const { error } = await supabase.from('clients').select('id', { head: true, count: 'exact' })
    if (error) {
      console.error('❌ Status Supabase échoué :', error.message)
      process.exit(1)
    }
    console.log('✅ Connexion à Supabase OK')
    console.log(`URL: ${supabaseUrl}`)
    return
  }

  const table = args[1]
  if (!table) {
    console.error('ERREUR: nom de table requis.\n')
    console.log(usage)
    process.exit(1)
  }

  if (command === 'list') {
    const limit = Number(args[2]) || 20
    const { data, error } = await supabase.from(table).select('*').limit(limit)
    if (error) {
      console.error('❌ Erreur list:', error.message)
      process.exit(1)
    }
    console.log(JSON.stringify(data, null, 2))
    return
  }

  if (command === 'count') {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) {
      console.error('❌ Erreur count:', error.message)
      process.exit(1)
    }
    console.log(`✅ ${table} count: ${count}`)
    return
  }

  if (command === 'get') {
    const id = args[2]
    if (!id) {
      console.error('ERREUR: identifiant requis pour get.\n')
      console.log(usage)
      process.exit(1)
    }
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle()
    if (error) {
      console.error('❌ Erreur get:', error.message)
      process.exit(1)
    }
    console.log(JSON.stringify(data, null, 2))
    return
  }

  if (command === 'delete') {
    const id = args[2]
    if (!id) {
      console.error('ERREUR: identifiant requis pour delete.\n')
      console.log(usage)
      process.exit(1)
    }
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      console.error('❌ Erreur delete:', error.message)
      process.exit(1)
    }
    console.log(`✅ Ligne supprimée de ${table} id=${id}`)
    return
  }

  if (command === 'upsert') {
    const json = args[2]
    const onConflict = args[3]
    if (!json) {
      console.error('ERREUR: JSON requis pour upsert.\n')
      console.log(usage)
      process.exit(1)
    }
    let payload
    try {
      payload = JSON.parse(json)
    } catch (err) {
      console.error('ERREUR: JSON invalide pour upsert:', err.message)
      process.exit(1)
    }
    const options = onConflict ? { onConflict } : undefined
    const { error } = await supabase.from(table).upsert(payload, options)
    if (error) {
      console.error('❌ Erreur upsert:', error.message)
      process.exit(1)
    }
    console.log(`✅ Upsert effectué sur ${table}`)
    return
  }

  console.error('ERREUR: commande inconnue.\n')
  console.log(usage)
  process.exit(1)
}

run().catch(err => {
  console.error('ERREUR FATALE:', err.message)
  process.exit(1)
})
