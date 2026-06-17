import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useUtilisateursStore } from '../../store/useUtilisateursStore'

export default function CreateUser() {
  const [login, setLogin] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('USER')
  const [loading, setLoading] = useState(false)
  const fetchUtilisateurs = useUtilisateursStore(state => state.fetchUtilisateurs)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!login || !nom) return alert('Login et nom obligatoires')
    setLoading(true)
    try {
      const payload = {
        login,
        nom,
        email: email || null,
        role,
        is_actif: true
      }
      const { data, error } = await supabase.from('utilisateurs').insert(payload).select().single()
      if (error) throw error
      alert('Utilisateur créé: ' + data.id)
      fetchUtilisateurs()
      setLogin(''); setNom(''); setEmail('')
    } catch (err) {
      console.error(err)
      alert('Erreur création utilisateur: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{padding:12}}>
      <h3>Créer un utilisateur</h3>
      <form onSubmit={handleCreate}>
        <div style={{marginBottom:8}}>
          <label>Login</label><br/>
          <input value={login} onChange={e => setLogin(e.target.value)} />
        </div>
        <div style={{marginBottom:8}}>
          <label>Nom</label><br/>
          <input value={nom} onChange={e => setNom(e.target.value)} />
        </div>
        <div style={{marginBottom:8}}>
          <label>Email</label><br/>
          <input value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div style={{marginBottom:8}}>
          <label>Role</label><br/>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Création...' : 'Créer'}</button>
      </form>
    </div>
  )
}
