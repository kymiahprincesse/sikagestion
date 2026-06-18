# Coolify + Supabase Deployment

## Objectif
Ce guide explique comment déployer `sikagestion` depuis Git vers Coolify en utilisant Supabase comme backend principal.

## Pourquoi Supabase
- Supabase fournit l'API de base de données, l'authentification et le temps réel.
- L'app utilise `@supabase/supabase-js` pour se connecter à Supabase.
- Pour que tout soit synchronisé et fonctionnel, configure les variables d'environnement Supabase correctement dans Coolify.

## Fichier de déploiement recommandé
Utilise le `Dockerfile` présent à la racine du projet. Coolify construira l'application avec ce Dockerfile.

### Dockerfile principal
- `FROM node:20-alpine AS builder`
- `RUN npm ci`
- `RUN npm run build`
- `FROM nginx:alpine`
- `COPY --from=builder /app/dist /usr/share/nginx/html`

## Variables d'environnement Coolify
Dans Coolify, ajoute ces variables dans la section `Environment Variables` et `Build Args`. Pour Vite, les variables `VITE_` doivent être disponibles au moment de la construction.

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPER_ADMIN_LOGIN=superadmin@sika.ci
VITE_SUPER_ADMIN_PASSWORD_HASH=sha256_hash_of_password
VITE_SIKA_SALT=sika_local_auth_salt_2024
VITE_SIKA_MGMT_SECRET=sika_industrie_admin_2026_secure
VITE_APP_URL=https://app.example.com
VITE_APP_VERSION=1.0.0
VITE_DEBUG_MODE=false
VITE_ENABLE_PUSH_NOTIFICATIONS=false
VITE_ENABLE_OFFLINE_MODE=true
# Optional
# VITE_VAPID_PUBLIC_KEY=your_vapid_key
# VITE_PDF_API_KEY=your_pdf_service_key
# VITE_EMAIL_SERVICE_API_KEY=your_email_api_key
```

### Remarques importantes
- `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont obligatoires.
- `VITE_SUPER_ADMIN_PASSWORD_HASH` doit être un hash SHA-256 du mot de passe + salt.
- `VITE_SIKA_MGMT_SECRET` est une clé secrète qui doit rester privée.
- Conserve les valeurs sensibles dans Coolify, pas dans le dépôt Git.
- Si tu modifies une variable `VITE_...`, tu dois redéployer l'image.

## Variante Supabase recommandée
1. Crée un projet Supabase.
2. Active Auth et récupère les clés au niveau de `Project Settings → API Keys`.
3. Initialise les tables et règles RLS nécessaires.
4. Vérifie les tables `utilisateurs`, `clients`, `fournisseurs`, `factures`, `encaissements`, `devis`, `journal`, etc.
5. Configure Supabase Edge Functions ou les secrets côté serveur si tu as besoin d'actions admin sécurisées.

## Déploiement Coolify
1. Connecte le dépôt Git à Coolify.
2. Sélectionne la branche `main`.
3. Utilise le `Dockerfile` de la racine.
4. Ajoute les `Build Args` suivants :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPER_ADMIN_LOGIN`
   - `VITE_SUPER_ADMIN_PASSWORD_HASH`
   - `VITE_SIKA_SALT`
   - `VITE_SIKA_MGMT_SECRET`
   - `VITE_APP_URL`
   - `VITE_APP_VERSION`
   - `VITE_DEBUG_MODE`
5. Ajoute les mêmes variables en `Environment Variables` si tu veux les conserver dans le conteneur runtime.
6. Déploie et vérifie que le service est en ligne.

## Validation après déploiement
- Ouvre l'URL de service Coolify.
- Vérifie que l'app se charge sans erreur.
- Connecte-toi avec Supabase Auth si l'authentification est activée.
- Vérifie les logs de build si la construction échoue.

## Conseils pour un déploiement propre
- Ne commite jamais tes clés secrètes.
- Utilise `.env.example` pour documenter les variables nécessaires.
- Garde `node_modules/`, `dist/` et les fichiers `.env` exclus du dépôt Git.
- Redéploie après tout changement de configuration Supabase ou de variables d'environnement.

## En résumé
- Le déploiement Coolify fonctionne avec le `Dockerfile` existant.
- Le backend doit être Supabase pour une synchronisation réelle.
- La réussite dépend de la configuration correcte de `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
- Garde la branche Git propre et déployable.
