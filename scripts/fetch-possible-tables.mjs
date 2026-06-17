#!/usr/bin/env node
import fs from 'fs'

const envPath = new URL('../.env.local', import.meta.url).pathname
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found')
  process.exit(2)
}
const content = fs.readFileSync(envPath, 'utf8')
const get = (key) => {
  const m = content.match(new RegExp('^' + key + '=(.*)$', 'm'))
  return m ? m[1].trim() : null
}
const url = get('VITE_SUPABASE_URL')
// Prefer service role token if provided (for admin access), fall back to anon key
const key = get('VITE_SUPABASE_SERVICE_ROLE') || get('VITE_SUPABASE_ANON_KEY')
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
  process.exit(2)
}

const tables = [
  'clients', 'factures', 'encaissements', 'devis', 'achats', 'fournisseurs', 'users', 'payments', 'journal', 'produits'
]

const outDir = new URL('../scripts/output', import.meta.url).pathname
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

for (const table of tables) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (res.status === 200) {
      const data = await res.json()
      fs.writeFileSync(`${outDir}/${table}.json`, JSON.stringify(data, null, 2))
      console.log(`Saved ${table} (${data.length} rows)`)      
    } else if (res.status === 404) {
      console.log(`${table}: not found (404)`)      
    } else {
      console.log(`${table}: HTTP ${res.status}`)
      const text = await res.text()
      fs.writeFileSync(`${outDir}/${table}.http.txt`, text)
    }
  } catch (err) {
    console.error(`${table}: error`, err?.message || String(err))
  }
}
