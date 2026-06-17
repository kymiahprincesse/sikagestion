# 🔧 Guide de Résolution - Problèmes d'Authentification SIKA

## 📋 Résumé des Problèmes

### Problème 1: Nouveau mot de passe SUPER_ADMIN non accepté
- **Email**: munokolive@gmail.com
- **Ancien mot de passe**: `1989@Sik@2026` ✅ Fonctionne
- **Nouveau mot de passe**: `77916407@#@Mu` ❌ Ne fonctionne pas
- **Raison**: Le hash SHA-256 du nouveau mot de passe n'est pas configuré

### Problème 2: Récupération de mot de passe invalide
- **Message d'erreur**: "mot de passe invalide"
- **Raison**: L'utilisateur n'est pas lié à Supabase Auth

### Problème 3: Impossible d'ajouter/voir les clients
- **Raison**: Les données ne se chargent pas de Supabase après connexion
- **Causes possibles**: Row Level Security, permissions, authentification Supabase

---

## 🔐 ÉTAPE 1: Fixer le mot de passe SUPER_ADMIN

### 1.1 Générer le hash SHA-256

Ouvrez le fichier **`generate-password-hash.html`** que nous avons créé :

```
📁 sikagestion2026ok/generate-password-hash.html
```

**Ou utilisez la console navigateur** (F12):

```javascript
// Copier-coller ce code dans la console (F12 → onglet Console)
const password = "77916407@#@Mu";
const SALT = "sika_local_auth_salt_2024";
const encoder = new TextEncoder();
const data = encoder.encode(password + SALT);
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
console.log(hash);
// Copier le résultat
```

### 1.2 Mettre à jour `.env.local`

Créez ou modifiez le fichier `.env.local` à la racine du projet :

```env
# ── SUPABASE (OBLIGATOIRE) ────────────────────────────────
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# ── AUTHENTIFICATION ─────────────────────────────────────
# IMPORTANT: Remplacez LE_HASH_GÉNÉRÉ par la valeur générée ci-dessus
VITE_SUPER_ADMIN_LOGIN=munokolive@gmail.com
VITE_SUPER_ADMIN_PASSWORD_HASH=LE_HASH_GÉNÉRÉ

# Salt pour le hashage local
VITE_SIKA_SALT=sika_local_auth_salt_2024

# Clé secrète pour la gestion des utilisateurs
VITE_SIKA_MGMT_SECRET=sika_industrie_admin_2026_secure
```

**Important**: 
- ❌ Ne commitez JAMAIS `.env.local`
- ✅ Le fichier doit être dans `.gitignore`

### 1.3 Redémarrer l'application

Après la mise à jour, redémarrez :

```bash
# Si en dev local
npm run dev

# Si en production, redéployer
```

### 1.4 Tester la connexion

1. Allez sur la page de connexion
2. Email: `munokolive@gmail.com`
3. Mot de passe: `77916407@#@Mu`
4. Cliquez sur "Se connecter"

---

## 🗄️ ÉTAPE 2: Vérifier/Fixer Supabase

### 2.1 Vérifier l'utilisateur dans la table `utilisateurs`

**Dans Supabase Dashboard** → Table Editor → `utilisateurs`:

Cherchez l'utilisateur avec l'email `munokolive@gmail.com` ou login `munokolive`:

| Champ | Valeur Attendue | Votre Valeur |
|-------|-----------------|--------------|
| `id` | 1 (ou votre ID) | _____ |
| `nom` | Votre nom | _____ |
| `login` | munokolive | _____ |
| `email` | munokolive@gmail.com | _____ |
| `role` | SUPER_ADMIN | _____ |
| `is_actif` | true | _____ |
| `auth_user_id` | (UUID de Supabase Auth) | _____ |

**❌ Si l'utilisateur n'existe pas**:
1. Cliquez "Insert" → "New Row"
2. Remplissez les champs ci-dessus
3. Sauvegardez

### 2.2 Vérifier le compte Supabase Auth

**Dans Supabase Dashboard** → Authentication → Users:

Cherchez l'utilisateur `munokolive@gmail.com`:

- **Email**: munokolive@gmail.com
- **Email Confirmed**: ✅ Doit être confirmé
- **Status**: "Active"

**❌ Si le compte n'existe pas**:
1. Cliquez "Create a new user"
2. Email: `munokolive@gmail.com`
3. Password: `77916407@#@Mu`
4. Cochez "Auto Confirm Email"
5. Créez

**⚠️ Si le compte existe**:
1. Cliquez sur l'utilisateur
2. "Reset password" → Entrez le nouveau mot de passe: `77916407@#@Mu`

### 2.3 Lier les deux comptes

Après que les deux existent, dans la table `utilisateurs`, mettez à jour le champ `auth_user_id` :

1. Ouvrez le compte dans Supabase Auth
2. Copiez son `User ID` (UUID)
3. Dans la table `utilisateurs`, mettez à jour `auth_user_id` avec cet UUID

---

## 📊 ÉTAPE 3: Vérifier Row Level Security (RLS)

**Dans Supabase Dashboard** → SQL Editor:

Exécutez cette requête pour vérifier les politiques RLS sur la table `clients` :

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual as "Policy Expression"
FROM pg_policies 
WHERE tablename = 'clients'
ORDER BY tablename, policyname;
```

### Résultat Attendu:

```
Vous devriez voir des politiques pour SELECT, INSERT, UPDATE, DELETE
```

**❌ Si aucune politique n'existe**:

Créez les politiques RLS de base :

```sql
-- ENABLE RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Politique SELECT: tout le monde peut lire
CREATE POLICY "Enable read access" ON clients
  FOR SELECT USING (true);

-- Politique INSERT: users authentifiés peuvent créer
CREATE POLICY "Enable insert access" ON clients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Politique UPDATE: users authentifiés peuvent modifier
CREATE POLICY "Enable update access" ON clients
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Politique DELETE: users authentifiés peuvent supprimer
CREATE POLICY "Enable delete access" ON clients
  FOR DELETE USING (auth.uid() IS NOT NULL);
```

---

## 🔄 ÉTAPE 4: Récupération de Mot de Passe

### Problème: "mot de passe invalide" lors de la récupération

Le système a deux modes:

**Mode 1** - Si utilisateur lié à Supabase Auth (`auth_user_id` rempli):
→ Envoie un email de récupération

**Mode 2** - Si utilisateur LOCAL SEULEMENT (pas de `auth_user_id`):
→ Affiche un code temporaire

### Solution:

Pour que la récupération fonctionne correctement:

1. ✅ Assurez-vous que votre utilisateur a un `auth_user_id` (voir ÉTAPE 2.3)
2. ✅ Assurez-vous que le compte Supabase Auth existe
3. ✅ Configurez l'email dans Supabase Dashboard:
   - Supabase → Project Settings → Auth Providers
   - Activez Email
   - Configurez l'expéditeur (Custom SMTP si needed)

---

## ✅ CHECKLIST DE VÉRIFICATION

Après chaque étape, vérifiez:

- [ ] Hash généré pour `77916407@#@Mu`
- [ ] `.env.local` mise à jour avec le hash
- [ ] Application redémarrée
- [ ] Utilisateur dans table `utilisateurs` (ID 1)
- [ ] Compte Supabase Auth créé/activé
- [ ] `auth_user_id` rempli dans la table
- [ ] Row Level Security (RLS) activé sur `clients`
- [ ] RLS policies existent pour SELECT, INSERT, UPDATE, DELETE
- [ ] Connexion avec nouveau mot de passe ✅
- [ ] Accès aux clients depuis le dashboard ✅
- [ ] Récupération mot de passe fonctionne ✅

---

## 🆘 Troubleshooting

### "Identifiants incorrects" à la connexion

```
✓ Vérifier le hash dans VITE_SUPER_ADMIN_PASSWORD_HASH
✓ Vérifier que .env.local est chargé (redémarrer npm run dev)
✓ Vérifier que le mot de passe correspond exactement: 77916407@#@Mu
```

### "Impossible de charger les clients"

```
✓ Vérifier les RLS policies sur la table `clients`
✓ Vérifier que auth_user_id est rempli dans la table utilisateurs
✓ Vérifier la clé VITE_SUPABASE_ANON_KEY
✓ Ouvrir la console (F12) → Network → Vérifier les erreurs
```

### "Email de récupération non reçu"

```
✓ Vérifier que le compte existe dans Supabase Auth
✓ Vérifier la configuration d'email dans Supabase
✓ Vérifier que auth_user_id est rempli
✓ Vérifier le dossier spam
```

---

## 📞 Questions Fréquentes

**Q: Où trouver `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`?**
R: Supabase Dashboard → Project Settings → API Keys

**Q: Le mot de passe du SUPER_ADMIN doit avoir un format spécial?**
R: Non, n'importe quel mot de passe. Vous utilisez: `77916407@#@Mu`

**Q: Puis-je changer l'email du SUPER_ADMIN?**
R: Oui, mais mettez à jour `VITE_SUPER_ADMIN_EMAIL` dans `src/config/auditConfig.js`

**Q: Les autres utilisateurs peuvent-ils se connecter?**
R: Oui, s'ils ont un compte dans la table `utilisateurs` avec `auth_user_id` rempli

---

## 🎯 Prochaines Étapes

1. Générez le hash du nouveau mot de passe
2. Mettez à jour `.env.local`
3. Redémarrez l'application
4. Vérifiez Supabase (utilisateur, auth, RLS)
5. Testez la connexion et l'accès aux données
6. Testez la récupération de mot de passe

---

**Créé le**: 2026-06-17  
**Version**: 1.0
