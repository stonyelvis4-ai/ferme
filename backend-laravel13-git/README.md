# FERM+ Backend Laravel

API Laravel 13 du projet FERM+.

## Role du backend

Ce backend expose l'API metier consommee par le frontend React:
- authentification administrateur / proprietaire
- fermes, utilisateurs, taches, alertes, agenda
- stocks, finances, sanitaire, cultures, pisciculture, pondeuses
- audit et rapports

Base d'URL API:

```text
/api/v1
```

Endpoint de sante:

```text
GET /api/v1/health
```

## Prerequis production

- PHP 8.3+
- Composer
- PostgreSQL recommande
- extension OpenSSL
- extension PDO correspondant a la base
- serveur web Nginx ou Apache, ou plateforme type Railway / Render / VPS

## Installation locale

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --force
php artisan serve
```

## Variables importantes

Exemple minimal pour la production:

```env
APP_NAME="FERM+ API"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.ton-domaine.com
APP_FRONTEND_URL=https://app.ton-domaine.com
CORS_ALLOWED_ORIGINS=https://app.ton-domaine.com

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ferm_plus
DB_USERNAME=postgres
DB_PASSWORD=secret
DB_SSLMODE=prefer
```

Pour un hebergement mutualise O2switch, voir aussi [docs/o2switch-deploiement.md](/C:/MES%20PROJETS/FERM+/docs/o2switch-deploiement.md).

## Deploiement

Apres configuration des variables d'environnement:

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force
php artisan optimize
```

Ou via le script:

```bash
composer deploy
```

## Frontend separe

Si le frontend est deploye sur un autre domaine:
- renseigner `APP_FRONTEND_URL`
- renseigner `CORS_ALLOWED_ORIGINS`
- configurer dans le frontend `VITE_FERM_API_URL`

Exemple:

```env
VITE_FERM_API_URL=https://api.ton-domaine.com/api/v1
```

## Verification avant mise en ligne

- `APP_DEBUG=false`
- `APP_KEY` defini
- migrations executees
- dossier `storage/` accessible en ecriture
- file de queue configuree si necessaire
- `GET /api/v1/health` repond `ok`
