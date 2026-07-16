# Deploiement FERM+ sur O2switch

Ce guide cible un hebergement mutualise O2switch avec HTTPS actif.

## Architecture recommandee

Le plus simple et le plus fiable pour FERM+ :

- frontend React sur `https://app.votre-domaine.tld`
- backend Laravel sur `https://api.votre-domaine.tld`
- base PostgreSQL ou MySQL selon votre offre active

Cette architecture fonctionne bien avec les cookies HttpOnly mis en place pour l'authentification.

## Frontend

Construire le frontend avec une URL API explicite :

```env
VITE_FERM_API_URL=https://api.votre-domaine.tld/api/v1
```

Puis :

```bash
npm install
npm run build
```

Publier ensuite le contenu de `dist/` dans le dossier web du sous-domaine frontend.

## Backend Laravel

Le sous-domaine backend doit pointer vers le dossier `public/` du projet Laravel.

Si O2switch ne permet pas de pointer directement sur `public/`, il faut adapter la structure de publication cote hebergement avant mise en ligne.

### Variables recommandees

Exemple pour `backend-laravel13-git/.env` :

```env
APP_NAME="FERM+ API"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.votre-domaine.tld
APP_FRONTEND_URL=https://app.votre-domaine.tld
CORS_ALLOWED_ORIGINS=https://app.votre-domaine.tld

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ferm_plus
DB_USERNAME=utilisateur_db
DB_PASSWORD=mot_de_passe_db
DB_SSLMODE=prefer

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_PATH=/
SESSION_DOMAIN=api.votre-domaine.tld
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
API_TOKEN_COOKIE=fermplus_api_token
API_TOKEN_COOKIE_SAME_SITE=lax

LOG_LEVEL=warning
```

## Cas le plus recommande

Conserver le frontend et l'API sur deux sous-domaines du meme domaine principal :

- `app.votre-domaine.tld`
- `api.votre-domaine.tld`

Cela garde une politique de cookie simple et evite beaucoup de problemes CORS.

## Commandes backend

Depuis `backend-laravel13-git/` :

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force
php artisan optimize
```

## Permissions et stockage

Verifier au minimum :

- `storage/` accessible en ecriture
- `bootstrap/cache/` accessible en ecriture
- `APP_KEY` bien defini
- HTTPS actif avant les tests de connexion

## Verification apres mise en ligne

Tester :

1. `https://api.votre-domaine.tld/api/v1/health`
2. la page frontend
3. la connexion administrateur
4. la deconnexion
5. le rechargement de page apres connexion

## Points d'attention

- avec `SESSION_SECURE_COOKIE=true`, la connexion ne fonctionnera pas correctement en HTTP simple
- si le frontend change de domaine, il faut mettre a jour `APP_FRONTEND_URL` et `CORS_ALLOWED_ORIGINS`
- si vous utilisez MySQL au lieu de PostgreSQL, adaptez `DB_CONNECTION`, `DB_PORT` et les identifiants
