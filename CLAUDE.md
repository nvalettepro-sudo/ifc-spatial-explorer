# CLAUDE.md — Contexte projet IFC2x3 Explorateur pédagogique

Ce fichier est lu automatiquement par Claude Code à chaque session.  
Il contient tout le contexte nécessaire pour travailler correctement sur ce projet.

---

## Rôle et mission

Tu travailles sur un **outil pédagogique HTML standalone** pour explorer le schéma IFC2x3 en français.  
L'utilisateur est **Nico Valette** — architecte DPLG, BIM Manager, non-développeur.  
Il décrit ce qu'il veut en français. Tu codes à sa place et tu livres du fonctionnel immédiatement.

**Fichier principal** : `ifc_spatial.html` (~670 KB, ~8170 lignes, vanilla HTML/CSS/JS, zéro framework)

---

## Principes non négociables

1. **Français en grand, IFC en petit** — ex : "Mur" en titre, `IfcWall` en monospace dessous
2. **Standalone offline** — aucune dépendance runtime sauf Google Fonts CDN
3. **Pédagogique avant tout** — pas de gamification, pas de métaphore
4. **Valider le JS après chaque modification** — extraire le JS et lancer `node --check`
5. **Guillemets doubles** pour les strings qui contiennent des apostrophes françaises

---

## Architecture HTML

```
.app (display:flex)
├── .aside (panneau GAUCHE, width:50vw par défaut, redimensionnable)
│   ├── .aside-tabs → [Données] [Arborescence] [Hiérarchie] [Résultats (caché)]
│   ├── #pane-data → onglet Données (actif par défaut)
│   │   ├── Navigation rapide (.nav-pill)
│   │   ├── #ds-catalogue → Catalogue complet (en premier)
│   │   ├── #ds-relations → Relations IFC
│   │   ├── #ds-props → Données & Propriétés
│   │   ├── #ds-actors → Acteurs & Documents
│   │   ├── #ds-enums → Énumérations
│   │   ├── #ds-types → Bibliothèques de types IFC
│   │   └── #ds-legend → Légende des couleurs
│   ├── #pane-arbo → onglet Arborescence spatiale
│   │   ├── Boutons + Ajouter / - Supprimer / ↺ Réinitialiser
│   │   └── .spatial-view → Projet → Terrain → Bâtiment → Niveaux
│   ├── #pane-hier → onglet Hiérarchie IFC (NOUVEAU)
│   │   ├── input#hier-search → filtre texte
│   │   └── #hier-tree → arbre dépliable généré par renderHierTree()
│   └── #pane-search → Résultats de recherche (affiché si recherche active)
├── .resizer (poignée drag, min 220px, max 88vw, dblclic = 50%)
└── .fiche-panel (panneau DROIT, toujours visible)
    ├── .fiche-panel-header → "FICHE DÉTAILLÉE"
    └── .fiche-panel-body → #detail (rempli par showDetail() ou showAbstractDetail())
```

---

## Objets JS principaux

```javascript
const E = {
  wall: {
    fr: "Mur",
    ifc: "IfcWall",
    cat: "arch",               // catégorie sémantique
    desc: "Description...",
    heritage: ['IfcRoot', 'IfcObjectDefinition', ...], // chaîne COMPLÈTE
    attrs: ['GlobalId', 'OwnerHistory', ...],           // tous attrs hérités
    ex: ["→ Exemple 1", "→ Exemple 2", "→ Exemple 3"]
  },
  // 252 autres entités...
};

const PSET_DATA   = { /* 70 Psets IFC2x3 TC1 */ };
const ENTITY_PSETS = { /* mapping entité → Psets */ };
const FR_PSET_DICT = { /* 451 traductions FR */ };
const ATTR_DICT   = { /* attributs traduits + définitions */ };
const ATTRS_BY_ENTITY = { /* attributs complets par entité */ };
const ENUMS       = { /* énumérations IFC2x3 */ };
const STOREY_TEMPLATES = [ /* 5 niveaux */ ];
const ABSTRACT_CLASSES = { /* 36 classes abstraites IFC avec fr, desc, subtypes[] */ };
const INHERITED_ORDER  = ['Name','ObjectType','Description','GlobalId','OwnerHistory','ObjectPlacement','Representation','Tag'];
```

---

## Système de couleurs

### Catégories sémantiques (18 classes `.e-xxx` et `.cat-xxx`)

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
| `inv` | Divers |

### Dark mode
- Deux palettes JS : `GRP_COLORS_LIGHT` / `GRP_COLORS_DARK` → `getGrpColors()`
- Deux palettes JS : `CAT_COLORS_LIGHT` / `CAT_COLORS_DARK` → `getCatColor(cat)`
- CSS : `[data-theme="dark"]` sur `<html>` — activé par défaut
- Persistance : `localStorage.getItem('ifc-theme')`

---

## Fonctions JS clés

```javascript
showDetail(key)            // Affiche la fiche d'une entité E dans #detail
showAbstractDetail(name)   // Affiche la fiche d'une classe abstraite dans #detail
switchTab(tab)             // 'arbo' | 'data' | 'search' | 'hier' — panneau gauche
renderStoreys()            // Génère le RDC avec tous les éléments par section
renderCatalogue()          // Génère le catalogue complet dans #ds-catalogue
renderHierTree()           // Génère l'arbre hiérarchique IFC dans #hier-tree
filterHierTree(q)          // Filtre l'arbre par texte (appel depuis input#hier-search)
hierMatchNode(node,name,v) // Teste si un nœud ou ses enfants matchent la valeur v
renderHierNode(name,node,v)// Rendu récursif d'un nœud (v=undefined = pas de filtre)
hierRowHtml(name,node)     // Génère le HTML d'une ligne de l'arbre
buildHierTree()            // Construit l'arbre depuis heritage[] de E (avec leafCount mémoïsé)
toggleDataSection(id)      // Ouvre/ferme un ds-block
toggleTheme()              // Bascule dark/light, sauvegarde localStorage
getCatColor(cat)           // Retourne la couleur selon le thème actuel
getGrpColors()             // Retourne GRP_COLORS_LIGHT ou DARK selon thème
```

---

## Règles de conformité IFC2x3

Les données IFC sont vérifiées contre le schéma officiel via `ifcopenshell`.  
**253/253 entités conformes** (héritage et attributs validés).

Règles à respecter lors de tout ajout d'entité :
- `heritage[]` = chaîne complète depuis `IfcRoot` jusqu'à l'entité, dans l'ordre
- `attrs[]` = uniquement les attributs qui existent dans le schéma (propres + hérités)
- Le nom `ifc:` doit exister dans IFC2x3 TC1 (pas IFC4 !)
- Entités de TYPE → branche `IfcTypeObject → IfcTypeProduct → IfcElementType`
- Entités d'INSTANCE → branche `IfcObject → IfcProduct → IfcElement`
- Relations → branche `IfcRelationship → IfcRelXxx`

Pour valider : extraire le JS du HTML et lancer `node --check fichier.js`

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
| Doublons `const` | Grep avant d'injecter : `grep -n "const TRUC" fichier.html` |
| Spécificité CSS dark mode pour cat-chip | Utiliser `[data-theme="dark"] .cat-chip.e-xxx` (2 classes) |
| Style inline `display:none` | Override la classe `.active` — ne pas mélanger |
| Newlines dans strings de données | Sanitiser avant injection |
| `node --check` sur .html échoue | Extraire JS avec `sed -n 'DEBUT,FINp'` vers /tmp/check.js |
| Validation JS : trouver les bonnes lignes | `grep -n "<script>\|</script>"` pour bornes exactes |

---

## Workflow recommandé

1. **Lire la demande** de Nico en français
2. **Localiser** la zone à modifier avec `grep -n`
3. **Implémenter** la modification
4. **Valider** le JS : `sed -n 'DEBUT,FINp' ifc_spatial.html > /tmp/check.js && node --check /tmp/check.js`
5. **Commiter et pousser** sur `main` directement (pas de PR nécessaire)
6. Nico rafraîchit : `https://nvalettepro-sudo.github.io/ifc-spatial-explorer/ifc_spatial.html`

**Pas de navigateur disponible** dans l'environnement remote — les vérifications visuelles se font via le lien GitHub Pages.

---

## Prochains chantiers possibles

- Bloc 9 : entités de ressource IFC (matériaux, profils, textures)
- Export PDF d'une fiche
- Mode comparaison IFC2x3 vs IFC4
- Liens vers la documentation buildingSMART officielle
- Améliorer l'onglet Hiérarchie : sous-types cliquables dans les fiches abstraites (ouvrent la fiche de l'entité)
- Passer `/simplify` sur le CSS dark mode (doublons `.e-sp` / `.e-space`)

---

## Sources de données

- Schéma IFC2x3 TC1 : buildingSMART International 2005
- Psets : [xBimTeam/XbimPropertySets](https://github.com/xBimTeam/XbimPropertySets/tree/master/Xbim.Properties/Definitions/IFC2x3_TC1)
- Validation : `ifcopenshell` 0.8.x
