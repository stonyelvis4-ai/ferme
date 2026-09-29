# Audit de securite avant deploiement - FERM+

Date : 2026-09-10. Decision : mise en ligne publique deconseillee avant correction des P1.

## Perimetre et preuves

Revue du code Laravel/React, routes, middleware, services metier, cache PWA,
configuration de tests et script de livraison. Aucun changement du code applicatif,
aucune migration ni modification des donnees reelles pendant cet audit.

- Suite existante : 27 tests passent, 97 assertions.
- Trois nouveaux controles dans `backend-laravel13-git/tests/Audit/DeploymentSecurityAuditTest.php` : trois echecs reproduits sur SQLite en memoire.
- Build Vite : reussi, sortie isolee `dist-security-audit-20260910`.
- Composer audit : aucune alerte signalee.
- npm audit complet : 5 paquets signales, 1 severite haute et 4 moderees. Il ne s'agit pas de cinq attaques demontrees sur le site.
- Couverture de lignes non mesuree pendant cet audit.

La suite existante n'etablit ni un pourcentage de securite ni une couverture metier a 99 %.
Les affirmations precedentes de couverture CI active et de securisation achevee etaient trop affirmatives.

## P1 - Connexion par cookie bloquee (reproduit)

Sources : `bootstrap/app.php:17`, `app/Http/Middleware/PromoteApiTokenCookie.php:12` dans le backend.

L'ordre effectif retourne par le routeur est Authenticate:sanctum, SubstituteBindings,
PromoteApiTokenCookie, EnsureActiveAccount, EnsureFarmTenant, EnsureAdmin.
L'authentification s'execute donc avant la conversion du cookie en Authorization.
Le frontend utilise exclusivement ce cookie et conserve un simple marqueur local.
Le test avec un jeton valide dans le cookie recoit 401 au lieu de 200.
Les tests Sanctum::actingAs contournent ce parcours et ne detectaient pas le probleme.

Correction : declarer une priorite de middleware appropriee ou adopter le flux SPA
Sanctum complet. Tester login, acces avec cookie, expiration et logout sur le build reel.

## P1 - Protection CSRF absente du flux cookie (revue statique)

Sources : `bootstrap/app.php`, `routes/api.php:46`, `PromoteApiTokenCookie.php`.

Les routes acceptent une authentification automatiquement jointe par cookie sans
validation CSRF ni controle explicite de l'origine. CORS ne protege pas contre
l'execution d'un formulaire simple ; SameSite=lax limite les attaques cross-site,
mais ne bloque pas un sous-domaine hostile du meme site.
L'exploitation navigateur n'a pas ete reproduite : le defaut d'ordre du middleware
ci-dessus bloque actuellement le parcours cookie. La correction de connexion doit
inclure cette protection, sinon elle rendra les ecritures par cookie accessibles sans CSRF.

Correction : session SPA Sanctum avec jeton CSRF, ou protection equivalente testee
sur les methodes d'ecriture, incluant origine absente, invalide et sous-domaine non autorise.

## P1 - Jeton d'inscription sans expiration serveur (reproduit)

Source : `app/Http/Controllers/Api/AuthController.php:72`.

registerAdmin cree un jeton sans expires_at. La configuration Sanctum chargee par
defaut contient expiration=null. L'expiration du cookie a deux heures ne revoque pas
le jeton serveur : une copie compromise peut continuer a fonctionner.
Le test confirme expires_at=null, contrairement au parcours de connexion ordinaire.

Correction : expiration explicite commune a inscription/login/Google, configuration
compatible avec config:cache et test de refus apres expiration. Purger les jetons anciens.

## P1 - Collisions d'identifiants entre modules (reproduit)

Sources : `app/Services/StockService.php:178`, `FinanceService.php:15`,
`LayerService.php:244`, `PiscicultureService.php:320`, `CulturesService.php:230`.

La recherche de doublon ne compare que farm_id et operation_id. Plusieurs modules
envoient simplement leur identifiant SQL, par exemple "1". La premiere production
d'oeufs et la premiere recolte peuvent donc etre confondues dans une meme ferme.
Le test confirme que le deuxieme article reste a 0 au lieu de recevoir 10 unites.
Les tests metier precedents isolaient chaque module et ne detectaient pas cette collision.

Correction : cle d'operation avec espace de noms, verification du contenu rejoue,
contrainte unique adaptee et tests croisant plusieurs modules dans la meme ferme.

## P1 - Stocks non proteges contre les ecritures concurrentes (revue statique)

Sources : `app/Services/StockService.php:171`, `StockController.php:108`, migration
`2026_07_13_000003_create_stock_and_finance_tables.php`.

recordMovement lit le stock puis ecrit la nouvelle valeur sans verrou ni transaction
propre. La route directe l'appelle sans transaction englobante. Deux sorties simultanees
peuvent valider le meme stock initial et perdre une mise a jour. Les operation_id ne
possedent pas de contrainte unique. Un echec tardif peut laisser mouvement et stock
enregistres sans l'ensemble des effets financiers/audit.
Le test de sortie excessive existant est sequentiel et ne garantit pas cette propriete.

Correction : transaction atomique, verrou de ligne et idempotence au niveau base.
Verifier sur le moteur de production avec deux connexions simultanees.

## P1 - Liaison piscicole inter-fermes insuffisamment validee (revue statique)

Sources : `app/Http/Requests/Pisciculture/StoreFishSaleRequest.php:22`,
`app/Services/PiscicultureService.php:389`.

fish_pond_id est rescope dans le service, mais fish_harvest_id est valide par un
exists global puis copie sans verifier ferme et bassin. Un administrateur peut
associer sa vente a la recolte d'une autre ferme dont il connait l'identifiant.
Ce constat porte sur une association interdite, pas une lecture demontree de toute la ferme.

Correction : existence scopee par ferme ET bassin, validation dans le service,
test avec deux fermes et test avec deux bassins d'une meme ferme.

## P1 - Synchronisation masque les erreurs d'authentification (revue statique)

Sources : `src/services/fermApi.ts:232`, `src/services/fermApi.ts:251`, `src/App.tsx:784`.

Promise.allSettled transforme tous les refus et erreurs en data:undefined. Une session
revoquee ou une API en panne peut ainsi donner un chargement apparemment reussi depuis
le cache. Les creations locales rejouees n'ont pas toutes de cle idempotente stable.
Les correspondances entre identifiants locaux et serveur ne durent qu'un appel.
Les rafraichissements focus/visibilite/intervalle peuvent se chevaucher.

Correction : distinguer 401/403 des indisponibilites, invalider la session,
serialiser la reprise, conserver les operations et leurs correspondances durablement.
Tester deux sessions, coupure apres commit serveur et avant reponse, puis reconnexion.

## P1 - Total d'achat fourni par le client accepte (revue statique)

Sources : `app/Http/Requests/Stock/StoreStockItemRequest.php`, `StockService.php:294`.

purchase_total_cost accepte une valeur arbitraire positive ou nulle et la normalisation
la prefere au calcul quantite x prix. L'API peut creer un stock valorise et une depense
incorrecte, voire aucune depense si le client envoie zero.

Correction : calcul obligatoire serveur, montant client ignore ou compare, tests de manipulation.

## P2 - Pertes de precision et depenses piscicoles parasites (revue statique)

Sources : `PiscicultureService.php:315,365`, `CulturesService.php:225,285`, `StockService.php:233`.

Les kg recoltes et vendus sont arrondis a un entier avant mouvement, alors que les
ventes et montants acceptent des decimales. Une vente de 0,4 kg peut ne rien deduire.
De plus, toute sortie source_module=pisciculture cree une depense d'alimentation,
y compris une vente de poissons si le stock Poissons possede un cout unitaire positif.

Correction : conserver la precision decimale et distinguer explicitement alimentation et vente.

## P2 - Cache PWA trop large (revue statique)

Source : `public/sw.js:21`.

Tout GET hors chemin /api/ est mis en cache sans liste de ressources autorisees,
controle d'origine ou de statut HTTP. Une reponse privee future hors /api/ serait
conservee ; le repli retourne du HTML meme pour une ressource JS/image absente.
L'activation supprime aussi les caches d'autres applications sur la meme origine.
Le numero de cache fixe et skipWaiting compliquent les mises a jour coherentes.

Correction : precache versionne des ressources publiques uniquement, exclusion des
origines externes et des reponses privees, repli HTML reserve aux navigations.
Verifier installation, mise a jour et deconnexion dans un navigateur de production.

## P2 - CI declaree mais inactive dans ce depot (confirme par emplacement)

Source : `backend-laravel13-git/.github/workflows/tests.yml:1`.

Aucun workflow ne se trouve a la racine `.github/workflows`. GitHub ne decouvre pas
ceux du sous-projet Laravel. Ajouter main aux branches ne corrige pas cet emplacement.
Le workflow n'a par ailleurs pas de working-directory pour ce monorepo.

Correction : workflow racine, repertoire backend explicite, tests/build frontend,
rapports de couverture et execution GitHub effectivement observee.
Reference : https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows.

## P2 - Dependances npm signalees (mesure du jour)

npm audit : browserslist (haute), baseline-browser-mapping, qs, body-parser et express
(moderees). Les dependances d'outillage ne sont pas automatiquement exploitables dans
un frontend statique. Aucune exposition Express n'a ete demontree sur le serveur cible.

Correction : mises a jour compatibles, suppression des dependances inutilisees,
rebuild et nouveau controle. Composer audit ne signale aucune vulnerabilite connue.

## P1/P2 - Livraison O2switch a durcir (revue statique)

Source : `scripts/prepare-o2switch-package.ps1:60`.

La liste backendExclude n'est pas utilisee. Robocopy exclut packages.php et services.php,
mais pas bootstrap/cache/config.php : si un cache de configuration existe, il peut
contenir des secrets et etre livre. Les uploads de storage/app et variantes .env ne
sont pas exclus globalement. Aucune fuite effective de ces fichiers n'est affirme ici.
Le script genere un domaine exemple compile dans le frontend, impose PostgreSQL,
omet GOOGLE_CLIENT_ID dans le backend genere et recommande key:generate sans distinguer
premiere installation et mise a jour. Regenerer APP_KEY sur une installation existante
invalide les donnees chiffrees avec l'ancienne cle.

Correction : liste positive des fichiers livrables, exclusion de tous caches/secrets,
parametres de production obligatoires, conservation APP_KEY lors des mises a jour,
sauvegarde et restauration testees avant migration. Pas de lancement de ce script pendant cet audit.

## Validation restante avant autorisation de mise en ligne

1. Corriger les P1 et faire passer les trois tests de reproduction.
2. Ajouter les tests multi-fermes, CSRF, replay et concurrence indiques.
3. Verifier login/Google/logout et isolation des caches sur le build installe.
4. Executer et observer le workflow a la racine sur GitHub.
5. Refaire le paquet pour les vrais domaines et le moteur DB de l'offre O2switch.
6. En preproduction : verifier HTTPS, racine API sur public/, refus HTTP de .env/.git/stockage prive, cookies Secure/HttpOnly, debug desactive, permissions, sauvegarde/restauration.

Non verifie ici : compte O2switch, DNS/TLS reels, configuration Apache effective,
pentest externe, Google OAuth sur domaine final, concurrence sur MySQL/PostgreSQL,
installation physique Android/iOS et synchronisation entre appareils reels.

Commande des reproductions (depuis le backend) :
`php vendor/bin/phpunit tests/Audit/DeploymentSecurityAuditTest.php`

Ces tests sont separes des suites par defaut ; ils restent volontairement rouges
jusqu'a correction des defauts. Aucun commit ni push effectue pendant cet audit.
