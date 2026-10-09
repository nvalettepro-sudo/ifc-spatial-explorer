# CLAUDE.md — Contexte projet IFC Explorateur pédagogique (multi-version)

Ce fichier est lu automatiquement par Claude Code à chaque session.  
Il contient tout le contexte nécessaire pour travailler correctement sur ce projet.  
**Dernière mise à jour : 09/10/2026 (v09/10/26-01)** — voir "Chiffres de référence" pour les compteurs.

---

## Rôle et mission

Tu travailles sur un **outil pédagogique HTML standalone** pour explorer le schéma IFC en français.  
Il couvre **IFC2x3 TC1, IFC4, IFC4.1 et IFC4.3** (la version d'apparition de chaque entité est portée par son champ `ver`).  
L'utilisateur est **Nico Valette** — architecte DPLG, BIM Manager, non-développeur.  
Il décrit ce qu'il veut en français. Tu codes à sa place et tu livres du fonctionnel immédiatement.

**Fichier principal** : `ifc_spatial.html` (~1,1 Mo, ~15 700 lignes, vanilla HTML/CSS/JS, zéro framework)

---

## Principes non négociables

1. **Français en grand, IFC en petit** — ex : "Mur" en titre, `IfcWall` en monospace dessous
2. **Standalone offline** — aucune dépendance runtime sauf Google Fonts CDN
3. **Pédagogique avant tout** — pas de gamification, pas de métaphore
4. **Valider le JS après chaque modification** — extraire le JS et lancer `node --check`
5. **Guillemets doubles** pour les strings qui contiennent des apostrophes françaises
6. **Ne jamais citer le schéma de mémoire** — interroger le skill `ifc-standard` (voir "Conformité IFC")

---

## Fichiers du dépôt

| Fichier | Rôle |
|---------|------|
| `ifc_spatial.html` | **L'application** (tout le code et toutes les données) |
| `CLAUDE.md` / `README.md` | Contexte pour Claude Code / présentation du projet |
| `.claude/skills/ifc-standard/` | Skill de référence normative : index JSON des schémas IFC2x3, IFC4 ADD2 TC1 et IFC4.3 (dev) + Psets/Qto officiels. Commande : `python3 .claude/skills/ifc-standard/scripts/ifc.py <entity\|attrs\|tree\|type\|pset\|psets\|diff\|search\|list> …` |
| `explorer/` | Application annexe "IFC Data Explorer" (viewer web-ifc compilé, déployé sous `/explorer/`) — **ne pas modifier à la main** |
| `IFC2x3.exp` | Schéma EXPRESS IFC2x3 brut |
| `rapport-audit.html` | Rapport d'audit daté (juin 2026) — instantané historique, non maintenu |
| `prototype-fiche.html` | Maquette de fiche — historique |
| `slash-commands-reference.md` | Mémo des commandes `/` de Claude Code |

---

## Architecture HTML

```
.app (display:flex)
├── .aside (panneau GAUCHE, width:50vw par défaut, redimensionnable)
│   ├── .aside-tabs → [Entités IFC] [Arborescence] [Hiérarchie · Arbre] [Hiérarchie · Carte]
│   │                 [Relations] [Anatomie IFC] [★ Favoris] [Résultats (caché)]
│   ├── #pane-data  → Entités IFC (actif par défaut) : filtres de version (Toutes / 2x3 / 4.x / 4 / 4.1 / 4.3),
│   │                 filtres de catégorie, recherche, #catalogue (généré par renderCatalogue())
│   ├── #pane-arbo  → Arborescence spatiale par version (SPATIAL_TREES + setArboVer())
│   ├── #pane-hier  → Hiérarchie IFC en arbre dépliable (renderHierTree(), filtre #hier-search)
│   ├── #pane-herit → Hiérarchie IFC en carte radiale (heritDraw(), pan/zoom tactile)
│   ├── #pane-rel   → Relations IfcRelXxx par famille + schéma hiérarchique à droite (renderRelations(), renderRelSchema())
│   ├── #pane-anat  → Anatomie IFC : extrait de vrai fichier STEP, lignes cliquables vers les fiches
│   ├── #pane-fav   → Favoris (localStorage `ifc-favorites`)
│   └── #pane-search → Résultats de recherche (entités, énumérations, attributs…)
├── .resizer (poignée drag souris + tactile, min 220px, max 88vw, dblclic = 50%)
└── .fiche-panel (panneau DROIT, toujours visible)
    └── #detail (rempli par showDetail(), showAbstractDetail() ou showEnum())

Modales (jamais ouvertes au démarrage) : #cov-overlay (Couverture + Journal des modifications), #info-overlay (guide)
En-tête : <span class="ver"> = numéro de version affiché (format JJ/MM/AA-NN)
```

---

## Modèle de données (tout est dans le `<script>` de `ifc_spatial.html`)

```javascript
const E = {                       // une fiche = une clé camelCase/minuscule
  spatialZone: {
    fr: "Zone spatiale", ifc: "IfcSpatialZone",
    cat: "space",                 // catégorie sémantique (voir couleurs)
    ver: 'IFC4',                  // version d'APPARITION : IFC2x3 | IFC4 | IFC4x1 | IFC4x3
    desc: "Description…",
    heritage: ["IfcRoot", …, "IfcSpatialZone"],   // chaîne COMPLÈTE, DANS LA VERSION de `ver`
    attrs: ["GlobalId", …],                       // même ordre que ATTRS_BY_ENTITY
    ex: ["Exemple 1", "Exemple 2", "Exemple 3"]   // toujours 3 exemples
  },
};
```

| Objet | Contenu |
|-------|---------|
| `E` | Fiches d'entités (toutes versions). Champ `ver` → badge de version, filtre, lien buildingSMART (`_bsUrl`) |
| `ATTRS_BY_ENTITY` | Attributs complets ordonnés par entité : `{n, o (optionnel), f (entité qui le définit)}` |
| `ATTR_DICT` | Traduction FR + définition de chaque nom d'attribut (`LongName`, `PredefinedType`…) |
| `ABSTRACT_CLASSES` | Classes abstraites sans fiche `E` : `{fr, desc, subtypes[]}` → `showAbstractDetail()` |
| `ENUMS` | Énumérations : `{fr, ifc, desc, usedBy, vals:[[CODE, fr, note]]}` → `showEnum(id)` (accessibles via la **recherche**) |
| `PSET_DATA` | Psets : `{classes[], props:[{n,t,d}]}` |
| `ENTITY_PSETS` | Mapping clé `E` → liste de noms de Psets (un nom absent de `PSET_DATA` est ignoré sans erreur) |
| `FR_PSET_DICT` | Traduction FR + définition des propriétés de Psets (clé = nom de propriété) |
| `SPATIAL_TREES` | Arbres de l'onglet Arborescence, un par version : `{key, note, children}` (les `key` sont des clés `E`) |
| `REL_SCENES`, `ARCHICAD_SUPPORT`, `REL_HIER_SCOPES` | Données de l'onglet Relations |
| `HIER_SECTIONS` | Sections de l'onglet Hiérarchie pour les entités hors héritage produit |
| `HERIT_FAMS` / `HERIT_HUES` | Familles et teintes de la carte radiale (un index de teinte par famille) |
| `STOREY_TEMPLATES` | 5 niveaux de l'arborescence interactive (Sous-sol, RDC, 1er, 2ème, Combles) |
| `INHERITED_ORDER` | Ordre d'affichage des attributs hérités |

### Chiffres de référence (09/10/2026)

- `E` : **546 fiches** = 402 IFC2x3 + 99 IFC4 + 8 IFC4.1 + 35 IFC4.3 + 2 sans `ver`
- `ABSTRACT_CLASSES` : 40 · `ENUMS` : 44 · Psets réels : 73 · `ATTRS_BY_ENTITY` : 195 · `ATTR_DICT` : 303
- Couverture vs schémas officiels (index local) : voir "Manques connus"

---

## Checklist : ajouter une entité (tout le câblage)

1. **Vérifier** avec le skill : `ifc.py entity IfcXxx -s 4`, `attrs`, `tree`, `diff IfcXxx` (existence par version)
2. **`E`** : clé unique (`grep -n "^  maCle:{"`), `ver` = version d'apparition, `heritage` = chaîne **de cette version** (IfcSpaceType en 2x3 passe par `IfcElementType → IfcSpatialStructureElementType`, en IFC4 par `IfcSpatialElementType`)
3. **`ATTRS_BY_ENTITY`** : liste ordonnée (ordre STEP) ; vérifier que chaque nom existe dans `ATTR_DICT`
4. **`renderCatalogue()`** : ajouter la clé dans un groupe `{label, color, keys:[…]}` — **sans cela la fiche est invisible dans l'onglet Entités IFC** (elle reste joignable par recherche/hiérarchie)
5. **Psets** : `PSET_DATA` (+ traductions dans `FR_PSET_DICT`) puis `ENTITY_PSETS`
6. **Énumération** du PredefinedType : bloc dans `ENUMS` (valeurs de **toutes** les versions, avec "(IFC4.3)" dans le libellé des valeurs tardives)
7. **Arborescence / Relations** si pertinent : `SPATIAL_TREES`, `REL_SCENES`
8. **Version et journal** : numéro dans l'en-tête (`<span class="ver">`), commentaire "Valeurs courantes" de la modale, compteurs (`#cov-overlay` + `#info-overlay`), nouvelle ligne du **Journal des modifications**
9. **Valider** (voir "Validation")

---

## Système de couleurs

`E.cat` utilise 12 valeurs : `space`, `arch`, `struct`, `mep`, `elec`, `furn`, `prop`, `actor`, `plan`, `geo`, `gen`, `infra`.  
Les **groupes du catalogue** utilisent en plus des couleurs fines (classes `.e-xxx` / `.cat-xxx`) :

| Clé | Usage principal |
|-----|----------------|
| `arch` | Éléments architecturaux (murs, dalles...) |
| `struct` | Structure & fondations |
| `ouv` | Ouvertures (portes, fenêtres) |
| `circ` | Circulations (escaliers, rampes) |
| `fin` | Finitions & revêtements |
| `sp` / `space` | Espaces |
| `plo` | Plomberie & sanitaires |
| `vent` | Ventilation & CVC |
| `mep` | Production & fluides (général MEP) |
| `sec` | Détection & sécurité |
| `elec` | Électricité |
| `furn` | Mobilier & équipements |
| `gen` | Éléments génériques |
| `prop` | Données & propriétés |
| `actor` | Acteurs & documents |
| `plan` | Planning & ressources |
| `geo` | Géométrie |
| `infra` | Infrastructure IFC4.3 |
| `inv` | Divers |

### Dark mode
- Deux palettes JS : `GRP_COLORS_LIGHT` / `GRP_COLORS_DARK` → `getGrpColors()`
- Deux palettes JS : `CAT_COLORS_LIGHT` / `CAT_COLORS_DARK` → `getCatColor(cat)`
- CSS : `[data-theme="dark"]` sur `<html>` — activé par défaut
- Persistance : `localStorage.getItem('ifc-theme')`

---

## Fonctions JS clés

```javascript
showDetail(key)            // Fiche d'une entité E dans #detail (badge de version, héritage cliquable, attributs, Psets, lien buildingSMART)
showAbstractDetail(name)   // Fiche d'une classe abstraite (ABSTRACT_CLASSES)
showEnum(id)               // Fiche d'une énumération (ENUMS)
switchTab(tab)             // 'data' | 'arbo' | 'hier' | 'herit' | 'rel' | 'anat' | 'fav' | 'search'
renderCatalogue()          // Catalogue : groupes explicites, une entité n'apparaît que dans le 1er groupe qui la cite
setVerFilter(v) / setCatFilter(c) / filterCatalogue(q)   // Filtres du catalogue
renderArboTree() / setArboVer(v)   // Arborescence spatiale par version
renderStoreys()            // RDC interactif de l'arborescence
buildHierTree() / renderHierTree() / filterHierTree(q) / navigateToHier(name)   // Hiérarchie · Arbre (arbre fusionné par NOM de classe depuis heritage[])
heritDraw()                // Hiérarchie · Carte (radiale)
renderRelations(q) / renderRelSchema() / setRelVer(v)    // Relations
renderPsets(key)           // Psets d'une fiche (ENTITY_PSETS → PSET_DATA → FR_PSET_DICT)
_bsUrl(en)                 // URL buildingSMART selon `ver`
verBadgeHtml(ver)          // Badge IFC2x3 / IFC4 / IFC4.1 / IFC4.3
toggleTheme() / getCatColor(cat) / getGrpColors()
showCov() / showInfo()     // Modales Couverture et Guide (clic explicite uniquement)
```

---

## Conformité IFC

Interroger le skill (ne jamais répondre de mémoire sur un attribut, une valeur d'énumération ou l'existence d'une entité) :

```bash
python3 .claude/skills/ifc-standard/scripts/ifc.py diff IfcXxx          # existe en 2x3 / 4 / 4.3 ?
python3 .claude/skills/ifc-standard/scripts/ifc.py attrs IfcXxx -s 4    # attributs ordonnés (2X3 | 4 | 4X3)
python3 .claude/skills/ifc-standard/scripts/ifc.py type IfcXxxTypeEnum  # valeurs d'énumération
python3 .claude/skills/ifc-standard/scripts/ifc.py list entities -s 2X3 # liste officielle
```

Règles pour toute entité :
- `heritage[]` = chaîne complète depuis `IfcRoot`, **dans la version indiquée par `ver`** (elle peut différer entre versions : ex. `IfcZone` dérive de `IfcGroup` en 2x3 mais de `IfcSystem` en IFC4)
- `attrs[]` = uniquement des attributs existants dans cette version (propres + hérités)
- Le nom `ifc:` doit exister dans la version `ver` (utiliser `diff`)
- Entités de TYPE → `IfcTypeObject → IfcTypeProduct → …` ; d'INSTANCE → `IfcObject → IfcProduct → …` ; relations → `IfcRelationship → IfcRelXxx`
- Limites de l'index : l'**IFC4.3 indexé est une révision de développement** (`IFC4X3_DEV_…`), et **IFC4.1 n'est pas indexé** (les 8 fiches `IFC4x1` ne sont pas vérifiables localement). Voir `.claude/skills/ifc-standard/references/sources.md`

### Validation

```bash
S=$(grep -n "^<script>" ifc_spatial.html | head -1 | cut -d: -f1)
T=$(grep -n "^</script>" ifc_spatial.html | tail -1 | cut -d: -f1)
sed -n "$((S+1)),$((T-1))p" ifc_spatial.html > /tmp/check.js && node --check /tmp/check.js
```

Test plus poussé possible sans navigateur : charger ce JS dans Node avec un faux `document`/`window` (objets `Proxy` tolérants), puis appeler `buildHierTree()`, `renderCatalogue()`, `showDetail(clé)`, `showEnum(id)`, `renderArboTree()` et vérifier qu'aucune exception n'est levée.

---

## Préférences visuelles de Nico

- **Arborescences** : progression strictement vers la droite, pas de retour en arrière. Chaque niveau = indentation supplémentaire. Pas de blocs colorés qui créent du "bruit" visuel.
- **Hiérarchie IFC** : nœuds abstraits discrets (texte gris, petite taille), feuilles concrètes avec pastille couleur de catégorie — pas de fond coloré plein.
- **Overlay / modales** : ne jamais s'ouvrir automatiquement au démarrage. Uniquement au clic explicite.
- **Sections attributs** : toujours séparer "Attributs propres" et "Attributs hérités" avec titres clairs.
- **Ordre attributs hérités** : Nom → Type d'objet → Description → GUID → reste (voir `INHERITED_ORDER`).

---

## Pièges techniques connus

| Problème | Solution |
|----------|----------|
| Apostrophes françaises dans strings JS | Utiliser `"..."` pas `'...'` |
| `var(--token)` dans innerHTML dynamique | Utiliser `rgba()` ou hex explicite |
| Doublons `const` / clés | Grep avant d'injecter : `grep -n "const TRUC" fichier.html`, `grep -n "^  maCle:{"` |
| Spécificité CSS dark mode pour cat-chip | Utiliser `[data-theme="dark"] .cat-chip.e-xxx` (2 classes) |
| Style inline `display:none` | Override la classe `.active` — ne pas mélanger |
| Newlines dans strings de données | Sanitiser avant injection |
| `note` d'un nœud de `SPATIAL_TREES` | Injectée dans `title="…"` : pas de guillemets doubles dedans |
| `node --check` sur .html échoue | Extraire le JS (voir "Validation") |
| Entité ajoutée mais introuvable | Elle n'est dans aucun groupe de `renderCatalogue()` |
| Hiérarchie : nœud dupliqué | L'arbre fusionne par **nom de classe** ; une même classe avec des parents différents selon la version (ex. `IfcSpatialStructureElement` sous `IfcProduct` en 2x3, sous `IfcSpatialElement` en IFC4.3) apparaît à deux endroits |

### Anomalies connues (à traiter, non corrigées)

- **~336 blocs d'attributs sont rangés par erreur dans `PSET_DATA`** (juste après `Pset_SiteCommon`, clés `actionRequest:[…]` … `windowstyle:[…]`) au lieu de `ATTRS_BY_ENTITY`. Ils sont donc inertes : les fiches IFC4/4.1/4.3 concernées retombent sur le mode "fallback" (attributs tirés de `attrs[]`, tous marqués "Obligatoire"). Aucun recoupement de clés avec `ATTRS_BY_ENTITY` ; les déplacer suffit (vérifier le rendu après).
- **~150 fiches `E` ne sont dans aucun groupe du catalogue** (géométrie, matériaux, charges structurelles, `IfcElementAssembly`, `IfcDiscreteAccessory`, `IfcFastener`, `IfcMechanicalFastener`, `IfcShadingDevice`, plusieurs types MEP comme `IfcCondenserType`…) — visibles seulement par recherche ou onglets Hiérarchie. La clé `opening` du groupe "Ouvertures" ne correspond à aucune fiche `E`.
- **`IfcGasTerminal`** (fiche `gasTerminal`, `ver:'IFC4'`) **n'existe dans aucun schéma** (seul `IfcGasTerminalType` existe, en IFC2x3). À supprimer ou à renommer.
- `E.cat` `gen` et `infra` n'ont pas d'entrée dans `CAT_LABELS` / `CAT_CLASS` (libellé et classe de repli).
- La modale Couverture donne des pourcentages ; ils se recalculent à la main (voir "Manques connus").

---

## Workflow recommandé

1. **Lire la demande** de Nico en français
2. **Localiser** la zone à modifier avec `grep -n`
3. **Vérifier le schéma** avec le skill `ifc-standard`
4. **Implémenter** (checklist ci-dessus)
5. **Valider** le JS (`node --check`, puis test de rendu si possible)
6. **Mettre à jour version + journal + compteurs** dans l'app
7. **Commiter et pousser** : sur la branche désignée par la session (les sessions Claude Code distantes travaillent sur `claude/…`) ; historiquement le projet poussait directement sur `main`, sans PR. GitHub Pages ne montre le résultat qu'une fois la branche fusionnée dans `main`.
8. Nico rafraîchit : `https://nvalettepro-sudo.github.io/ifc-spatial-explorer/ifc_spatial.html`

**Pas de navigateur disponible** dans l'environnement remote — les vérifications visuelles se font via le lien GitHub Pages.

---

## Manques connus (09/10/2026)

Comparaison avec les index officiels (2x3 : 653 entités, IFC4 ADD2 : 776, IFC4.3 dev : 876 ; 1 006 entités distinctes au total) :

| Élément | Couvert | Manque |
|---------|---------|--------|
| Entités (toutes versions) | 519 | **487** |
| Entités IFC2x3 | 382 / 653 | 271 |
| Énumérations | 44 | **228** sur 272 distinctes |
| Psets + Qto | 73 | **786** sur 859 distincts (2x3 : 245 manquants ; aucun Qto) |

Entités manquantes par famille (487) : géométrie/topologie (139), ressources diverses — unités, dates, textures, styles de dessin (134), **types de la bibliothèque de types (63)**, **éléments physiques (50)**, présentation (32), définitions de propriétés (15), produits divers (14), profils (14), contrôles (5), groupes/systèmes (4), quantités (4), styles (4), représentations (3), processus (2), rooted divers (2), acteurs (1), structure spatiale (1).

À traiter en priorité (pédagogiquement les plus utiles) :
- `IfcOpeningElement` (trémies de portes/fenêtres) — jamais définie comme fiche
- Éléments : `IfcFurniture`, `IfcChimney`, `IfcGeographicElement`, `IfcVoidingFeature`, `IfcSurfaceFeature`, `IfcFeatureElement*`, `IfcTransportElement`, `IfcElementComponent`, variantes `…StandardCase` / `…ElementedCase` (IFC4), `IfcDistributionBoard` et dispositifs 4.3
- Types : `IfcDoorType` / `IfcWindowType` / `IfcStairType` / `IfcRampType` / `IfcRoofType` / `IfcFootingType` / `IfcPileType` (IFC4), types MEP (`IfcBoilerType`, `IfcChillerType`, `IfcCoilType`, `IfcDamperType`, `IfcFanType`, `IfcFilterType`, `IfcHumidifierType`, `IfcPumpType`, `IfcTankType`, `IfcValveType`…), types de processus/ressources
- Divers : `IfcZone` ✔ (ajouté), `IfcOccupant`, `IfcProxy`, `IfcAnnotation`, `IfcEvent`, `IfcWorkCalendar`, `IfcContext` / `IfcProjectLibrary`, `IfcBuildingSystem` / `IfcDistributionSystem` / `IfcDistributionCircuit`, gabarits de propriétés IFC4 (`IfcPropertySetTemplate`…), `IfcSpaceProgram`
- Hors périmètre assumé : géométrie NURBS/topologie, styles de présentation, textures, unités dérivées, cotation 2D (~230 entités de ressource — "Bloc 9")

Pour recalculer : `ifc.py list entities|enums|psets -s 2X3|4|4X3` puis comparer aux `ifc:` des fiches `E` et aux clés de `ENUMS` / `PSET_DATA` (exécuter le `<script>` avec un faux DOM et lire `Object.values(E).map(e=>e.ifc)`).

---

## Prochains chantiers possibles

- Corriger les anomalies ci-dessus (blocs d'attributs mal placés, fiches hors catalogue, `IfcGasTerminal`)
- Ajouter `IfcOpeningElement` et les types MEP / IFC4 manquants
- Étendre les Psets à IFC4 / IFC4.3 (aujourd'hui seulement les 70 Psets IFC2x3 du dépôt xBimTeam + quelques ajouts) et aux Qto
- Accès aux énumérations depuis les fiches (aujourd'hui seulement via la recherche)
- Export PDF d'une fiche
- Mode comparaison IFC2x3 vs IFC4 (`ifc.py diff`)
- Bloc 9 : entités de ressource IFC (matériaux, profils, textures)
- Passer `/simplify` sur le CSS dark mode (doublons `.e-sp` / `.e-space`)

---

## Sources de données

- Schémas : buildingSMART International — IFC2x3 TC1 (2005), IFC4 ADD2 TC1, IFC4.3 (révision de développement) ; index local dans `.claude/skills/ifc-standard/`
- Psets : [xBimTeam/XbimPropertySets](https://github.com/xBimTeam/XbimPropertySets/tree/master/Xbim.Properties/Definitions/IFC2x3_TC1) (IFC2x3) ; Psets IFC4 ajoutés depuis l'index du skill
- Liens de fiches : documentation HTML buildingSMART (IFC2x3 TC1, IFC4 ADD2 TC1, IFC4.3) via `_bsUrl()`
