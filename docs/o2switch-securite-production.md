# Durcissement Production FERM+ sur O2switch

Ce guide complete [docs/o2switch-deploiement.md](/C:/MES%20PROJETS/FERM+/docs/o2switch-deploiement.md) avec une checklist orientee securite.

## Objectif

Mettre en ligne FERM+ avec :

- HTTPS actif partout
- `APP_DEBUG=false`
- cookies securises
- isolation stricte par ferme
- surface d'attaque minimale
- verification post-deploiement

## Architecture recommandee

- frontend : `https://app.votre-domaine.tld`
- API Laravel : `https://api.votre-domaine.tld`
- base de donnees separee avec identifiants dedies

Eviter de servir le frontend et le backend depuis le meme dossier public.

## Variables d'environnement recommandees

Base de travail : [backend-laravel13-git/.env.o2switch.example](/C:/MES%20PROJETS/FERM+/backend-laravel13-git/.env.o2switch.example)

Points critiques :

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://api.votre-domaine.tld`
- `APP_FRONTEND_URL=https://app.votre-domaine.tld`
- `CORS_ALLOWED_ORIGINS=https://app.votre-domaine.tld`
- `SESSION_SECURE_COOKIE=true`
- `SESSION_HTTP_ONLY=true`
- `SESSION_SAME_SITE=lax`
- `API_TOKEN_COOKIE_SAME_SITE=lax`
- `FERM_ALLOW_PUBLIC_REGISTRATION=false`
- `LOG_LEVEL=warning`
- `FILESYSTEM_DISK=local`

Laissez l'inscription publique fermee : le tout premier administrateur peut initialiser l'application, puis les comptes suivants sont crees depuis l'administration. N'activez `FERM_ALLOW_PUBLIC_REGISTRATION=true` que pour un service dont l'inscription libre est un choix explicite.

Ne jamais versionner :

- `.env`
- identifiants base de donnees
- `APP_KEY`
- tokens, mots de passe, secrets SMTP

## Commandes exactes cote serveur

Depuis le dossier Laravel, une fois le fichier `.env` de production renseigne :

```bash
composer install --no-dev --optimize-autoloader --no-interaction
# Installation neuve uniquement : php artisan key:generate --force
# Mise a jour : conserver l'APP_KEY existante ; ne jamais la regenerer.
php artisan migrate --force
php artisan optimize:clear
php artisan ferm:verify-production
php artisan optimize
```

Si une ancienne version a deja tourne sur le serveur, garder `optimize:clear` avant `optimize` pour eviter qu'un cache Laravel masque les nouveaux middlewares ou routes.

Avant toute migration, sauvegarder la base, les fichiers `storage/` et l'`APP_KEY`, puis tester une restauration. Le sous-domaine API doit pointer exclusivement vers `public/`, jamais vers la racine Laravel.

## Permissions

Verifier au minimum :

- `storage/` en ecriture
- `bootstrap/cache/` en ecriture
- pas de listing de dossiers publics
- le sous-domaine API pointe bien vers `public/`
- le serveur interdit l'execution PHP sous `public/storage/` (les justificatifs de stock sont des fichiers utilisateurs)

Les images de stock sont acceptees uniquement en JPEG, PNG ou WebP, puis renommees par le serveur selon leur type de contenu. Ne rendez jamais un dossier de televersement executable, meme si les fichiers sont controles par l'application.

## Check de securite avant ouverture

1. `https://api.votre-domaine.tld/api/v1/health` repond.
2. `APP_DEBUG` est bien a `false`.
3. la connexion admin fonctionne uniquement en HTTPS.
4. la deconnexion supprime bien la session active.
5. un compte desactive ne peut plus appeler l'API.
6. un proprietaire reste bien en lecture seule.
7. les exports rapports ne fonctionnent qu'en `pdf` ou `xlsx`.
8. les operations metier restent rattachees a la ferme connectee.
9. l'endpoint `/api/v1/users` est inaccessible a un proprietaire.
10. `php artisan ferm:verify-production` reussit avant l'ouverture publique.

## Verifications navigateur

Dans l'onglet reseau / stockage du navigateur :

- les cookies sont marques `Secure`
- les cookies sensibles sont `HttpOnly`
- l'API n'accepte pas d'origine inconnue
- aucune erreur CORS ne remonte
- les reponses API contiennent `X-Content-Type-Options`, `X-Frame-Options`, une politique de referer et une politique de permissions

## Hygiene operationnelle

- utiliser un mot de passe fort et unique pour chaque admin
- changer tous les mots de passe de test avant production
- ne pas reutiliser les comptes de demonstration
- sauvegarder la base avant chaque migration de production
- verifier les journaux Laravel apres mise en ligne

## Regressions a tester apres chaque mise a jour

- connexion / deconnexion
- creation admin
- creation proprietaire
- creation tache
- creation transaction finance
- creation article de stock
- export rapport
- synchronisation tablette / ordinateur
