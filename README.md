# 🌿 TraceAgro APL v2

> Plateforme de traçabilité agro-export — Madagascar — v2.0

## 🚀 Lancement rapide

### Prérequis
- Node.js 18+
- PostgreSQL 15
- (Optionnel) Compte Cloudinary pour les uploads photos

---

## 1. Backend

```bash
cd backend

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos données (DB, JWT, Cloudinary)

# Générer le client Prisma
npm run db:generate

# Créer la base de données + tables
npm run db:push

# Insérer les données de démonstration
npm run db:seed

# Démarrer en développement
npm run dev
```

L'API démarre sur : `http://localhost:3000`

---

## 2. Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Optionnel en production si l'API est sur un autre domaine/sous-domaine
# cp .env.production.example .env.production

# Démarrer en développement
npm run dev
```

L'application démarre sur : `http://localhost:5173`

---

## 3. Comptes de démonstration

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@traceagro.mg` | `Admin1234!` | Administrateur |
| `agent@traceagro.mg` | `Agent1234!` | Agent de terrain |

---

## 🏗️ Architecture

```
traceagro-v2/
├── backend/          # API Node.js + Express + TypeScript
│   ├── src/
│   │   ├── modules/  # Auth, Lots, Producers, Shipments, Documents, Intelligence, Notifications
│   │   ├── prisma/   # Schema + Seed
│   │   ├── middleware/
│   │   └── utils/
│   └── package.json
└── frontend/         # React 18 + Vite + TypeScript + TailwindCSS
    ├── src/
    │   ├── pages/    # Dashboard, Lots, Producers, Shipments, Documents, Map, Intelligence, Settings
    │   ├── components/
    │   ├── stores/   # Zustand
    │   └── types/
    └── package.json
```

---

## 🧠 Fonctionnalités Intelligentes

- **Insights automatiques** : détection temps réel des problèmes critiques
- **Détection d'anomalies** : score qualité bas, perte de poids anormale, lots orphelins
- **Classement producteurs** : score IA composite (qualité + certifications + volume)
- **Tendances 6 mois** : graphiques d'évolution des lots et exports
- **Assistant IA** : chat contextuel pour interroger vos données
- **Alertes certifications** : 60j / 30j / 7j avant expiration

---

## 🛠️ Stack Technique

| Couche | Technologie |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Base de données | PostgreSQL 15 + Prisma ORM |
| Frontend | React 18 + Vite + TypeScript |
| UI | TailwindCSS + Design System AgriPremium |
| Auth | JWT + Refresh tokens + bcrypt |
| Médias | Cloudinary |
| Charts | Recharts |
| Maps | Leaflet + React-Leaflet |
| State | Zustand + TanStack Query |

---

## 📦 Variables d'environnement requises (.env)

```
DATABASE_URL=postgresql://user:password@localhost:5432/traceagro_v2
JWT_SECRET=votre_secret_jwt_minimum_32_caracteres
JWT_REFRESH_SECRET=votre_refresh_secret
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Déploiement VPS (Production)

```bash
# Backend
npm run build
node dist/server.js

# Frontend
# Si l'API est sur un sous-domaine, définir VITE_API_URL
# Exemple: VITE_API_URL=https://api.votredomaine.com/api
npm run build
# Servir le dossier dist/ avec nginx ou un CDN
```

## ⚡ Déploiement simple sur un seul domaine

Si vous voulez une seule URL et un seul dossier à déployer:

```bash
# 1. Builder le frontend
cd frontend
npm install
npm run build

# 2. Builder le backend et copier le frontend dedans
cd ../backend
npm install
npm run db:generate
npm run build:full

# 3. Démarrer l'application Node
NODE_ENV=production node dist/server.js
```

En production, le backend sert:
- le frontend sur `/`
- l'API sur `/api`

Le dossier `backend/public/` contient alors les fichiers du frontend compilé.

---

*TraceAgro APL v2 — Plateforme de traçabilité EUDR compliant — Mars 2026*
