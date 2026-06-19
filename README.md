# IFC2x3 · Explorateur pédagogique

Outil pédagogique standalone pour explorer le schéma IFC2x3 en français.  
Fichier unique HTML/CSS/JS — zéro dépendance, zéro build, 100% offline.

https://nvalettepro-sudo.github.io/ifc-spatial-explorer/ifc_spatial.html

---

# IFC Data Explorer

Application d'audit de données IFC (React + TypeScript + Vite + Electron).  
Branch : `claude/busy-ramanujan-8akvgu`

## Lancement en mode navigateur

```bash
git checkout claude/busy-ramanujan-8akvgu
npm install
npm run dev
# → http://localhost:5173
```

## Lancement en mode Electron (fenêtre bureau)

```bash
npm run electron:dev
```

## Créer un installateur

**Windows (.exe)**
```bash
npm run electron:build:win
# → release/IFC Data Explorer Setup x.x.x.exe
```

**macOS (.dmg)**
```bash
npm run electron:build:mac
# → release/IFC Data Explorer-x.x.x.dmg
```

**Linux (.AppImage)**
```bash
npm run electron:build:linux
# → release/IFC Data Explorer-x.x.x.AppImage
```

> Prérequis : Node.js 18+. L'installateur Windows ne nécessite pas Node sur la machine cible.

---

## Démarrage rapide

Télécharger `ifc_spatial.html` → double-clic → s'ouvre dans le navigateur.  
Aucune installation requise.

---

## Ce que fait l'outil

- **Arborescence spatiale** : Projet → Terrain → Bâtiment → Niveaux → Éléments (RDC interactif avec sections colorées)
- **Catalogue complet** : 253 entités IFC2x3 en français, organisées en 8 blocs thématiques
- **Fiche détaillée** : description, exemples concrets, héritage IFC, attributs, Psets standards
- **Recherche dynamique** : entités, attributs, mots-clés avec surlignage temps réel
- **70 Psets IFC2x3 TC1** : source buildingSMART/xBimTeam, 451 propriétés traduites en français
- **Thème sombre / clair** : dark mode par défaut, persisté en localStorage
- **Layout redimensionnable** : panneau gauche (Données + Arborescence) / panneau droit (Fiche)

---

## Architecture du fichier

```
ifc_spatial.html (~610 KB, ~7960 lignes)
│
├── <style>          CSS complet (variables, dark mode, composants)
├── <body>
│   ├── header       Barre de recherche + boutons
│   ├── .aside       Panneau gauche — 2 onglets
│   │   ├── Données  Catalogue, Relations, Psets, Acteurs, Énumérations, Types IFC, Légende
│   │   └── Arbo     Arborescence spatiale imbriquée + boutons niveaux
│   ├── .resizer     Poignée de redimensionnement
│   └── .fiche-panel Panneau droit — Fiche détaillée
└── <script>         Données + logique JS (vanilla, aucun framework)
```

### Objets JS principaux

| Objet | Contenu |
|-------|---------|
| `E` | 253 entités `{fr, ifc, cat, desc, heritage[], attrs[], ex[]}` |
| `PSET_DATA` | 70 Psets IFC2x3 TC1 (source xBimTeam GitHub) |
| `ENTITY_PSETS` | Mapping entité → Psets |
| `FR_PSET_DICT` | 451 traductions FR des propriétés Pset |
| `ATTR_DICT` | Attributs traduits avec définitions |
| `ATTRS_BY_ENTITY` | Attributs complets hérités par entité |
| `ENUMS` | Énumérations avec valeurs traduites |
| `STOREY_TEMPLATES` | 5 niveaux (Sous-sol, RDC, 1er, 2ème, Combles) |
| `GRP_COLORS` | Couleurs par section, dynamiques light/dark |

---

## Blocs de données

| Bloc | Contenu | Entités |
|------|---------|---------|
| Bloc 1 | Entités spatiales | 5 |
| Bloc 2 | IfcBuildingElement | 28 |
| Bloc 3 | IfcDistributionElement (MEP) | ~45 |
| Bloc 4 | Données non géométriques | ~38 |
| Bloc 5 | Géométrie, profils, planning, ressources | ~47 |
| Bloc 6 | Énumérations (PredefinedTypes) | 35 |
| Bloc 7 | IfcRelationship | 48 |
| Bloc 8 | IfcTypeProduct (bibliothèques de types) | 51 |

---

## Système de couleurs

18 catégories sémantiques via classes CSS `.e-xxx` et `.cat-xxx`.  
Deux palettes : light (couleurs riches) et dark (tonales Material Design).  
Couleurs dynamiques via `getGrpColors()` et `getCatColor()` selon `data-theme`.

---

## Pièges techniques connus

- **Apostrophes françaises** → toujours `"..."` pas `'...'` dans les strings JS
- **`var(--css-variable)` dans innerHTML dynamique** → utiliser hex ou `rgba()` explicite
- **Doublons `const`** → vérifier avant d'injecter (`PSET_DATA`, `FR_PSET_DICT`)
- **Validation obligatoire** → extraire le JS et valider avec `node --check`
- **Spécificité CSS dark mode** → `.cat-chip.e-xxx` nécessite `[data-theme="dark"] .cat-chip.e-xxx`

---

## Source des données

- Schéma IFC2x3 : [buildingSMART IFC2x3 TC1](https://standards.buildingsmart.org/IFC/RELEASE/IFC2x3/TC1/)
- Psets : [xBimTeam XbimPropertySets GitHub](https://github.com/xBimTeam/XbimPropertySets)
- Conformité vérifiée via `ifcopenshell` — 253/253 entités conformes

---

## Auteur

Nico Valette · Architecte DPLG · BIM Manager · VP BIMERS · Customer Success Solibri  
Projet pédagogique — usage libre pour la formation BIM
