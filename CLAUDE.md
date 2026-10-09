# CLAUDE.md — Contexte projet IFC Explorateur pédagogique (multi-version)

Ce fichier est lu automatiquement par Claude Code à chaque session.  
Il contient tout le contexte nécessaire pour travailler correctement sur ce projet.  
**Dernière mise à jour : 09/10/2026 (v09/10/26-02)** — voir "Chiffres de référence" pour les compteurs.

---

## Rôle et mission

Tu travailles sur un **outil pédagogique HTML standalone** pour explorer le schéma IFC en français.  
Il couvre **IFC2x3 TC1, IFC4, IFC4.1 et IFC4.3** (la version d'apparition de chaque entité est portée par son champ `ver`).  
L'utilisateur est **Nico Valette** — architecte DPLG, BIM Manager, non-développeur.  
Il décrit ce qu'il veut en français. Tu codes à sa place et tu livres du fonctionnel immédiatement.

**Fichier principal** : `ifc_spatial.html` (~2,9 Mo, ~32 400 lignes — dont ~2 Mo de données générées —, vanilla HTML/CSS/JS, zéro framework)

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
| `tools/audit_ifc.py` | **Audit de conformité** de l'app contre les schémas officiels (`python3 tools/audit_ifc.py` → doit afficher `AUDIT OK`) |
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
| `ENUMS` | Énumérations : `{fr, ifc, vers[], desc, usedBy, vals:[[CODE, fr, note, tagVersion?]]}` → `showEnum(id)`. Le 4e élément (ex. `IFC4+`, `IFC4.3`, `IFC2x3 seul`) signale une valeur absente de certaines versions |
| `ENUM_BY_ENTITY` | Généré : nom IFC → `[[attribut, cléENUMS]]` — alimente la section « Énumérations utilisées » de chaque fiche |
| `PSET_DATA` | **Généré depuis les index officiels** : 859 Psets/Qto `{v:[versions], app:"entités concernées", classes[], props:[{n, t, d?, e?:[valeurs], v?:tag}]}`. `d` (définition anglaise) n'est gardé que si `FR_PSET_DICT` n'a pas la propriété |
| `ENTITY_PSETS` | **Généré** : clé `E` → Psets/Qto applicables (directs puis hérités des supertypes, toutes versions). Affichés repliables dans la fiche |
| `FR_PSET_DICT` | Traduction FR + définition des propriétés de Psets (clé = nom de propriété) |
| `SPATIAL_TREES` | Arbres de l'onglet Arborescence, un par version : `{key, note, children}` (les `key` sont des clés `E`) |
| `REL_SCENES`, `ARCHICAD_SUPPORT`, `REL_HIER_SCOPES` | Données de l'onglet Relations |
| `HIER_SECTIONS` | Sections de l'onglet Hiérarchie pour les racines hors `IfcRoot` (ressources) ; `_hierSectionsAll()` ajoute « Autres ressources » pour toute racine oubliée |
| `IFC2X3_SCHEMA` / `BS_IFC4_FALLBACK` | Dossier buildingSMART des pages IFC2x3 ; à défaut, lien vers la page IFC4 de la même entité (`_bsUrl`, `_bsLabel`) |
| `HERIT_FAMS` / `HERIT_HUES` | Familles et teintes de la carte radiale (un index de teinte par famille) |
| `STOREY_TEMPLATES` | 5 niveaux de l'arborescence interactive (Sous-sol, RDC, 1er, 2ème, Combles) |
| `INHERITED_ORDER` | Ordre d'affichage des attributs hérités |

### Chiffres de référence (09/10/2026, v09/10/26-02)

- `E` : **808 fiches** = 515 IFC2x3 + 199 IFC4 + 8 IFC4.1 + 86 IFC4.3 — toutes dans un groupe du catalogue
- `ABSTRACT_CLASSES` : 36 · `ENUMS` : 261 · `PSET_DATA` : 859 (dont 116 Qto) · `ATTRS_BY_ENTITY` : 799 · `ATTR_DICT` : ~1 030 · `FR_PSET_DICT` : ~2 880
- Couverture : IFC2x3 521/653 (80 %), IFC4 643/776 (83 %), IFC4.3 720/876 (82 %), énumérations 261/272, Psets/Qto 859/859

---

## Checklist : ajouter une entité (tout le câblage)

1. **Vérifier** avec le skill : `ifc.py entity IfcXxx -s 4`, `attrs`, `tree`, `diff IfcXxx` (existence par version)
2. **`E`** : clé unique (`grep -n "^  maCle:{"`), `ver` = version d'apparition, `heritage` = chaîne **de cette version** (IfcSpaceType en 2x3 passe par `IfcElementType → IfcSpatialStructureElementType`, en IFC4 par `IfcSpatialElementType`)
3. **`ATTRS_BY_ENTITY`** : liste ordonnée (ordre STEP, `o` et `f` exacts — générer avec `full_attrs()` du script d'audit) ; chaque nom doit exister dans `ATTR_DICT`
4. **`renderCatalogue()`** : ajouter la clé dans un groupe `{label, color, keys:[…]}` — **sans cela la fiche est invisible dans l'onglet Entités IFC** (elle reste joignable par recherche/hiérarchie)
5. **Psets** : tous les Psets/Qto officiels existent déjà dans `PSET_DATA` ; ajouter la ligne `ENTITY_PSETS` de la nouvelle clé (Psets directs + hérités)
6. **Énumération** du PredefinedType : bloc dans `ENUMS` (valeurs de **toutes** les versions, avec "(IFC4.3)" dans le libellé des valeurs tardives)
7. **Arborescence / Relations** si pertinent : `SPATIAL_TREES`, `REL_SCENES`
8. **Version et journal** : numéro dans l'en-tête (`<span class="ver">`), commentaire "Valeurs courantes" de la modale, compteurs (`#cov-overlay` + `#info-overlay`), nouvelle ligne du **Journal des modifications**
9. **Valider** : `python3 tools/audit_ifc.py` doit afficher `AUDIT OK`, puis test navigateur (voir "Validation")

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
python3 tools/audit_ifc.py     # syntaxe JS + conformité complète (héritage, attributs, versions, énums, Psets, références internes)
```

**Un navigateur Chromium headless est disponible** dans l'environnement distant (Playwright installé globalement : `require(execSync('npm root -g').toString().trim() + '/playwright')`). Charger `file:///…/ifc_spatial.html`, écouter `pageerror`, appeler `showDetail(clé)` pour toutes les clés, `showEnum`, `showAbstractDetail`, changer d'onglet, et faire des captures d'écran. Seules erreurs console attendues : le chargement de Google Fonts (certificat du proxy).

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
| Doublons volontaires | 17 fiches du RDC IFC2x3 (« Tuyau », « Luminaire »…) pointent vers un `IfcXxxType` qui a aussi sa fiche « Type de… » : en IFC2x3 l'objet posé est un `IfcFlowSegment`… typé par ce type (expliqué dans la description) |
| Hiérarchie : nœud dupliqué | L'arbre fusionne par **nom de classe** ; une même classe avec des parents différents selon la version (ex. `IfcSpatialStructureElement` sous `IfcProduct` en 2x3, sous `IfcSpatialElement` en IFC4.3) apparaît à deux endroits |

### Anomalies connues

- Aucune anomalie de conformité connue au 09/10/2026 (`AUDIT OK`). Corrigé ce jour : héritage faux (43 fiches), attributs incomplets (262), 336 blocs d'attributs rangés dans `PSET_DATA`, versions d'apparition fausses, valeurs d'énumérations inventées (GATE, PROPELLER, STIRRUP, LONGITUDINAL, NOTDEFINED de IfcRoleEnum), entités inexistantes (`IfcGasTerminal`, `IfcTunnel`/`IfcTunnelPart` — absents d'IFC4.3, prévus pour une version ultérieure), 32 doublons, 152 fiches hors catalogue, ~70 racines invisibles dans l'onglet Hiérarchie.
- Les 8 fiches `IFC4x1` (alignement) ne sont pas vérifiables : IFC4.1 n'est pas dans l'index.
- Les textes français des nouvelles fiches, valeurs d'énumérations et propriétés ont été rédigés le 09/10/2026 (en partie par des sous-agents) : les structures sont garanties par le schéma, mais certaines notes d'énumérations très spécialisées (ferroviaire, maritime, devises historiques d'`IfcCurrencyEnum`) méritent une relecture métier.
- Les pages IFC2x3 de buildingSMART ne sont cartographiées que pour ~165 entités ; les autres renvoient vers la page IFC4 de la même entité (« Docs (page IFC4) »).

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

Un Chromium headless (Playwright) est disponible pour tester l'app ; la vérification finale visuelle se fait par Nico via le lien GitHub Pages.

---

## Manques connus (09/10/2026)

Index officiels : 1 006 entités distinctes (2x3 : 653, IFC4 ADD2 : 776, IFC4.3 dev : 876), 272 énumérations, 859 Psets/Qto.

| Élément | Couvert | Manque |
|---------|---------|--------|
| Entités | 813 | 193 — **toutes hors périmètre volontaire** |
| Énumérations | 261 | 11 — géométriques (`IfcBSplineCurveForm`, `IfcKnotType`, `IfcTransitionCode`…) |
| Psets + Qto | 859 | 0 |

Hors périmètre volontaire (non pédagogique) : géométrie pure sous `IfcRepresentationItem` (139 : courbes, surfaces, B-rep, CSG, topologie), présentation sous `IfcPresentationItem`/`IfcPresentationStyle` (36 : couleurs, textures, polices, styles), cotation et symboles 2D / photométrie IFC2x3 (18). Les entités géométriques les plus utiles (extrusion, B-rep facetté, polyligne, placement…) ont déjà une fiche.

---

## Prochains chantiers possibles

- Relecture métier des textes générés le 09/10/2026 (notes d'énumérations spécialisées, définitions de propriétés de Psets traduites depuis des descriptions officielles parfois tronquées)
- Afficher dans chaque fiche les attributs **par version** (aujourd'hui : attributs de la version d'apparition `ver`)
- Cartographier les pages IFC2x3 de buildingSMART manquantes (`IFC2X3_SCHEMA`)
- Export PDF d'une fiche · mode comparaison IFC2x3 / IFC4 (`ifc.py diff`)
- Géométrie pure (« Bloc 9 ») si un besoin pédagogique apparaît
- Passer `/simplify` sur le CSS dark mode (doublons `.e-sp` / `.e-space`)

---

## Sources de données

- Schémas : buildingSMART International — IFC2x3 TC1 (2005), IFC4 ADD2 TC1, IFC4.3 (révision de développement) ; index local dans `.claude/skills/ifc-standard/`
- Psets/Qto : templates officiels IFC2x3, IFC4 ADD2, IFC4.3 de l'index du skill (source IfcOpenShell, dérivés des PSD buildingSMART) ; traductions françaises rédigées pour l'app
- Liens de fiches : documentation HTML buildingSMART (IFC2x3 TC1, IFC4 ADD2 TC1, IFC4.3) via `_bsUrl()`
