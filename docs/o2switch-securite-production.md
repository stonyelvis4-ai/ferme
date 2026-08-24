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
- `LOG_LEVEL=warning`
- `FILESYSTEM_DISK=local`

Ne jamais versionner :

- `.env`
- identifiants base de donnees
- `APP_KEY`
- tokens, mots de passe, secrets SMTP

## Commandes exactes cote serveur

Depuis le dossier Laravel :

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force
php artisan optimize:clear
php artisan optimize
```

Si une ancienne version a deja tourne sur le serveur, garder `optimize:clear` avant `optimize` pour eviter qu'un cache Laravel masque les nouveaux middlewares ou routes.

## Permissions

Verifier au minimum :

- `storage/` en ecriture
- `bootstrap/cache/` en ecriture
- pas de listing de dossiers publics
- le sous-domaine API pointe bien vers `public/`

## Check de securite avant ouverture

1. `https://api.votre-domaine.tld/api/v1/health` repond.
2. `APP_DEBUG` est bien a `false`.
3. la connexion admin fonctionne uniquement en HTTPS.
4. la deconnexion supprime bien la session active.
5. un compte desactive ne peut plus appeler l'API.
6. un proprietaire reste bien en lecture seule.
7. les exports rapports ne fonctionnent qu'en `pdf` ou `xlsx`.
8. les operations metier restent rattachees a la ferme connectee.

## Verifications navigateur

Dans l'onglet reseau / stockage du navigateur :

- les cookies sont marques `Secure`
- les cookies sensibles sont `HttpOnly`
- l'API n'accepte pas d'origine inconnue
- aucune erreur CORS ne remonte

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
