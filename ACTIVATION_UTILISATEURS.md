# 🔴 URGENT: Les Utilisateurs ne Sont Pas Actifs!

## 🎯 Le Problème

Vous avez créé des utilisateurs dans Supabase, mais le champ `is_actif` est **`false`** ou **`NULL`**.

**Conséquence**: ❌ **Impossible de se connecter!**

Le système vérifie:
```javascript
if (userRow && userRow.is_actif) {  // ← Si is_actif = false/NULL, refuse l'accès
  // Permettre connexion
}
```

---

## ✅ Solutions (par ordre de rapidité)

### Solution 1️⃣: Via SQL dans Supabase (30 secondes)

**Allez sur**: https://app.supabase.com → SQL Editor

Collez et exécutez:

```sql
-- Activer TOUS les utilisateurs
UPDATE utilisateurs
SET is_actif = true
WHERE is_actif IS NULL OR is_actif = false;
```

**Résultat attendu**:
```
Query executed successfully
X rows updated
```

✅ **Tous les utilisateurs sont maintenant actifs!**

---

### Solution 2️⃣: Via Script Node (1 minute)

Exécutez:

```bash
node scripts/activate-all-users.mjs
```

Le script va:
1. ✅ Vérifier l'état actuel des utilisateurs
2. ✅ Activer tous les utilisateurs inactifs
3. ✅ Afficher le résumé des changements

---

### Solution 3️⃣: Manuellement dans l'UI (3 minutes)

**Supabase Dashboard** → Table Editor → `utilisateurs`:

Pour chaque utilisateur:
1. Cliquez sur la ligne
2. Colonne `is_actif`: Changez de `false` à `true` ou cochez la case
3. Sauvegardez

---

## 🔍 Vérifier le Résultat

Après activation, vérifiez dans Supabase:

**SQL Editor**:
```sql
SELECT id, nom, login, email, is_actif 
FROM utilisateurs 
ORDER BY id;
```

**Résultat attendu**:
```
id  nom              login        email                    is_actif
1   Votre Nom        munokolive   munokolive@gmail.com     true
2   Admin            admin        admin@sika.ci            true
...
```

✅ Tous les `is_actif` doivent être **`true`**

---

## 🧪 Tester la Connexion

Après avoir activé les utilisateurs:

1. Allez sur la page de connexion
2. Email: `munokolive@gmail.com`
3. Mot de passe: `77916407@#@Mu` (ou votre mot de passe)
4. Cliquez "Se connecter"

**Résultat attendu**: ✅ Vous accédez au dashboard!

---

## 📊 Pourquoi les Utilisateurs sont Inactifs?

**Causes courantes**:

1. **Créés avec SQL INSERT sans spécifier `is_actif`**:
   ```sql
   -- ❌ INCORRECT - is_actif sera NULL
   INSERT INTO utilisateurs (nom, login, email)
   VALUES ('Nom', 'login', 'email@sika.ci');

   -- ✅ CORRECT
   INSERT INTO utilisateurs (nom, login, email, is_actif)
   VALUES ('Nom', 'login', 'email@sika.ci', true);
   ```

2. **Migration/Dump de données ancienne**:
   - Ancien système utilisait `is_actif = false` par défaut

3. **Bug dans la création d'utilisateur**:
   - Le champ `is_actif` n'était pas fourni lors de l'insertion

---

## 🔒 Après Activation

**Important**: Assurez-vous aussi que:

- ✅ Les utilisateurs ont un **`auth_user_id`** (lien avec Supabase Auth)
- ✅ Le compte Supabase Auth existe (dans Authentication → Users)
- ✅ `.env.local` est correctement configuré

Consultez **TROUBLESHOOTING_COMPLET.md** pour un diagnostic complet.

---

## 🎯 Résumé Quick Fix

```bash
# Option 1: Via Script
node scripts/activate-all-users.mjs

# Option 2: Manuellement dans Supabase SQL
# UPDATE utilisateurs SET is_actif = true;

# Option 3: UI Supabase Table Editor
# Modifier chaque ligne → is_actif = true
```

---

**Essayez Solution 1️⃣ en premier** (le plus rapide!) ⚡

Des questions? Consultez [TROUBLESHOOTING_COMPLET.md](TROUBLESHOOTING_COMPLET.md) 📚
