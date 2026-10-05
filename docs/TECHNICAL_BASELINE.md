# Baseline Technique & Reproductibilité — TraceAgro V2

> **Document établi et révisé dans le cadre du LOT 0 (Correctif Lot 0.1 — Pinned Node 20)**  
> Date : 05 Octobre 2026  
> Dépôt : `Ajkassime/traceagro-v2`  
> Branche de référence : `master`  
> Commit de référence initial : `965a8cd953ae29849ce31c3fc3b8a13cb17eb0fc`

---

## 1. Environnement & Versions Officiellement Pinned

### Système & Outils
* **Système d'exploitation :** macOS Darwin 24.6.0 (x86_64)
* **Version Node.js certifiée :** `v20.18.3` (Node 20 LTS Iron)
* **Version npm certifiée :** `10.8.2`
* **Configuration d'ancrage :** Fichier `.nvmrc` à la racine contenant `20`
* **Contrainte moteurs `engines` :** Déclarée `"node": "20.x"` dans `backend/package.json` et `frontend/package.json`
* **Avertissements `EBADENGINE` :** **0** (Résolu sous Node 20)
* **PostgreSQL local :** `localhost:5432` (Base : `traceagro_v2`)

---

## 2. Tooling & Commandes Reproductibles

Toutes les validations ont été exécutées et vérifiées sous **Node v20.18.3** et **npm 10.8.2** :

| Commande | Backend (`backend/`) | Frontend (`frontend/`) |
| :--- | :--- | :--- |
| `npm ci` | Réinstallation propre depuis `package-lock.json` | Réinstallation propre depuis `package-lock.json` |
| `npm run typecheck` | `tsc --noEmit` | `tsc --noEmit` |
| `npm run lint` | `eslint src --ext .ts` | `eslint src --ext ts,tsx` |
| `npm test` | `node --test` (Test runner natif Node.js) | `node --test` |
| `npm run build` | `prisma generate --schema src/prisma/schema.prisma && tsc --skipLibCheck` | `tsc && vite build` |

---

## 3. Résultats Détaillés des Vérifications sous Node 20

### Backend (`cd backend`)
1. **`npm ci` :**
   * **Statut :** **PASS** (315 packages installés en 14s, aucun warning d'engine).
2. **`npx prisma validate --schema src/prisma/schema.prisma` :**
   * **Statut :** **PASS** (`The schema at src/prisma/schema.prisma is valid 🚀`).
3. **`npx prisma generate --schema src/prisma/schema.prisma` :**
   * **Statut :** **PASS** (`✔ Generated Prisma Client (v5.22.0) in 341ms`).
4. **`npm run typecheck` (`tsc --noEmit`) :**
   * **Statut :** **PASS** (0 erreur TypeScript).
5. **`npm run lint` (`eslint src --ext .ts`) :**
   * **Statut :** **PASS (0 erreur, 126 warnings)** (principalement des types `any` et imports non utilisés dans les controllers/services existants, exit code 0).
6. **`npm test` (`node --test`) :**
   * **Statut :** **PASS** (0 tests, 0 suites, temps d'exécution 22.64ms, exit code 0).
7. **`npm run build` :**
   * **Statut :** **PASS** (`Prisma generate` réussi + `tsc --skipLibCheck` compile sans erreur).

### Frontend (`cd frontend`)
1. **`npm ci` :**
   * **Statut :** **PASS** (423 packages installés en 9s, aucun warning d'engine).
2. **`npm run typecheck` (`tsc --noEmit`) :**
   * **Statut :** **PASS** (0 erreur TypeScript).
3. **`npm run lint` (`eslint src --ext ts,tsx`) :**
   * **Statut :** **PASS (0 erreur, 198 warnings)** :
     * Correction des deux erreurs précédentes de `src/App.tsx` en remplaçant `@ts-ignore` par `@ts-expect-error` explicite documentant les deux pages legacy en attente de conversion TypeScript (`Conditioning.jsx` et `ConditioningDetail.jsx` au Lot 9).
     * Les 198 warnings restants concernent des types `any` et des variables non utilisées dans les composants existants.
     * Exit code : **0**.
4. **`npm test` (`node --test`) :**
   * **Statut :** **PASS** (0 tests, temps 11.85ms, exit code 0).
5. **`npm run build` (`tsc && vite build`) :**
   * **Statut :** **PASS** (`dist/` généré en 17.80s, bundle JS principal minifié de 1,416.84 kB).
   * Note : `postcss.config.js` harmonisé en CommonJS (`module.exports = { ... }`) pour compatibilité stricte Node 20.

---

## 4. État des Migrations Prisma

Le schéma actif est situé dans `backend/src/prisma/schema.prisma`.  
Statut confirmé via `npx prisma migrate status` :
* **Base de données :** `traceagro_v2` sur PostgreSQL `localhost:5432`
* **Migrations versionnées :** 5 migrations dans `backend/src/prisma/migrations/`
  1. `20260402132213_add_conditioning`
  2. `20260403070937_add_conditioning_fields`
  3. `20260403073546_add_lot_conditioning_type`
  4. `20260413192333_add_clients_po_sublots`
  5. `20260521194543_add_lot_workflow`
* **Statut :** `Database schema is up to date!` (Aucune dérive constatée).

---

## 5. Synthèse & Critère de Sortie du Lot 0.1

* [x] Node 20 épinglé à la racine via `.nvmrc` (`20`)
* [x] Environnement d'exécution basculé sur Node `v20.18.3` et npm `10.8.2`
* [x] Installations propres (`npm ci`) validées sur backend et frontend sans `EBADENGINE`
* [x] Prisma `validate` et `generate` validés
* [x] Typecheck backend et frontend à 0 erreur
* [x] Lint backend à 0 erreur (126 warnings documentés)
* [x] Lint frontend à 0 erreur (198 warnings documentés, 0 erreur bloquante)
* [x] Tests backend et frontend exécutables avec 0 régression
* [x] Builds backend et frontend 100% réussis
* [x] Zéro modification de logique métier, de routes d'authentification ou de base de données
