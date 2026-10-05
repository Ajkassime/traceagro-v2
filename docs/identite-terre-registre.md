# TraceAgro — Terre & Registre

Proposition de direction UI/UX. Cette charte est une recommandation ; elle n’est pas encore intégrée aux écrans de l’application.

## Intention

Une traçabilité agricole présentée avec la précision d’un registre et la chaleur des matières. L’encre aubergine structure l’interface ; l’argile évoque la terre ; le citron confit apporte un repère lumineux. Le caractère haut de gamme vient des proportions, de la typographie et de la retenue.

## Palette

| Rôle | Couleur | Code | Application |
|---|---|---|---|
| Primaire | Encre aubergine | `#352638` | Texte principal, navigation, bouton principal |
| Secondaire | Argile rouge | `#AD5138` | Repères de section, liens éditoriaux, détails de marque |
| Accent | Citron confit | `#D8DF72` | Petit repère de sélection, mise en avant ponctuelle ; texte aubergine |
| Fond | Ivoire de fibre | `#F5F0E7` | Fond général |
| Surface | Papier | `#FFFCF6` | Cartes, formulaires, menus |
| Texte secondaire | Prune grisée | `#70656B` | Descriptions et métadonnées |
| Séparateur | Lin | `#D8CEC4` | Séparation de groupes, contour des cartes |
| Contour de champ | Prune minérale | `#96878E` | Champs et contrôles qui doivent être identifiables |

Répartition visuelle indicative : 70 % de neutres, 20 % d’encre, 8 % d’argile et 2 % d’accent. Ces proportions guident la composition, elles ne sont pas des quotas par écran. Utiliser l’accent avec du texte foncé, jamais du blanc.

États fonctionnels, toujours accompagnés d’un mot ou d’une icône :

- Vérifié : texte `#435432`, fond `#E5ECD9`, symbole de validation.
- À contrôler : texte `#795015`, fond `#F5E8CC`, symbole d’attention.
- Erreur : texte `#963C47`, fond `#F8E6E8`, message explicite sous le champ.
- En cours : texte aubergine, fond `#EAE2EB`, libellé d’état.

L’argile est une couleur de marque : ne pas l’utiliser seule pour signaler une erreur. Dans les graphiques, ajouter des étiquettes et différencier les séries autrement que par la seule couleur.

## Typographie

- **Fraunces 500** pour les titres de page et les grands messages : 32 px / interligne 38 px sur ordinateur ; 28 / 34 sur mobile. Un grand message d’accueil peut atteindre 48 / 54.
- **Manrope 600** pour les titres de section : 20 / 28 ; pour les boutons et libellés : 14 / 20.
- **Manrope 400** pour le corps : 16 / 24. Tableaux : 14 / 22. Métadonnées : 12 / 18, sans y placer d’information indispensable à une décision.
- Les chiffres de tableaux restent en Manrope, avec chiffres tabulaires et alignement à droite. Toujours afficher les unités.
- Réserver les petites capitales espacées aux repères courts. Éviter les paragraphes en majuscules.
- Replis : Georgia pour Fraunces ; une police système sans empattement pour Manrope.

Polices : [Fraunces](https://fonts.google.com/specimen/Fraunces) et [Manrope](https://fonts.google.com/specimen/Manrope).

## Boutons et interactions

Tous les boutons : hauteur minimale 44 px, marge horizontale 18 px, rayon 6 px, texte Manrope 600, icône éventuelle de 18 px et écart de 8 px.

| Variante | Repos | Survol | Usage |
|---|---|---|---|
| Principal | Fond aubergine, texte papier | Fond `#4A354D` | Une action dominante par zone, par exemple « Créer un lot » |
| Secondaire | Fond transparent, contour et texte aubergine | Fond `#EAE2EB` | « Exporter », « Annuler » |
| Discret | Texte aubergine, sans contour | Fond `#EAE2EB` | Actions secondaires répétées |
| Destructif | Fond `#963C47`, texte papier | Fond `#7C2D38` | Suppression uniquement |

Focus clavier : anneau argile de 3 px, décalé de 3 px. État pressé : déplacement vertical de 1 px. État désactivé : fond lin, texte prune grisée, aucune réaction au survol. Chargement : conserver la largeur, afficher « Enregistrement… » et empêcher les doubles soumissions. Transitions de 150 ms ; respecter la préférence de réduction des animations.

Employer des verbes précis : « Enregistrer le producteur », « Ajouter un document ». Les contrôles de la maquette sont des exemples locaux, sans enregistrement.

## Espacements et mise en page

Utiliser une seule échelle : **4, 8, 12, 16, 24, 32, 48 px**.

- 4 px entre un libellé et une petite information associée.
- 8 px entre une icône et son texte.
- 12 px entre boutons d’un même groupe.
- 16 px entre champs ou éléments liés.
- 24 px à l’intérieur d’une carte.
- 32 px entre sections ; 48 px entre grands ensembles éditoriaux.
- Marges de page : 32 px sur ordinateur, 16 px sur mobile.
- Formulaire de lecture confortable : largeur maximale de 720 px. Sur ordinateur, deux colonnes seulement pour des champs courts ; une colonne sur mobile.

Cartes : rayon 8 px, surface papier, contour lin de 1 px. Éviter l’accumulation d’ombres ; réserver une ombre douce aux menus et fenêtres superposées. Un filet argile sur une fiche clé suffit comme signature.

## Application aux écrans TraceAgro

**Navigation :** fond aubergine, texte ivoire, état actif accompagné d’un petit trait citron et d’un libellé renforcé. Icônes simples de 20 px, même épaisseur partout. Sur mobile, conserver les libellés des destinations principales.

**Listes de lots :** titre Fraunces, action principale en haut, filtres regroupés, tableau aéré. Lignes de 52 px minimum, séparations horizontales légères. Montrer d’abord la référence, le produit, l’origine et le statut. Les informations moins prioritaires passent dans la fiche.

**Fiche de lot :** référence et produit en tête, statut explicite, puis origine, quantités, parcours et documents. Utiliser une ligne de progression avec étapes nommées. Réserver le citron à l’étape sélectionnée avec texte aubergine.

**Formulaires :** libellés persistants au-dessus des champs, saisie de 16 px, hauteur minimale de 44 px. Afficher l’aide avant l’erreur lorsqu’elle peut prévenir une mauvaise saisie. En cas d’erreur, conserver les données et expliquer comment corriger.

**État vide :** une phrase utile et une action, par exemple « Aucun document pour ce lot. Ajouter un document ». Pendant le chargement, garder les dimensions des blocs stables.

**Photographie :** si nécessaire, privilégier des gros plans réels de produit, des gestes de travail ou des parcelles documentées. Lumière naturelle, tons fidèles, cadrage simple. Garder les données opérationnelles sur des surfaces unies.

## Application en cinq étapes

1. Définir les couleurs une seule fois, avec les noms de rôles ci-dessus.
2. Installer les deux polices et attribuer les styles de texte.
3. Créer quatre composants réutilisables : bouton, champ, carte et badge de statut.
4. Appliquer la charte à une liste et à une fiche de lot avant de l’étendre aux autres écrans.
5. Vérifier sur mobile, au clavier et à 200 % de zoom : texte lisible, actions accessibles, statuts compréhensibles sans couleur.

Le thème clair est obligatoire, indépendamment des préférences du système ou du thème de l’application hôte. Fond général ivoire #F5F0E7, surfaces papier #FFFCF6. Aucun basculement automatique vers un thème sombre.
