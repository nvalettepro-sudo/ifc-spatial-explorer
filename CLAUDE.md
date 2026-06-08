# CLAUDE.md — Contexte projet IFC2x3 Explorateur pédagogique

Ce fichier est lu automatiquement par Claude Code à chaque session.  
Il contient tout le contexte nécessaire pour travailler correctement sur ce projet.

---

## Rôle et mission

Tu travailles sur un **outil pédagogique HTML standalone** pour explorer le schéma IFC2x3 en français.  
L'utilisateur est **Nico Valette** — architecte DPLG, BIM Manager, non-développeur.  
Il décrit ce qu'il veut en français. Tu codes à sa place et tu livres du fonctionnel immédiatement.

**Fichier principal** : `ifc_spatial.html` (~610 KB, ~7960 lignes, vanilla HTML/CSS/JS, zéro framework)

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
│   ├── .aside-tabs → [Données] [Arborescence] [Résultats (caché)]
│   ├── #pane-data → onglet Données (actif par défaut)
│   │   ├── Navigation rapide (.nav-pill)
│   │   ├── #ds-catalogue → Catalogue complet (en premier)
│   │   ├── #ds-relations → Relations IFC
│   │   ├── #ds-props → Données & Propriétés
│   │   ├── #ds-actors → Acteurs & Documents
│   │   ├── #ds-enums → Énumérations
│   │   ├── #ds-types → Bibliothèques de types IFC
│   │   └── #ds-legend → Légende des couleurs
│   ├── #pane-arbo → onglet Arborescence
│   │   ├── Boutons + Ajouter / - Supprimer / ↺ Réinitialiser
│   │   └── .spatial-view → Projet → Terrain → Bâtiment → Niveaux
│   └── #pane-search → Résultats de recherche (affiché si recherche active)
├── .resizer (poignée drag, min 220px, max 88vw, dblclic = 50%)
└── .fiche-panel (panneau DROIT, toujours visible)
    ├── .fiche-panel-header → "FICHE DÉTAILLÉE"
    └── .fiche-panel-body → #detail (rempli par showDetail())
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
showDetail(key)        // Affiche la fiche d'une entité dans #detail
switchTab(tab)         // 'arbo' | 'data' | 'search' — panneau gauche uniquement
renderStoreys()        // Génère le RDC avec tous les éléments par section
renderCatalogue()      // Génère le catalogue complet dans #ds-catalogue
toggleDataSection(id)  // Ouvre/ferme un ds-block
toggleTheme()          // Bascule dark/light, sauvegarde localStorage
getCatColor(cat)       // Retourne la couleur selon le thème actuel
getGrpColors()         // Retourne GRP_COLORS_LIGHT ou DARK selon thème
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

## Pièges techniques connus

| Problème | Solution |
|----------|----------|
| Apostrophes françaises dans strings JS | Utiliser `"..."` pas `'...'` |
| `var(--token)` dans innerHTML dynamique | Utiliser `rgba()` ou hex explicite |
| Doublons `const` | Grep avant d'injecter : `grep -n "const TRUC" fichier.html` |
| Spécificité CSS dark mode pour cat-chip | Utiliser `[data-theme="dark"] .cat-chip.e-xxx` (2 classes) |
| Style inline `display:none` | Override la classe `.active` — ne pas mélanger |
| Newlines dans strings de données | Sanitiser avant injection |

---

## Workflow recommandé

1. **Lire la demande** de Nico en français
2. **Localiser** la zone à modifier avec `grep -n`
3. **Implémenter** la modification
4. **Valider** le JS : extraire + `node --check`
5. **Livrer** le fichier complet

---

## Prochains chantiers possibles

- Bloc 9 : entités de ressource IFC (matériaux, profils, textures)
- Export PDF d'une fiche
- Mode comparaison IFC2x3 vs IFC4
- Liens vers la documentation buildingSMART officielle

---

## Sources de données

- Schéma IFC2x3 TC1 : buildingSMART International 2005
- Psets : [xBimTeam/XbimPropertySets](https://github.com/xBimTeam/XbimPropertySets/tree/master/Xbim.Properties/Definitions/IFC2x3_TC1)
- Validation : `ifcopenshell` 0.8.x
