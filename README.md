# FERM+

FERM+ est une application de gestion agricole et d'elevage avec:
- un frontend React + TypeScript + Vite
- une API Laravel 13 dans `backend-laravel13-git`
- des modules metier pour fermes, taches, alertes, stocks, finances, sanitaire, cultures, pisciculture, pondeuses et rapports

## Structure retenue

- `src/` : interface web
- `public/` : assets publics, dont les sons d'alerte
- `backend-laravel13-git/` : backend Laravel principal
- `docs/` : documents fonctionnels et backlog MVP

Le dossier `laravel13/` de prototype et les outils PHP embarques ont ete retires pour alleger le depot.

## Frontend

```bash
npm install
npm run dev
```

Le frontend tourne par defaut sur `http://localhost:3000`.

## Backend Laravel

Depuis `backend-laravel13-git/`:

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

L'API expose ses routes sur `/api/v1`.

## Notes

- Le frontend attend une API Laravel accessible via `VITE_FERM_API_URL` si elle n'est pas servie sur le meme domaine.
- Les dossiers generes (`node_modules`, `dist`, `vendor`) et les artefacts locaux ne sont pas versionnes.
