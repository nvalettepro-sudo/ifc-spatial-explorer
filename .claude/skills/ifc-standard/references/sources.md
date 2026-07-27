# Sources, provenance et limites

Date de constitution : 2026-07-26

## Schémas EXPRESS (`raw/*.exp`)

| Fichier | Schéma déclaré | Origine | Statut |
|---|---|---|---|
| `IFC2x3.exp` | `IFC2X3` | Fourni par l'utilisateur — distribution longform buildingSMART, compilée par Thomas Liebich, date d'édition 15/12/2005 | ✅ Version finale figée (IFC2x3 TC1) |
| `IFC4_ADD2_TC1.exp` | `IFC4_ADD2_TC1` | `raw.githubusercontent.com/pipauwel/IFCtoRDF/master/src/main/resources/IFC4_ADD2_TC1.exp` | ⚠️ Miroir tiers, non buildingSMART. Contenu conforme au nom de schéma officiel `IFC4_ADD2_TC1` (= ISO 16739-1:2018). À revalider contre `standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/` |
| `IFC4X3.exp` | `IFC4X3_DEV_923b0514` | `raw.githubusercontent.com/buildingSMART/IFC4.3.x-output/master/IFC.exp` | ⚠️ **Révision de développement**, pas la release ISO figée. Le nom de schéma contient un hash de commit. Le dépôt ne publie ni tag ni release |

### Limite majeure — IFC4.3

Le fichier indexé provient de la branche `master` du dépôt de sortie
buildingSMART, régénérée à chaque commit. Le nom de schéma
(`IFC4X3_DEV_923b0514`) n'est pas celui d'une publication officielle
(`IFC4X3_ADD2`). Conséquences :

- Les définitions sont proches de la release ISO mais **peuvent différer** sur
  des points de détail (règles WHERE notamment — le dépôt documente lui-même des
  écarts sur `IfcRoad`, `IfcRailway`, `IfcSurfaceFeature`, `IfcVoidingFeature`,
  `IfcBuildingSystem`, `IfcBuildingSystem`).
- Un fichier `.ifc` réel déclarera `IFC4X3_ADD2`, pas `IFC4X3_DEV_*`.
- **Toujours signaler cette nuance** quand une réponse 4.3 porte sur une règle
  WHERE ou une contrainte de validation.

Pour une version figée : `https://ifc43-docs.standards.buildingsmart.org/`

## Property Sets et Quantity Sets (`raw/Pset_*.ifc`)

| Fichier | Origine | Contenu |
|---|---|---|
| `Pset_IFC2X3.ifc` | Paquet PyPI `ifcopenshell` 0.8.5, `ifcopenshell/util/schema/` | 317 templates |
| `Pset_IFC4_ADD2.ifc` | idem | 513 templates |
| `Pset_IFC4X3.ifc` | idem | 760 templates |

Format : fichiers IFC-SPF contenant des `IfcPropertySetTemplate` et
`IfcSimplePropertyTemplate`, dérivés des définitions PSD buildingSMART.

⚠️ Source secondaire (IfcOpenShell), pas un téléchargement direct
buildingSMART. Les définitions PSD originales sont publiées ici :

- IFC2x3 : `https://standards.buildingsmart.org/IFC/RELEASE/IFC2x3/FINAL/PSD/psd_ifc2x3.html`
- IFC4 : `https://standards.buildingsmart.org/IFC/RELEASE/IFC4/FINAL/PSD/PSD_IFC4.html`

## Ce que l'index NE contient PAS

- Les **définitions textuelles des entités** (documentation HTML buildingSMART).
  L'index donne la structure formelle, pas la prose explicative.
  → `https://github.com/buildingSMART/IFC4.3.x-development/tree/master/docs/schemas`
- Les **concept templates / MVD** (Coordination View, Reference View,
  Design Transfer View).
- Les **exemples de géométrie** et les diagrammes.
- Les versions retirées (IFC4.1, IFC4.2) et antérieures (IFC2x2 et avant).

## Références officielles

| Ressource | URL |
|---|---|
| Portail des spécifications IFC | https://technical.buildingsmart.org/standards/ifc/ifc-schema-specifications/ |
| IFC2x3 TC1 | https://standards.buildingsmart.org/IFC/RELEASE/IFC2x3/TC1/HTML/ |
| IFC4 ADD2 TC1 | https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/ |
| IFC4.3 (doc vivante) | https://ifc43-docs.standards.buildingsmart.org/ |
| Sortie compilée 4.3 (exp) | https://github.com/buildingSMART/IFC4.3.x-output |
| Développement 4.3 (docs md) | https://github.com/buildingSMART/IFC4.3.x-development |

## Mise à jour

1. Remplacer les fichiers dans `raw/`
2. `python3 scripts/build_index.py`
3. Mettre à jour ce fichier (dates, versions, statuts)
