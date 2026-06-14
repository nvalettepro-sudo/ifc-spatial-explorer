# Référence des commandes `/` — Claude Code
> Classées par pertinence pour le projet IFC Explorateur pédagogique · État : v14/06/26-09

| Rang | Commande | Ce qu'elle fait | Pertinence pour ce projet |
|------|----------|-----------------|--------------------------|
| 1 | `/simplify` | Analyse le diff récent sous 4 angles (réutilisation, simplification, efficacité, niveau d'abstraction) et applique les corrections directement | **Très pertinent** — après 9 versions en une journée sur un fichier de 13 000 lignes, il y a très probablement du code dupliqué (`renderArboNode` ≈ `hierRowHtml`, groupes CSS redondants dark mode) |
| 2 | `/code-review` | Cherche les bugs de correction dans le diff : cas limites, logique incorrecte, régressions | **Très pertinent** — les filtres de version, la refonte Arborescence et le fix iOS sont récents et pas testés en profondeur sur tous les navigateurs |
| 3 | `/verify` | Lance l'app réelle et interagit avec elle pour confirmer que les changements fonctionnent (pas juste syntaxiquement) | **Pertinent** — utile pour valider que les 6 boutons de version, l'arborescence multi-version et le scroll iOS fonctionnent ensemble |
| 4 | `/run` | Lance et pilote l'application dans un navigateur, avec screenshot | **Pertinent** — permet de voir l'app visuellement depuis le serveur sans dépendre de ton iPhone pour chaque vérification |
| 5 | `/compact` | Résume la conversation pour libérer de la mémoire contextuelle | **Pertinent si la session continue** — la conversation est déjà très longue ; utile avant une nouvelle grande fonctionnalité |
| 6 | `/review` | Analyse un Pull Request GitHub (diff + titre + description) | **Peu pertinent** — ce projet travaille directement sur `main`, sans PR |
| 7 | `/security-review` | Cherche des vulnérabilités dans le code modifié (XSS, injection, etc.) | **Peu pertinent** — app offline sans backend ni données utilisateur |
| 8 | `/deep-research` | Lance une recherche web multi-sources approfondie avec synthèse citée | **Pertinent ponctuellement** — utile pour vérifier un point du schéma IFC officiel ou comparer avec IFC5 |
| 9 | `/update-config` | Modifie `settings.json` pour automatiser des comportements (hooks, permissions) | **Pertinent pour l'organisation** — peut réduire les prompts de permission sur `git`, `node`, `python3` |
| 10 | `/fewer-permission-prompts` | Analyse les transcripts et ajoute les commandes fréquentes en liste blanche | **Pertinent pour le confort** — même objectif que `/update-config` mais automatique |
| 11 | `/loop` | Exécute une commande sur un intervalle répété | **Non pertinent** — utile pour surveiller un CI, pas applicable ici |
| 12 | `/claude-api` | Documentation de référence sur l'API Anthropic / SDK Claude | **Non pertinent** — ce projet n'utilise pas l'API Claude |
| 13 | `/init` | Crée ou régénère le fichier `CLAUDE.md` avec la documentation du projet | **Non pertinent** — un `CLAUDE.md` complet et à jour existe déjà |
| 14 | `/session-start-hook` | Configure un hook de démarrage de session (linters, tests au lancement) | **Non pertinent** — projet HTML standalone sans suite de tests |
| 15 | `/keybindings-help` | Personnalise les raccourcis clavier de Claude Code | **Non pertinent** — préférence d'interface, pas lié au projet |
