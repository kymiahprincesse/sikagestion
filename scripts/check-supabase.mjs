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
const key = get('VITE_SUPABASE_ANON_KEY')
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
  process.exit(2)
}

try {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  const res = await fetch(`${url}/rest/v1/`, {
    method: 'HEAD',
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: controller.signal,
  })
  clearTimeout(timeout)
  console.log('HTTP', res.status)
  if (res.status >= 200 && res.status < 500) {
    console.log('Supabase: connected')
    process.exit(0)
  }
  console.error('Supabase: unexpected status', res.status)
  process.exit(1)
} catch (err) {
  const msg = err?.name === 'AbortError' ? 'timeout' : (err?.message || String(err))
  console.error('Supabase: error', msg)
  process.exit(1)
}
