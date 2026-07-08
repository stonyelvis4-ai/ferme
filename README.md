# FERM+

FERM+ est une plateforme SaaS premium de gestion agricole et d'elevage. Le projet est organise comme un monorepo TypeScript avec :

- `frontend/` pour l'application Next.js
- `backend/` pour l'API NestJS et Prisma
- `packages/domain-rules/` pour les regles metier partagees

## Fonctionnalites principales

- authentification admin et proprietaire
- gestion des fermes et assignation d'un proprietaire
- agenda intelligent et alertes
- elevage, pisciculture, cultures, parcelles, stocks, finances et sanitaire
- journal d'audit global
- mode hors-ligne et synchronisation
- parametres metier configurables par ferme

## Demarrage en local

Prerequis :

- Node.js 20+
- pnpm via Corepack

Installation :

```bash
corepack enable
corepack pnpm install
```

Backend :

```bash
cd backend
corepack pnpm exec prisma generate
npm run build
```

Frontend :

```bash
cd frontend
npm run build
```

Developpement :

```bash
npm run dev
```

## Variables d'environnement

Exemple local :

- `.env`
- `backend/.env`
- `frontend/.env.local`

Le frontend attend notamment `NEXT_PUBLIC_API_URL=http://localhost:4000/api`.

## Deploiement

### Vercel

- Deployer le dossier `frontend/` comme racine du projet Vercel.
- Garder le backend NestJS sur un hebergeur API separe.
- Renseigner `NEXT_PUBLIC_API_URL` avec l'URL publique du backend.

### GitHub

- Le depot inclut une CI minimale dans `.github/workflows/ci.yml`.
- Elle valide le build backend et frontend apres generation Prisma.

## Notes d'architecture

- Le role ADMIN conserve les droits d'administration et de configuration.
- Le role PROPRIETAIRE reste en lecture seule sur les donnees qui lui sont assignees.
- Les ecrans admin (utilisateurs, audit, synchronisation, parametres) sont rattaches au workflow de la ferme.
