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

## Demarrage local

Dans un premier terminal, lance l'API :

```bash
npm run api:dev
```

Dans un second terminal, lance l'interface :

```bash
npm install
npm run dev
```

L'interface tourne sur `http://127.0.0.1:3000` et communique avec l'API locale sur le port `8012`. Les deux services sont limites a cet ordinateur par defaut.

Pour activer l'assistant agricole Orion en local, renseigne `GEMINI_API_KEY` dans `backend-laravel13-git/.env`, puis lance aussi, dans un troisième terminal :

```bash
npm run ai:proxy
```

Ce relais écoute uniquement sur `127.0.0.1:8038` et garde la clé côté machine. Il n'est utile qu'en développement local lorsque PHP ne peut pas joindre Gemini directement.

Pour une mise en production, voir aussi [docs/o2switch-deploiement.md](/C:/MES%20PROJETS/FERM+/docs/o2switch-deploiement.md) et [docs/o2switch-securite-production.md](/C:/MES%20PROJETS/FERM+/docs/o2switch-securite-production.md).

## Backend Laravel

Depuis `backend-laravel13-git/`:

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8012
```

L'API expose ses routes sur `/api/v1`.

## Notes

- Le frontend attend une API Laravel accessible via `VITE_FERM_API_URL` si elle n'est pas servie sur le meme domaine.
- Un exemple de variable frontend de production est fourni dans [.env.production.example](/C:/MES%20PROJETS/FERM+/.env.production.example).
- Les dossiers generes (`node_modules`, `dist`, `vendor`) et les artefacts locaux ne sont pas versionnes.
