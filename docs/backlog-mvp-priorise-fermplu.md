# Backlog MVP Priorise - FERM+

## 1. Objectif du MVP

L'objectif du MVP est de livrer une premiere version utilisable, coherente et interconnectee, sans chercher a couvrir tous les domaines agricoles en meme temps.

Le MVP doit demontrer que FERM+ sait gerer :

- la ferme ;
- les utilisateurs ;
- les operations ;
- les taches ;
- l'agenda ;
- les stocks ;
- les finances ;
- la tracabilite.

Le premier module metier retenu pour ce MVP est **Pondeuses**, car il permet de valider rapidement un flux interconnecte simple et demonstratif :

`lot -> production -> stock -> vente -> revenu -> dashboard -> audit`

## 2. Perimetre du MVP

### Inclus dans le MVP

- authentification ;
- gestion de la ferme ;
- administrateur et proprietaire ;
- parametres de base ;
- taches ;
- agenda ;
- stocks ;
- finances ;
- audit ;
- alertes simples ;
- dashboard de base ;
- module Pondeuses ;
- interface responsive mobile et desktop.

### Hors MVP initial

- pisciculture ;
- cultures ;
- elevage complet multi-especes ;
- rapports avances ;
- exports complets PDF/Excel ;
- pieces jointes ;
- geolocalisation ;
- mode hors ligne complet avec gestion avancee des conflits.

## 3. Priorisation Produit

## P0 - Fondations obligatoires

Sans ces elements, le reste ne doit pas commencer.

### 3.1 Authentification

- inscription administrateur ;
- connexion ;
- deconnexion ;
- changement de mot de passe ;
- gestion de session securisee.

### 3.2 Ferme

- creation de la ferme par l'administrateur ;
- unicite : un administrateur ne peut creer qu'une seule ferme ;
- modification des informations de la ferme ;
- affichage des informations de la ferme.

### 3.3 Utilisateurs

- creation du compte proprietaire par l'administrateur ;
- activation/desactivation du proprietaire ;
- connexion proprietaire ;
- restriction stricte des droits du proprietaire.

### 3.4 Securite multi-tenant

- toutes les donnees doivent etre liees a `farmId` ;
- controle d'acces par ferme ;
- impossibilite de consulter les donnees d'une autre ferme.

### 3.5 Parametres de base

- devise ;
- unites ;
- priorites de taches ;
- statuts de taches ;
- categories simples de stock ;
- categories simples de finances.

## P1 - Noyau operationnel

C'est le coeur du MVP.

### 3.6 Taches

- creer une tache manuelle ;
- modifier une tache ;
- changer le statut ;
- definir priorite, echeance, rappel ;
- lister les taches par statut ;
- afficher les taches en retard.

### 3.7 Agenda

- afficher un calendrier mensuel et hebdomadaire ;
- creer un evenement manuel ;
- lier un evenement a une tache ;
- deplacer un evenement ;
- synchroniser date tache <-> agenda si les deux sont lies.

### 3.8 Audit

Journalisation automatique des actions importantes :

- connexion ;
- creation/modification ferme ;
- creation/modification utilisateur ;
- creation/modification tache ;
- mouvements de stock ;
- transactions financieres ;
- operations metier Pondeuses.

### 3.9 Alertes simples

- tache en retard ;
- stock sous seuil minimum ;
- evenement du jour ;
- centre d'alertes simple.

## P2 - Modules transverses

Ces modules doivent etre stabilises avant la logique metier complete.

### 3.10 Stocks

- creer un article ;
- definir categorie, unite, seuil minimum ;
- enregistrer une entree de stock ;
- enregistrer une sortie de stock ;
- afficher le stock disponible ;
- consulter l'historique des mouvements ;
- generer une alerte de seuil minimum.

### 3.11 Finances

- creer une depense ;
- creer un revenu ;
- categoriser une transaction ;
- afficher l'historique ;
- afficher total depenses / revenus ;
- conserver la source d'une transaction.

## P3 - Premier module metier : Pondeuses

Ce module est le demonstrateur principal du MVP.

### 3.12 Lots de pondeuses

- creer un lot ;
- renseigner l'effectif initial ;
- renseigner la date d'entree ;
- definir le statut du lot ;
- consulter la fiche lot.

### 3.13 Production journaliere

- enregistrer la production d'oeufs ;
- enregistrer les oeufs conformes ;
- enregistrer les oeufs casses ;
- enregistrer les pertes.

### 3.14 Interconnexion production -> stock

- une production validee cree automatiquement une entree en stock d'oeufs ;
- le mouvement de stock doit conserver sa source metier.

### 3.15 Vente d'oeufs

- enregistrer une vente ;
- selectionner la quantite vendue ;
- verifier le stock disponible ;
- creer automatiquement une sortie de stock ;
- creer automatiquement un revenu ;
- enregistrer automatiquement l'audit.

### 3.16 Rentabilite simple

- afficher les recettes liees aux ventes d'oeufs ;
- afficher les depenses directes saisies ;
- afficher un solde simple du module.

## P4 - Dashboard MVP

Le dashboard doit rester une synthese, jamais une source de verite independante.

### 3.17 Dashboard de base

- nombre de lots actifs ;
- stock d'oeufs disponible ;
- ventes recentes ;
- revenus du mois ;
- depenses du mois ;
- taches du jour ;
- taches en retard ;
- alertes actives.

Chaque carte du dashboard doit rediriger vers le module correspondant.

## 4. Plan par Sprint

### Sprint 1

- authentification ;
- administrateur ;
- ferme ;
- proprietaire ;
- securite multi-tenant ;
- parametres de base.

### Sprint 2

- taches ;
- agenda ;
- audit de base ;
- alertes simples.

### Sprint 3

- stock ;
- finances ;
- lien de source sur mouvements et transactions.

### Sprint 4

- lots de pondeuses ;
- production journaliere ;
- entree automatique en stock.

### Sprint 5

- vente d'oeufs ;
- sortie automatique de stock ;
- revenu automatique ;
- dashboard MVP.

## 5. User Stories MVP

- En tant qu'administrateur, je veux creer ma ferme afin d'avoir un espace prive unique.
- En tant qu'administrateur, je veux creer le compte proprietaire afin qu'il consulte les donnees de la ferme.
- En tant qu'administrateur, je veux creer une tache afin d'organiser une operation.
- En tant qu'utilisateur, je veux voir mes taches dans l'agenda afin de planifier le travail.
- En tant qu'administrateur, je veux creer un article de stock afin de suivre les quantites disponibles.
- En tant qu'administrateur, je veux enregistrer une depense ou un revenu afin de suivre ma tresorerie.
- En tant qu'administrateur, je veux creer un lot de pondeuses afin de suivre sa production.
- En tant qu'administrateur, je veux enregistrer la production d'oeufs afin d'alimenter automatiquement le stock.
- En tant qu'administrateur, je veux enregistrer une vente d'oeufs afin de decrementer le stock et creer un revenu.
- En tant qu'administrateur, je veux consulter les alertes afin d'identifier les urgences.
- En tant qu'administrateur, je veux consulter le dashboard afin d'avoir une vue rapide de l'activite.
- En tant qu'administrateur, je veux que les actions importantes soient auditees afin de garantir la tracabilite.

## 6. Criteres de reussite du MVP

Le MVP est considere comme reussi si :

- un administrateur peut creer sa ferme et son proprietaire ;
- les donnees sont isolees par ferme ;
- une tache et un evenement agenda peuvent etre geres ;
- un stock et une finance peuvent etre suivis ;
- un lot de pondeuses peut produire des oeufs ;
- une vente d'oeufs met automatiquement a jour le stock, le revenu, le dashboard et l'audit ;
- les alertes de base fonctionnent ;
- l'application est exploitable sur mobile et desktop.

## 7. Ce qu'il ne faut pas faire dans le MVP

- lancer tous les modules metier en meme temps ;
- developper les rapports avances trop tot ;
- traiter le mode hors ligne complet avant stabilisation des operations online ;
- multiplier les roles utilisateurs ;
- construire un dashboard independant des donnees sources.

## 8. Conclusion

Le MVP de FERM+ doit etre reduit, coherent et interconnecte.

L'approche recommandee est :

1. poser les fondations securite et multi-tenant ;
2. stabiliser le noyau operationnel ;
3. mettre en place les modules transverses ;
4. valider un premier flux metier complet avec Pondeuses ;
5. afficher la synthese dans le dashboard.

Cette approche permet de livrer une premiere version utile, lisible et techniquement stable, sans disperser le projet.
