# 🚀 Guide de mise en ligne — TraceAgro APL

## Chemins importants
- **Projet** : `~/Downloads/traceagro-v2/`
- **Frontend** : `~/Downloads/traceagro-v2/frontend/`
- **Backend** : `~/Downloads/traceagro-v2/backend/`
- **Site en ligne** : https://trace.innov.studio
- **API** : https://traceagro-v2-production.up.railway.app

---

## CAS 1 — Modification du FRONTEND uniquement
*(ex: changer un texte, une couleur, une icône, un composant React)*

```bash
# 1. Compiler le frontend
cd ~/Downloads/traceagro-v2/frontend
npm run build

# 2. Zipper le dossier dist
zip -r dist.zip dist/
```

**Puis sur cPanel (https://trace.innov.studio) :**
1. Gestionnaire de fichiers → `public_html`
2. Supprimer l'ancien dossier `assets` + fichier `index.html`
3. Uploader `dist.zip`
4. Extraire le zip
5. Déplacer les fichiers de `dist/` vers `public_html/` si nécessaire

**Vider le cache navigateur :** `Cmd+Shift+R`

---

## CAS 2 — Modification du BACKEND uniquement
*(ex: corriger une route API, ajouter un endpoint, modifier un controller)*

```bash
# 1. Pousser sur GitHub (Railway redéploie automatiquement)
cd ~/Downloads/traceagro-v2
git add .
git commit -m "description de la modification"
git push
```

**Attendre 2-3 minutes** que Railway redéploie.  
Vérifier dans Railway → service `traceagro-v2` → **Deployments** que le statut est **Active**.

---

## CAS 3 — Modification FRONTEND + BACKEND
*(ex: nouveau module, nouvelle fonctionnalité)*

```bash
# 1. Pousser le backend sur GitHub
cd ~/Downloads/traceagro-v2
git add .
git commit -m "description"
git push

# 2. Attendre que Railway redéploie (2-3 min)

# 3. Compiler et uploader le frontend
cd ~/Downloads/traceagro-v2/frontend
npm run build
zip -r dist.zip dist/
# → Uploader dist.zip sur cPanel
```

---

## CAS 4 — Modification du schéma Prisma (base de données)
*(ex: ajouter un nouveau modèle, ajouter un champ)*

```bash
# 1. Modifier schema.prisma
code ~/Downloads/traceagro-v2/backend/src/prisma/schema.prisma

# 2. Créer la migration en LOCAL
cd ~/Downloads/traceagro-v2/backend
npx prisma migrate dev --name nom_de_la_migration --schema src/prisma/schema.prisma

# 3. Appliquer la migration sur Railway
DATABASE_URL="COLLER_ICI_DATABASE_PUBLIC_URL" npx prisma migrate deploy --schema src/prisma/schema.prisma

# 4. Pousser le backend
cd ~/Downloads/traceagro-v2
git add .
git commit -m "add migration: nom_de_la_migration"
git push
```

---

## ⚠️ Problèmes fréquents

| Problème | Solution |
|----------|----------|
| Page blanche après upload | Vider cache `Cmd+Shift+R` |
| "Erreur réseau" sur le site | Vérifier que Railway est **Active** |
| Login impossible (401) | Relancer le seed : `DATABASE_URL="..." npx prisma db seed` |
| Build échoue (TypeScript) | Lire l'erreur exacte et corriger le fichier indiqué |
| Changements non visibles | Vérifier que `dist.zip` a bien été extrait dans `public_html` |
| Port occupé en local | `lsof -ti:3000 \| xargs kill -9` |

---

## 🔑 Sécurité des Identifiants
- **Comptes administrateurs** : Définir des mots de passe forts et uniques lors de l'initialisation de la production (ne jamais utiliser de mot de passe par défaut).
- **DATABASE_PUBLIC_URL** : Railway → Postgres → Variables → DATABASE_PUBLIC_URL (restreindre l'accès réseau en production).

---

## 📋 Checklist avant chaque mise en ligne

- [ ] Le build local réussit sans erreur (`npm run build`)
- [ ] Les modifications ont été testées en local
- [ ] Le commit est descriptif (`git commit -m "fix: ..."`)
- [ ] Railway affiche **Active** après le push
- [ ] Le cache navigateur a été vidé (`Cmd+Shift+R`)
