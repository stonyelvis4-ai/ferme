# Corrections de l'audit du 10 septembre 2026

## Corrections effectuees

- Ordre du middleware cookie corrige ; validation stricte des origines pour les ecritures par cookie et refus des formulaires HTML sur les routes publiques d'authentification.
- Expiration serveur a l'inscription et a la connexion ; limite globale Sanctum couvrant aussi les anciens jetons sans expires_at.
- Le changement de mot de passe exige maintenant toujours le mot de passe local actuel, y compris pour un compte lie a Google. Un mot de passe Google ne peut pas etre lu ni reutilise par FERM+.
- Mouvements de stock transactionnels, verrouillage ferme/article, controle des replays et cles uniques nouvelles en base. Les anciennes lignes restent intactes.
- Isolation des identifiants d'operation par ferme, module et type d'entite pour les stocks et finances.
- Recalcul serveur du total d'achat ; conservation des quantites decimales dans les recoltes/ventes ; exclusion des ventes de poissons des depenses d'alimentation.
- Validation des recoltes piscicoles par ferme ET bassin dans la requete et le service.
- Erreurs API non masquees par les snapshots ; retour a la connexion sur 401/403 ; serialisation des rafraichissements et des reprises locales.
- Identifiants UUID stables pour les creations rejouees depuis le cache local, correspondances local/serveur persistantes, middleware de replay transactionnel cote API avec rejet d'un contenu different. Le formulaire d'article utilise egalement cette protection, y compris avec une image.
- Cache PWA limite aux ressources publiques de la meme origine, refus du cache prive, absence de repli HTML pour JavaScript et preservation des caches des autres applications.
- Workflow de tests a la racine GitHub ; tests de securite inclus dans la suite backend par defaut.
- Dependances npm mises a jour ; Express et ses types retires car inutilises.
- Script de livraison par liste positive, sans donnees locales ni caches de configuration, domaines obligatoires, configuration Google et moteur DB explicites, conservation APP_KEY lors des mises a jour. Aucun deploiement distant effectue.
- Commande `php artisan ferm:verify-production` : bloque la livraison si la configuration contient le mode debug, HTTP, SQLite, un cookie de session non securise ou des origines CORS non HTTPS.
- Workflow GitHub verrouille sur les revisions exactes de ses actions externes et borne par des delais maximums.

## Verifications effectuees

- Backend : 40 tests passent, 139 assertions, SQLite en memoire.
- PWA : 4 tests passent avec node:test.
- TypeScript : npm run lint reussi.
- Compilation Vite reussie dans dist-security-final-20260911.
- npm audit : aucune vulnerabilite connue signalee apres correction.
- Syntaxe PowerShell du script de livraison : valide.
- git diff --check : aucune erreur de whitespace.
- Base locale : sauvegarde SQLite coherente par VACUUM INTO, puis application des deux migrations additives du jour ; PRAGMA integrity_check = ok apres migration.
- Kit de livraison : generation locale testee avec des domaines de preproduction, puis inspection des exclusions de secrets et de donnees locales.
- Sauvegarde hors depot : C:/Users/LENOVO/.codex/backups/fermplus/security-20260910-091227.sqlite.

## Limites avant production

Ces resultats ne constituent pas une certification de securite ni une autorisation de mise en ligne publique.

1. Tester la concurrence sur le moteur reel MySQL/PostgreSQL : SQLite ne demontre pas le comportement des verrous de lignes du serveur cible.
2. Verifier les creations en cas de coupure exactement apres le commit et avant la reponse, sur deux appareils. Le replay du cache transmet une cle stable, mais les anciens appels de creation directe ne la transmettent pas tous ; ce parcours reste a uniformiser avant de garantir l'absence totale de doublons hors ligne.
3. Executer le workflow sur GitHub apres publication du code : sa presence locale ne prouve pas une execution distante.
4. Valider Google OAuth, cookies, deconnexion et installation PWA sur les domaines HTTPS definitifs et appareils physiques.
5. Tester le kit de livraison en preproduction, les permissions, les refus HTTP de .env/.git/stockage prive, la sauvegarde ET la restauration.
6. Ne pas regenerer APP_KEY sur une installation existante. Adapter les origines CORS exactes aux domaines reels.

Aucun compte ni enregistrement metier n'a ete supprime. Aucun commit ni push effectue pendant cette correction.
