# Baseline Technique & Reproductibilité — TraceAgro V2

> **Document établi dans le cadre du LOT 0**  
> Date : 05 Octobre 2026  
> Dépôt : `Ajkassime/traceagro-v2`  
> Branche de référence : `master`  
> Commit de référence : `626ede3951b777b9e6033b6f887964a8e55f0a1e`

---

## 1. Environnement & Versions

### Système & Outils
* **Système d'exploitation :** macOS Darwin 24.6.0 (x86_64 / arm64 via Rosetta)
* **Node.js actif :** `v26.5.0` (chemin `/usr/local/bin/node`)
* **npm actif :** `12.0.2`
* **PostgreSQL local :** `localhost:5432` (Base : `traceagro_v2`)

### Analyse des contradictions de versions Node.js
* **`README.md` (ligne 8) :** mentionne `Node.js 18+`.
* **`backend/package.json` (lignes 9-11) :** spécifie `"engines": { "node": "20.x" }`.
* **Comportement sous Node 26.5.0 :** `npm` génère des avertissements `EBADENGINE Unsupported engine (required: 20.x, current: v26.5.0)`.
* **Recommandation :** Aligner formellement la CI et la documentation sur Node 20 LTS (Iron) avec un fichier `.nvmrc` à la racine contenant `20`.

---

## 2. État Git Initial

* **Branche :** `master`
* **Commit HEAD :** `626ede3951b777b9e6033b6f887964a8e55f0a1e` (`feat(ui): intégration de l'identité Terre & Registre`)
* **Arbre de travail initial :** `clean`, synchronisé avec `origin/master`.
* **Fichiers non suivis initiaux :** Aucun.

---

## 3. Tooling & Commandes Reproductibles

Pour garantir une détection objective de toute régression lors des lots fonctionnels (Lots 1 à 12), les 4 commandes standardisées suivantes ont été configurées et validées sur chaque sous-projet :

| Commande | Backend (`backend/`) | Frontend (`frontend/`) |
| :--- | :--- | :--- |
| `npm run lint` | `eslint src --ext .ts` | `eslint src --ext ts,tsx` |
| `npm run typecheck` | `tsc --noEmit` | `tsc --noEmit` |
| `npm test` | `node --test` (Test runner natif Node.js) | `node --test` |
| `npm run build` | `prisma generate --schema src/prisma/schema.prisma && tsc --skipLibCheck` | `tsc && vite build` |

### Détail des installations d'outillage dans le Lot 0
* **Frontend ESLint :** Le script `eslint src --ext ts,tsx` était préexistant dans `frontend/package.json`, mais le binaire `eslint` et sa configuration étaient manquants (`sh: eslint: command not found`). Ajout d'`eslint` (^8.57.0), `@typescript-eslint/parser` et `@typescript-eslint/eslint-plugin`, ainsi que du fichier minimal `frontend/.eslintrc.cjs`.
* **Backend ESLint :** Création du script `lint` et du fichier `backend/.eslintrc.cjs`.
* **Typecheck :** Ajout de `tsc --noEmit` dans les deux `package.json`.
* **Tests :** Ajout de `node --test` (exécute le test runner natif en attente de la suite de tests complète du Lot 10).

---

## 4. Résultats des Vérifications Initiales

### Backend (`cd backend`)
1. **`npm ci` :**
   * Statut : **PASS** (182 packages installés, audit propre, 1 vulnérabilité modérée préexistante sur multer).
   * Avertissement npm allowScripts : scripts bloqués pour `@prisma/client`, `prisma`, `@prisma/engines`, `esbuild`. Résolu via post-install/scripts dédiés.
2. **`npx prisma validate --schema src/prisma/schema.prisma` :**
   * Statut : **PASS** (`The schema at src/prisma/schema.prisma is valid 🚀`).
3. **`npx prisma generate --schema src/prisma/schema.prisma` :**
   * Statut : **PASS** (`✔ Generated Prisma Client (v5.22.0) in 328ms`).
4. **`npm run typecheck` (`tsc --noEmit`) :**
   * Statut : **PASS** (0 erreur TypeScript).
5. **`npm run lint` (`eslint src --ext .ts`) :**
   * Statut : **PASS AVEC WARNINGS** (0 erreur, 126 avertissements, majoritairement liés à des types `any` dans les controllers et services existants).
6. **`npm test` (`node --test`) :**
   * Statut : **PASS** (0 tests, 0 suites, temps d'exécution 67ms).
7. **`npm run build` :**
   * Statut : **PASS** (`tsc --skipLibCheck` compile sans erreur).

### Frontend (`cd frontend`)
1. **`npm ci` :**
   * Statut : **PASS** (314 packages installés, 12 vulnérabilités npm préexistantes sur devDependencies).
2. **`npm run typecheck` (`tsc --noEmit`) :**
   * Statut : **PASS** (0 erreur TypeScript).
3. **`npm run build` (`tsc && vite build`) :**
   * Statut : **PASS** (`dist/` généré en 15.48s, bundle JS principal minifié de 1,416 kB).
4. **`npm run lint` (`eslint src --ext ts,tsx`) :**
   * Statut : **ÉCHEC CONNU (2 erreurs, 198 warnings)** :
     * **Erreur 1 & 2 :** `src/App.tsx:22` et `src/App.tsx:24` : utilisation de directive `@ts-ignore` au lieu de `@ts-expect-error` pour l'import des composants legacy `Conditioning.jsx` et `ConditioningDetail.jsx` (leur migration complète en TypeScript est planifiée pour le Lot 9).
     * **Warnings (198) :** Variables importées non utilisées et types `any` dans les pages complexes.
5. **`npm test` (`node --test`) :**
   * Statut : **PASS** (0 tests, temps 40ms).

---

## 5. État des Migrations Prisma

Le schéma actif est situé dans `backend/src/prisma/schema.prisma`.  
L'inspection via `prisma migrate status` indique :
* **Base de données :** `traceagro_v2` sur PostgreSQL `localhost:5432`
* **Nombre de migrations trouvées :** 5 migrations versionnées dans `backend/src/prisma/migrations/`
  1. `20260402132213_add_conditioning`
  2. `20260403070937_add_conditioning_fields`
  3. `20260403073546_add_lot_conditioning_type`
  4. `20260413192333_add_clients_po_sublots`
  5. `20260521194543_add_lot_workflow`
* **Statut :** `Database schema is up to date!` (Aucune dérive détectée).

---

## 6. Inventaire de la Dette Technique & Vulnérabilités Connues

Cet inventaire constitue la référence des points à traiter dans les lots suivants :

### Sécurité & Authentification (Périmètre Lot 1)
* **Création d'administrateur ouverte :** `POST /api/auth/register` accepte publiquement n'importe quel rôle (dont `admin`).
* **Secrets JWT hardcodés en fallback :** Présence de `fallback_secret_change_me`, `fallback_refresh_secret`, `traceagro-antifr-secret` dans le code.
* **Credentials fixes dans le seed :** `Admin1234!` et `Agent1234!` dans `src/prisma/seed.ts`, exposés dans la documentation (`README.md`, `GUIDE-MISE-EN-LIGNE.md`).
* **Absence de rate limiting dédié :** Pas de limitation stricte par IP/utilisateur sur `/api/auth/login` et `/api/auth/refresh`.

### RBAC & Validation des Données (Périmètre Lot 2)
* Nombreuses routes ouvertes à tout utilisateur authentifié (notamment `conditioning`, `clients`, `purchase-orders`).
* Utilisation directe de `req.body` dans Prisma pour les mises à jour (risque de mass assignment).
* Absence de vérification d'appartenance parent/enfant (ex: `orderId` vs `stepId`).

### Intégrité Métier & Transactions (Périmètre Lot 3)
* Opérations `purchaseOrder.create` et décrément de stock `lot.update` non encapsulées dans des transactions interactives atomic.
* Absence de vérification de concurrence sur `availableKg`.

### Audit & State Machines (Périmètre Lot 4)
* Transitions de statuts de lots, d'expéditions et de commandes non contraintes par des automates finis stricts.
* Couche d'audit incomplète.

### Code Mort & Doublons (Périmètre Lots 6, 9 & 12)
* Doublon de schéma : `src/prisma/schema.prisma` vs `src/prisma/schema().prisma`.
* Doublons de contrôleurs / routes : `controllers/conditioning.controller.js` et `routes/conditioning.routes.js`.
* Pages legacy en JavaScript : `Conditioning.jsx` et `ConditioningDetail.jsx`.
* Doublon de configuration Tailwind : `tailwind.config.js` vs `tailwind.config.ts`.
* Frontend compilé versionné dans `backend/public/`.

---

## 7. Critère de Sortie du Lot 0

* [x] État Git de départ documenté
* [x] Installations propres (`npm ci`) validées
* [x] Schéma et client Prisma validés
* [x] Commandes `lint`, `typecheck`, `test`, `build` exécutables sur les deux sous-projets
* [x] Baseline technique enregistrée dans `docs/TECHNICAL_BASELINE.md`
