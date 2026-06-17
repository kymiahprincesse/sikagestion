# 🆘 RÉSOLUTION COMPLÈTE - Problèmes d'Authentification SIKA

**Créé**: 2026-06-17  
**Pour**: munokolive@gmail.com  
**Mot de passe**: 77916407@#@Mu  

---

## 📊 Vue d'ensemble des problèmes

| # | Problème | État | Priority |
|---|----------|------|----------|
| 1 | Nouveau mot de passe ne fonctionne pas | 🔴 Critique | P1 |
| 2 | Récupération mot de passe invalide | 🟡 Haut | P2 |
| 3 | Impossible de voir/ajouter les clients | 🔴 Critique | P1 |

---

## 🚀 QUICK START (5 minutes)

### Étape 1️⃣ : Générer le hash

Ouvrez votre navigateur → F12 → Onglet Console → Collez:

```javascript
// Générer le hash SHA-256 du mot de passe
const pwd = "77916407@#@Mu";
const salt = "sika_local_auth_salt_2024";
const enc = new TextEncoder();
const data = enc.encode(pwd + salt);
const buf = await crypto.subtle.digest('SHA-256', data);
const arr = Array.from(new Uint8Array(buf));
const hash = arr.map(b => b.toString(16).padStart(2, '0')).join('');
console.log("VITE_SUPER_ADMIN_PASSWORD_HASH=" + hash);
console.log("Copie automatique...");
navigator.clipboard.writeText(hash);
```

Vous verrez quelque chose comme:
```
VITE_SUPER_ADMIN_PASSWORD_HASH=a1b2c3d4e5f6...
✅ Copié dans le presse-papiers
```

### Étape 2️⃣ : Mettre à jour `.env.local`

Créez/modifiez le fichier `.env.local` à la racine:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
VITE_SUPER_ADMIN_LOGIN=munokolive@gmail.com
VITE_SUPER_ADMIN_PASSWORD_HASH=LE_HASH_GÉNÉRÉ_CI_DESSUS
VITE_SIKA_SALT=sika_local_auth_salt_2024
VITE_SIKA_MGMT_SECRET=sika_industrie_admin_2026_secure
```

### Étape 3️⃣ : Redémarrer l'app

```bash
# Si en dev
npm run dev

# Si en production, redéployer
```

### Étape 4️⃣ : Tester

- Email: `munokolive@gmail.com`
- Mot de passe: `77916407@#@Mu`
- Cliquez "Se connecter"

---

## 🔍 Diagnostic Complet (20 minutes)

### A. Vérifier la Configuration

Exécutez le script de diagnostic:

```bash
node scripts/diagnose-auth.mjs
```

Cela va vérifier:
- ✅ `.env.local` présent
- ✅ URL Supabase valide
- ✅ Hash SHA-256 valide (64 chars hex)
- ✅ Clé API Supabase présente

### B. Vérifier Supabase (Dashboard)

1. **Table `utilisateurs`**:
   - Allez sur: https://app.supabase.com → Table Editor → `utilisateurs`
   - Cherchez la ligne avec `email = munokolive@gmail.com`
   - Vérifiez que tous ces champs sont remplis:

```
id: 1 (ou un chiffre)
nom: Votre nom
login: munokolive
email: munokolive@gmail.com
role: SUPER_ADMIN
is_actif: true
auth_user_id: UUID_D_UN_COMPTE_AUTH
```

**❌ Si la ligne n'existe pas**: Créez-la (Insert → New Row)

2. **Compte Supabase Auth**:
   - Allez sur: https://app.supabase.com → Authentication → Users
   - Cherchez l'utilisateur `munokolive@gmail.com`

```
Email: munokolive@gmail.com
Email Confirmed: ✅ OUI
Status: Active
```

**❌ Si le compte n'existe pas**: 
1. Cliquez "Generate user with password"
2. Email: `munokolive@gmail.com`
3. Password: `77916407@#@Mu`
4. Cochez "Auto confirm email"
5. Créez

**⚠️ Si le compte existe mais le mot de passe est ancien**:
1. Cliquez sur l'utilisateur
2. "Reset password" → Entrez `77916407@#@Mu`

3. **Lier les comptes**:
   - Copiez le `User ID` du compte Auth (format UUID)
   - Dans la table `utilisateurs`, mettez à jour le champ `auth_user_id` avec cet UUID

### C. Vérifier Row Level Security (RLS)

**Dans Supabase Dashboard** → SQL Editor:

Collez et exécutez:

```sql
-- Vérifier les politiques RLS existantes
SELECT 
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('clients', 'utilisateurs', 'factures', 'devis')
ORDER BY tablename, policyname;
```

**Résultat attendu**: Devrait voir des politiques pour `clients`, `utilisateurs`, etc.

**❌ Si aucune politique n'existe sur `clients`**:

Créez-les:

```sql
-- Activer RLS sur la table clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Politique SELECT (lecture)
CREATE POLICY "Allow read for authenticated" ON clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Politique INSERT (création)
CREATE POLICY "Allow insert for authenticated" ON clients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Politique UPDATE (modification)
CREATE POLICY "Allow update for authenticated" ON clients
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Politique DELETE (suppression)
CREATE POLICY "Allow delete for authenticated" ON clients
  FOR DELETE USING (auth.uid() IS NOT NULL);
```

---

## 📱 Test de Récupération de Mot de Passe

### Flux Normal:

1. Page de connexion → "Mot de passe oublié ?"
2. Entrez email: `munokolive@gmail.com`
3. Cliquez "Générer mon code"

**Deux cas possibles**:

**Cas A** - Utilisateur lié à Supabase Auth (`auth_user_id` rempli):
- ✉️ Email de récupération envoyé
- Consultez votre boîte mail
- Cliquez le lien (ouvert en 24h)
- Entrez le nouveau mot de passe

**Cas B** - Utilisateur LOCAL SEULEMENT (pas de `auth_user_id`):
- 🔐 Code affiché sur l'écran
- Copiez le code (6 caractères)
- Entrez le code + nouveau mot de passe
- Appuyez sur "Réinitialiser"

### ❌ Erreur "mot de passe invalide"?

**Causes possibles**:

1. **L'utilisateur n'existe pas dans la table `utilisateurs`**
   - Solution: Créer l'utilisateur (voir section B ci-dessus)

2. **Email incorrect ou ne correspond pas**
   - Solution: Vérifier que l'email est exactement `munokolive@gmail.com`

3. **Pas d'email pour cet utilisateur dans la table**
   - Solution: Ajouter l'email dans le champ `email`

---

## 🐛 Troubleshooting par Symptôme

### Symptôme: "Identifiants incorrects"

```
🔍 Vérification:
1. ✅ Hash généré? (64 caractères hex)
2. ✅ .env.local mise à jour?
3. ✅ Application redémarrée?
4. ✅ Mot de passe exact: 77916407@#@Mu
5. ✅ Pas d'espaces avant/après
```

### Symptôme: "Impossible de charger les clients"

```
🔍 Vérification:
1. ✅ Connecté avec succès?
2. ✅ Table `clients` existe dans Supabase?
3. ✅ RLS activé mais politiques permettent la lecture?
4. ✅ Clé API valide (VITE_SUPABASE_ANON_KEY)?
5. ✅ Ouvrir Console (F12) → Network → Chercher erreurs

   Erreur courante: "Invalid API key"
   → Vérifier la clé dans .env.local
```

### Symptôme: "Email de récupération non reçu"

```
🔍 Vérification:
1. ✅ Compte Auth existe dans Supabase?
2. ✅ Email confirmé (Email Confirmed = ✅)?
3. ✅ Utiliser mode CODE si pas d'email configuré
4. ✅ Vérifier dossier SPAM/Promotions
5. ✅ Supabase → Project Settings → Email → SMTP configuré?
```

### Symptôme: "Je peux voir les données en local mais pas en Supabase"

```
🔍 Vérification:
1. ✅ Vérifier que les données existent vraiment dans Supabase
   → Allez dans Table Editor → Clients
   → Devrait voir au moins 1 client
   
2. ✅ Si table vide, synchroniser manuellement:
   → Dashboard → Click "SYNC Supabase"
   
3. ✅ Vérifier l'authentification:
   → Console (F12) → Vérifier que auth.currentUser existe
```

---

## 📋 Checklist Finale

Avant de considérer que tout fonctionne:

- [ ] Hash généré et copié
- [ ] `.env.local` mise à jour
- [ ] Application redémarrée
- [ ] Connexion avec `munokolive@gmail.com` / `77916407@#@Mu` ✅
- [ ] Dashboard s'affiche
- [ ] Able to see client list (ou vide si base vide)
- [ ] Able to create a new client
- [ ] Able to access other modules
- [ ] Mot de passe oublié fonctionne
- [ ] Recovered password works

---

## 🎓 Comprendre le Système

### Architecture d'Authentification SIKA:

```
┌─────────────────────────────────────────┐
│  FORMULAIRE DE CONNEXION (Login.jsx)    │
└──────────────┬──────────────────────────┘
               │
      ┌────────▼──────────┐
      │  Authentification  │
      │  (useAuthStore)    │
      └────────┬───────────┘
               │
       ┌───────┴────────┐
       │                │
   ┌───▼────┐      ┌───▼────────┐
   │ SUPER   │      │ SUPABASE   │
   │ ADMIN   │      │ AUTH       │
   │ LOCAL   │      │ (Utilisateurs)
   │         │      │
   │ Hash    │      │ Email +
   │ SHA-256 │      │ Password
   └───────┬─┘      └───┬────────┘
           │             │
           └──────┬──────┘
                  │
       ┌──────────▼──────────┐
       │  Dashboard Access   │
       │  + Data Loading     │
       └─────────────────────┘
```

### Deux Modes de Compte:

**Mode 1: SUPER_ADMIN (Fantôme)**
- Login: `munokolive@gmail.com`
- Password Hash: SHA-256 dans `.env.local`
- Aucune trace (aucun log d'audit)
- Accès d'urgence / Administrateur système

**Mode 2: UTILISATEUR NORMAL**
- Login + Email dans table `utilisateurs`
- Password dans Supabase Auth (sécurisé)
- Logs d'audit complets
- Rôles et permissions

---

## 📞 Support

Si les problèmes persistent:

1. **Vérifiez les logs**:
   - Ouvrez F12 → Console
   - Vérifiez les erreurs affichées

2. **Vérifiez Supabase Status**:
   - https://status.supabase.com
   - Peut être un problème serveur

3. **Contact Support SIKA**:
   - Developer: Christian ANISONOK
   - Phone: +225 07 77 91 64 07

---

## 📚 Ressources Utiles

- **Guide Complet**: `GUIDE_AUTHENTIFICATION_FIX.md`
- **Hash Generator**: `generate-password-hash.html`
- **Diagnostic Tool**: `scripts/diagnose-auth.mjs`
- **Supabase Docs**: https://supabase.com/docs/guides/auth
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security

---

**Last Updated**: 2026-06-17  
**Version**: 1.0  
**Status**: Documentation Complète ✅
