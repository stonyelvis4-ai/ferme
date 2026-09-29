# PROJECT_STATUS.md

## Projet
FERM+ — plateforme web de gestion agricole et d'élevage.

## Version
0.1.0

## Fonctionnalités terminées
- Interface React/TypeScript responsive et installable (PWA).
- API Laravel 13 : authentification, rôles administrateur/propriétaire et isolation stricte par ferme.
- Noyau opérationnel : tâches, agenda, alertes, audit, stocks, finances, sanitaire et paramètres.
- Modules métier : pondeuses, cultures, pisciculture et infrastructures.
- Rapports, export et synchronisation applicative.
- Correctifs de sécurité de septembre 2026 : cookies HttpOnly, contrôle d'origine, expiration des jetons, idempotence, opérations stock/finance transactionnelles et cache PWA restrictif.

## Fonctionnalités en développement
- Validation de préproduction sur HTTPS et moteur PostgreSQL ou MySQL réel.
- Tests de parcours navigateur de bout en bout et validation sur appareils physiques.

## Bugs connus
- Aucun défaut reproductible localement après les contrôles du 29 septembre 2026.
- La configuration locale échoue volontairement à `ferm:verify-production` : elle utilise un environnement de développement, HTTP, SQLite et CORS localhost.

## Dette technique
- La couverture frontend est encore limitée aux tests du service worker ; les parcours métier UI doivent être automatisés.
- La concurrence doit être éprouvée sur le moteur de base de données de production.
- Les opérations hors ligne doivent toutes employer les clés d'idempotence persistantes.

## Prochaines tâches
1. Relire, commiter et pousser les corrections locales de sécurité et de livraison.
2. Vérifier l'exécution du workflow GitHub après le push.
3. Préparer une préproduction HTTPS, restaurable, avec la base cible.
4. Réaliser les smoke tests : connexion, déconnexion, OAuth Google, PWA, isolation des fermes et refus des fichiers privés.
5. Ajouter des tests end-to-end pour les flux critiques.

## Dernières modifications
- Audit ORION coordonné le 29 septembre 2026.
- Contrôles locaux validés : TypeScript, build Vite, 4 tests PWA et 41 tests Laravel (145 assertions).
- Documentation de livraison O2switch alignée sur le script actuel : conservation d'APP_KEY, vérification production et checklist préproduction.
