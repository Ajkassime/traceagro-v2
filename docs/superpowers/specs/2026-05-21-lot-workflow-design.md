# Design Spec — Workflow de traitement des Lots

**Date :** 2026-05-21  
**Statut :** Approuvé  
**Périmètre :** Onglet LOT uniquement (module Lots de TraceAgro v2)

---

## Contexte

Lorsqu'un lot de vanille est réceptionné, les employés doivent suivre un processus de traitement structuré en plusieurs phases. Ce processus n'était pas tracé dans l'application. L'objectif est d'ajouter un suivi complet et persistant du workflow de traitement directement dans la page de détail d'un lot.

---

## Architecture générale

### Frontend
Ajout d'un système d'onglets dans `LotDetail.tsx` :

```
[Vue d'ensemble]  [Processus de réception]  [Entrée stock]
```

L'onglet existant (infos lot + timeline + sidebar) devient "Vue d'ensemble". Deux nouveaux onglets sont ajoutés.

### Backend
Nouveaux endpoints REST sous `/lots/:id/` avec authentification. Logique d'upsert (sauvegarde partielle à tout moment).

### Base de données
4 nouveaux modèles Prisma. Migration Prisma requise.

---

## Base de données

### `LotReception` — 1:1 avec Lot
Données de réception à l'arrivée du lot.

| Champ | Type | Description |
|---|---|---|
| `lotId` | String (unique) | FK vers Lot |
| `quantite` | Float? | Quantité déclarée (bon de livraison) |
| `origine` | String? | Origine géographique |
| `ristourne` | Float? | Taxe état (ristourne) |
| `poids` | Float? | Poids constaté |
| `contrePesage` | Boolean | Contre-pesage effectué |
| `emplacement` | String? | Emplacement brute / quarantaine |
| `nbSousVide` | Int? | Nombre de sous-vides prélevés (cible : 10) |
| `odeur` | String? | Observation odeur libre |
| `etatFondu` | Boolean? | Fondu (true) / Non fondu (false) |
| `moisissure` | Boolean? | Présence de moisissure |
| `validatedAt` | DateTime? | Date de validation de la réception |

### `LotWorkflowPhase` — plusieurs par Lot
Une phase de traitement (Triage, Lasoge, Mesurage, Détecteur Métaux, Sous Vide).

| Champ | Type | Description |
|---|---|---|
| `lotId` | String | FK vers Lot |
| `vanillaType` | String | `non_conditionne` ou `conditionne` |
| `phaseType` | String | `triage`, `lasoge`, `mesurage`, `detecteur_metaux`, `sous_vide` |
| `phaseIndex` | Int | 1 ou 2 (deux Lasoges dans le workflow) |
| `nomResponsable` | String? | Nom du responsable de la phase |
| `poids` | Float? | Poids traité (kg) |
| `isValidated` | Boolean | Phase validée (verrouille le formulaire) |
| `qualiteOk` | Boolean? | Validation équipe qualité (chemin conditionné uniquement) |
| `isNouvelEmploye` | Boolean | Nouvel employé → quota Mesurage à 15 kg/j/pers au lieu de 30 |
| `autres` | String? | Champ "Autres" pour Détecteur Métaux |
| `nbSachets` | Int? | Nombre de sachets (Sous Vide) |

**Contrainte unique :** `(lotId, vanillaType, phaseType, phaseIndex)`

**Quotas par phase (affichage uniquement, pas stocké) :**
- Triage : 35 kg/jour/pers
- Lasoge : 50 kg/jour/pers
- Mesurage : 30 kg/jour/pers (15 si nouvel employé)
- Sous Vide : 75 sachets/jour/pers OU 350 kg/jour/pers

### `LotTeamMember` — plusieurs par phase
Lignes du formulaire équipe (ajout/suppression dynamique).

| Champ | Type | Description |
|---|---|---|
| `phaseId` | String | FK vers LotWorkflowPhase |
| `nom` | String | Nom du membre |
| `quotas` | Float? | Quota réalisé (kg ou sachets) |
| `activite` | String? | Activité effectuée |
| `quantiteFini` | Float? | Quantité finalisée |
| `observation` | String? | Observation libre |

### `LotStockEntry` — 1:1 avec Lot
Entrée en stock après traitement complet.

| Champ | Type | Description |
|---|---|---|
| `lotId` | String (unique) | FK vers Lot |
| `specification` | String? | Spécification libre |
| `fondusPoids` | Float? | Poids des fondus |
| `fondusNbSousVide` | Int? | Nombre de sous-vides fondus |
| `tk` | Float? | Poids catégorie TK |
| `moisi` | Float? | Poids catégorie Moisi |
| `cuts` | Float? | Poids catégorie Cuts |
| `poquee` | Float? | Poids catégorie Poquée |
| `noirGourmet` | Float? | Poids catégorie Noir Gourmet |
| `noirTk` | Float? | Poids catégorie Noir TK |
| `rougeUs` | Float? | Poids catégorie Rouge US |
| `rougeEurope` | Float? | Poids catégorie Rouge Europe |
| `validatedAt` | DateTime? | Date de validation entrée stock |

---

## API

Tous les endpoints sont authentifiés (`authenticate` middleware).

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/lots/:id/reception` | Récupérer la réception du lot |
| `PUT` | `/lots/:id/reception` | Créer ou mettre à jour la réception (upsert) |
| `GET` | `/lots/:id/workflow` | Récupérer toutes les phases + membres équipe |
| `PUT` | `/lots/:id/workflow/phases/:vanillaType/:phaseType/:index` | Upsert une phase |
| `POST` | `/lots/:id/workflow/phases/:phaseId/team` | Ajouter un membre équipe |
| `PUT` | `/lots/:id/workflow/phases/:phaseId/team/:memberId` | Modifier un membre équipe |
| `DELETE` | `/lots/:id/workflow/phases/:phaseId/team/:memberId` | Supprimer un membre équipe |
| `GET` | `/lots/:id/stock-entry` | Récupérer l'entrée stock |
| `PUT` | `/lots/:id/stock-entry` | Créer ou mettre à jour l'entrée stock (upsert) |

**Règles métier :**
- Une phase avec `isValidated: true` ne peut plus être modifiée (sauf par admin)
- La réception et l'entrée stock suivent la même règle via `validatedAt`
- Le `vanillaType` du lot est défini lors de la première sauvegarde d'une phase et ne peut plus changer

---

## Frontend — Composants

### Structure des fichiers nouveaux
```
frontend/src/pages/Lots/
  ├── LotDetail.tsx                   (existant — ajout onglets)
  └── workflow/
        ├── LotWorkflow.tsx           (conteneur onglet "Processus")
        ├── ReceptionSection.tsx      (Réception)
        ├── ClassificationSection.tsx (Sélecteur type + phases)
        ├── PhaseAccordion.tsx        (1 phase : header + form + équipe)
        ├── TeamTable.tsx             (tableau équipe dynamique)
        └── LotStockEntry.tsx         (onglet "Entrée stock")
```

### Onglet "Processus de réception" — UX

**Barre de progression** en haut de l'onglet :
```
Réception → Triage → Lasoge → Mesurage → Lasoge → Détect. Métaux → Sous Vide
  [✓ vert]   [en cours]  [en attente]  ...
```

**Sélecteur de type de vanille** (une fois choisi, verrouillé) :
- Non conditionné (vanille brute)
- Conditionné (vanille déjà préparée)

**PhaseAccordion — structure visuelle :**
- Header : nom de l'étape + badge quota (ex : `35 kg/jour/pers`) + statut (✓ / en cours / en attente)
- Corps accordéon :
  - Champs : Nom responsable, Poids (kg)
  - Toggle "Nouvel employé" (Mesurage uniquement) → change le quota affiché
  - Champ "Équipe Qualité ✓" (chemin conditionné uniquement)
  - Tableau équipe : lignes dynamiques + bouton "+ Ajouter membre"
  - Bouton "Valider la phase" → `isValidated: true`, verrouille l'accordéon

**Sauvegarde :** bouton explicite "Enregistrer" par section (pas d'auto-save au blur).

### Onglet "Entrée stock" — UX
- Champ spécification libre
- Section "Fondus" : poids + nombre sous-vide
- Grille 8 catégories : TK, Moisi, Cuts, Poquée, Noir Gourmet, Noir TK, Rouge US, Rouge Europe
- Bouton "Valider l'entrée stock"

---

## Flux de données

```
Employee ouvre LotDetail
  → Onglet "Processus de réception"
  → GET /lots/:id/reception    (état réception)
  → GET /lots/:id/workflow     (phases + équipes)
  → Remplit Réception → PUT /lots/:id/reception
  → Choisit type vanille (non_conditionne ou conditionne)
  → Remplit Triage → PUT /lots/:id/workflow/phases/non_conditionne/triage/1
  → Ajoute membres équipe → POST /lots/:id/workflow/phases/:phaseId/team
  → Valide phase → PUT avec isValidated: true
  ... (répété pour chaque phase)
  → Onglet "Entrée stock" → PUT /lots/:id/stock-entry
```

---

## Hors périmètre

- Module Production (colonne droite du PDF) — différent du module Lots
- Notifications automatiques lors de validation de phase
- Export PDF du workflow
- Droits fins par phase (admin vs field_agent) — toutes les phases sont éditables par `field_agent`

---

## Fichiers impactés

**Backend :**
- `backend/src/prisma/schema.prisma` — 4 nouveaux modèles
- `backend/src/modules/lots/lots.routes.ts` — nouveaux endpoints
- `backend/src/modules/lots/lots.controller.ts` — nouveaux handlers
- `backend/src/modules/lots/lots.service.ts` — logique upsert
- `backend/src/modules/lots/lots.schema.ts` — validation Zod

**Frontend :**
- `frontend/src/pages/Lots/LotDetail.tsx` — ajout onglets
- `frontend/src/pages/Lots/workflow/` — 6 nouveaux composants
