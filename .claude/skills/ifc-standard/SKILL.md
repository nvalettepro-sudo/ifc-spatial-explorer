---
name: ifc-standard
description: Référence normative complète du schéma IFC (IFC2x3 TC1, IFC4 ADD2 TC1, IFC4.3) — entités, types, énumérations, attributs, règles WHERE, hiérarchies d'héritage et Property Sets/Quantity Sets officiels buildingSMART. Utilise IMPÉRATIVEMENT ce skill dès qu'une question, un fichier, un script ou une vérification touche à l'IFC, openBIM, Solibri, Archicad, Revit, un export/import IFC, un Pset, un Qto, un PredefinedType, une entité commençant par "Ifc", un fichier .ifc, une règle de contrôle qualité BIM, une spécification IDS, ou toute affirmation portant sur ce qui est autorisé ou non par le standard IFC — y compris si la question paraît simple ou si tu penses connaître la réponse. Ne jamais répondre de mémoire sur une valeur d'énumération, un nom d'attribut, un nom de propriété ou la présence d'une entité dans une version : toujours interroger l'index.
---

# IFC Standard — référence normative interrogeable

Ce skill donne accès aux **données brutes officielles** des trois versions IFC en
production, indexées et interrogeables via un outil en ligne de commande.

## Règle absolue

**Ne jamais répondre de mémoire** sur :

- une valeur d'énumération (`IfcRoadTypeEnum`, `IfcWallTypeEnum`, `PEnum_*`…)
- le nom, l'ordre ou l'optionalité d'un attribut d'entité
- l'existence d'une entité/d'un type dans une version donnée
- le contenu d'un Property Set ou d'un Quantity Set
- une règle WHERE

Ces informations sont la source la plus fréquente d'hallucination. **Lancer la
commande, lire la sortie, citer la sortie.** Si la commande ne retourne rien,
dire « ⚠️ Information non trouvée dans les sources officielles » plutôt que d'inventer.

## Utilisation

```bash
python3 scripts/ifc.py <commande> <argument> [-s SCHEMA]
```

Schémas : `2X3` | `4` | `4X3` | `all`. Défaut : `4X3` (`all` pour `search` et `diff`).

| Commande | Rôle |
|---|---|
| `entity IfcWall` | Définition complète : supertype, sous-types, attributs, INVERSE, règles WHERE, Psets applicables |
| `type IfcWallTypeEnum` | Valeurs d'une ENUMERATION, membres d'un SELECT, type sous-jacent d'un TYPE défini |
| `pset Pset_WallCommon` | Propriétés, types de données, valeurs d'énumération, entités cibles |
| `psets IfcWall` | Tous les Psets applicables (directs + hérités des supertypes) |
| `attrs IfcWall` | Liste **ordonnée** de tous les attributs hérités — ordre STEP réel pour lire/écrire un `.ifc` |
| `tree IfcFacility --depth 3` | Chaîne d'héritage ascendante + arbre des sous-types |
| `search alignment` | Recherche dans entités, types, Psets et noms de propriétés |
| `diff IfcWallTypeEnum` | Comparaison 2x3 / 4 / 4.3 avec delta explicite (ajouts/retraits) |
| `list enums --filter Road` | Listing filtré (`entities`, `types`, `enums`, `psets`) |
| `schemas` | Versions indexées et volumétrie |

Options : `--express` (source EXPRESS verbatim), `-v` (descriptions des propriétés),
`--regex`, `--limit`, `--depth`, `--filter`.

## Réflexes par type de question

| Question de l'utilisateur | Commande à lancer |
|---|---|
| « quelles valeurs pour tel PredefinedType ? » | `type <IfcXxxTypeEnum> -s <version>` |
| « cette entité existe en 2x3 ? » | `diff <IfcXxx>` |
| « qu'est-ce qui a changé entre IFC4 et 4.3 ? » | `diff <nom>` sur chaque élément concerné |
| « quelles propriétés dans tel Pset ? » | `pset <Pset_Xxx> -s <version>` |
| « quels Psets sur un mur ? » | `psets IfcWall -s <version>` |
| « comment lire cette ligne d'un fichier .ifc ? » | `attrs <IfcXxx>` (donne l'ordre des arguments STEP) |
| « écrire une règle Solibri / une spec IDS » | `entity` + `psets` + `type` sur chaque cible |
| « auditer un export Revit/Archicad » | `entity` (attributs obligatoires) + `psets` + règles WHERE |
| « je ne connais pas le nom exact » | `search <mot-clé> -s all` |

## Cas particuliers importants

- **IFC4.3 et l'infrastructure** : `IfcAlignment`, `IfcRoad`, `IfcBridge`,
  `IfcRailway`, `IfcMarineFacility`, `IfcFacilityPart` n'existent **que** en 4.3.
  Vérifier avec `diff` avant toute affirmation.
- **PredefinedType d'infrastructure** : plusieurs enums 4.3 (ex. `IfcRoadTypeEnum`)
  ne contiennent que `USERDEFINED`/`NOTDEFINED` — le typage réel passe par
  `IfcFacilityPart` + `PredefinedType` de la part. Toujours vérifier avec `type`.
- **`IfcMapConversion` / `IfcProjectedCRS`** : IFC4+ uniquement. En IFC2x3, le
  géoréférencement passe par `IfcSite`.
- **Qto\_\*** : les Quantity Sets sont indexés au même titre que les Pset\_\* —
  `pset Qto_WallBaseQuantities` fonctionne. Rappeler qu'un export logiciel ne
  garantit jamais leur présence effective.
- **Règles WHERE** : la commande `entity` les retourne verbatim. Elles constituent
  la base des règles de contrôle qualité vérifiables (Solibri, IDS, IfcTester).

## Restitution attendue

Après interrogation, répondre en français, structuré, avec :

1. la réponse directe,
2. le détail technique issu de la sortie de l'outil (identifiants IFC en anglais dans `code`),
3. la **version de schéma exacte** utilisée (voir `schemas`),
4. la source (voir `references/sources.md`).

Ne jamais présenter une donnée issue de l'index comme incertaine, ni une donnée
absente de l'index comme certaine.

## Sources et limites

Voir `references/sources.md` pour l'origine exacte de chaque fichier, les dates,
et les **limites connues** (notamment : la version 4.3 indexée est une révision
de développement, pas la release ISO figée).

Pour reconstruire l'index après mise à jour des sources dans `raw/` :
`python3 scripts/build_index.py`
