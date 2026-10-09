# IFC · Explorateur pédagogique (IFC2x3 · IFC4 · IFC4.1 · IFC4.3)

Outil pédagogique standalone pour explorer le schéma IFC en français.  
Fichier unique HTML/CSS/JS — zéro dépendance runtime, zéro build, 100% offline (hors polices Google Fonts).

https://nvalettepro-sudo.github.io/ifc-spatial-explorer/ifc_spatial.html

---

## Démarrage rapide

Télécharger `ifc_spatial.html` → double-clic → s'ouvre dans le navigateur.  
Aucune installation requise.

---

## Ce que fait l'outil

- **Entités IFC** : catalogue de plus de 500 fiches en français, avec filtres par **version** (IFC2x3, IFC4.x, IFC4, IFC4.1, IFC4.3) et par **catégorie** (architecture, structure, MEP, espaces, infrastructure…). Chaque fiche porte un badge de version d'apparition et un lien vers la documentation buildingSMART.
- **Fiche détaillée** : description, trois exemples concrets, chaîne d'héritage cliquable, attributs propres / hérités (optionnel ou obligatoire), Psets standards traduits.
- **Arborescence spatiale** par version : Projet → Terrain → Bâtiment → Niveau → Local, avec zones et espaces extérieurs en IFC4+, et ouvrages d'infrastructure en IFC4.3 ; RDC interactif avec niveaux ajoutables.
- **Hiérarchie IFC** : mécanisme `SUBTYPE OF` en arbre dépliable filtrable et en carte radiale (pan/zoom, tactile).
- **Relations** : les `IfcRelXxx` par famille, avec schéma hiérarchique cliquable et badge de prise en charge par Archicad.
- **Anatomie IFC** : un extrait de vrai fichier `.ifc` (format STEP) dont chaque ligne mène à la fiche correspondante.
- **Énumérations** (PredefinedTypes traduits), **Psets**, **Favoris**, **recherche** dynamique (entités, énumérations, attributs).
- **Couverture** : une modale affiche l'état de complétude par rapport aux schémas officiels et le journal des modifications.
- **Thème sombre / clair** (sombre par défaut, mémorisé), panneaux redimensionnables à la souris ou au doigt.

---

## Ce qui est couvert (09/10/2026)

| | Dans l'app | Schéma officiel |
|---|---|---|
| Fiches d'entités | 546 (402 IFC2x3 · 99 IFC4 · 8 IFC4.1 · 35 IFC4.3) | 653 entités IFC2x3 · 776 IFC4 · 876 IFC4.3 |
| Classes abstraites | 40 | — |
| Énumérations | 44 | 272 distinctes |
| Property Sets | 73 | 859 Pset/Qto distincts |

Le détail des manques (et les chantiers prioritaires) est dans `CLAUDE.md`, section "Manques connus".

---

## Architecture du fichier

```
ifc_spatial.html (~1,1 Mo, ~15 700 lignes)
│
├── <style>          CSS complet (variables, dark mode, composants)
├── <body>
│   ├── header       Logo + version, recherche, boutons Couverture / Guide / thème
│   ├── .aside       Panneau gauche — onglets Entités IFC · Arborescence · Hiérarchie (arbre, carte)
│   │                · Relations · Anatomie IFC · Favoris · Résultats
│   ├── .resizer     Poignée de redimensionnement
│   ├── .fiche-panel Panneau droit — fiche détaillée
│   └── modales      Couverture + journal des modifications, guide
└── <script>         Données + logique JS (vanilla, aucun framework)
```

### Objets JS principaux

| Objet | Contenu |
|-------|---------|
| `E` | Fiches `{fr, ifc, cat, ver, desc, heritage[], attrs[], ex[]}` — `ver` = version d'apparition |
| `ATTRS_BY_ENTITY` / `ATTR_DICT` | Attributs ordonnés par entité / traductions et définitions |
| `ABSTRACT_CLASSES` | Classes abstraites sans fiche propre |
| `ENUMS` | Énumérations avec valeurs traduites |
| `PSET_DATA` / `ENTITY_PSETS` / `FR_PSET_DICT` | Psets, mapping entité → Psets, traductions des propriétés |
| `SPATIAL_TREES` | Arborescence spatiale par version |
| `REL_SCENES`, `ARCHICAD_SUPPORT` | Données de l'onglet Relations |

---

## Fichiers du dépôt

| Fichier | Rôle |
|---------|------|
| `ifc_spatial.html` | L'application |
| `CLAUDE.md` | Contexte et procédures pour Claude Code (checklist d'ajout d'entité, anomalies connues, manques) |
| `.claude/skills/ifc-standard/` | Index interrogeable des schémas IFC2x3, IFC4 ADD2 TC1 et IFC4.3 + Psets officiels (outil de vérification) |
| `explorer/` | Application annexe « IFC Data Explorer » (viewer de fichiers `.ifc`) |
| `IFC2x3.exp` | Schéma EXPRESS IFC2x3 |
| `rapport-audit.html`, `prototype-fiche.html`, `slash-commands-reference.md` | Documents historiques |

---

## Système de couleurs

Catégories sémantiques via classes CSS `.e-xxx` et `.cat-xxx`.  
Deux palettes : light (couleurs riches) et dark (tonales Material Design).  
Couleurs dynamiques via `getGrpColors()` et `getCatColor()` selon `data-theme`.

---

## Pièges techniques connus

- **Apostrophes françaises** → toujours `"..."` pas `'...'` dans les strings JS
- **`var(--css-variable)` dans innerHTML dynamique** → utiliser hex ou `rgba()` explicite
- **Doublons de clés / `const`** → vérifier avant d'injecter
- **Validation obligatoire** → extraire le JS et valider avec `node --check`
- **Spécificité CSS dark mode** → `.cat-chip.e-xxx` nécessite `[data-theme="dark"] .cat-chip.e-xxx`
- **Une fiche doit être listée dans un groupe de `renderCatalogue()`** pour apparaître dans le catalogue

---

## Source des données

- Schémas : [buildingSMART IFC2x3 TC1](https://standards.buildingsmart.org/IFC/RELEASE/IFC2x3/TC1/), [IFC4 ADD2 TC1](https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/), [IFC4.3](https://ifc43-docs.standards.buildingsmart.org/) (l'index local d'IFC4.3 est une révision de développement)
- Psets IFC2x3 : [xBimTeam XbimPropertySets GitHub](https://github.com/xBimTeam/XbimPropertySets)

---

## Auteur

Nico Valette · Architecte DPLG · BIM Manager · VP BIMERS · Customer Success Solibri  
Projet pédagogique — usage libre pour la formation BIM
