# Debug Menu — Playfield

Ce dossier contient le menu de debug du playfield (sliders de caméra, physique, lumières).

## Utilisation

Le menu s'initialise depuis `main.js` via `wirePlayfieldDebug()`.

- **Toggle**: Appuyez sur `` ` `` (backtick, à gauche du `1`) pour afficher/masquer.
- **Sliders**: Caméra, plateau, physique, lumières.
- **Champs numériques**: Saisie manuelle de chaque paramètre.
- **Boutons reset**: Remise à zéro par slider ou par section.
- **Présets rapides**: Vue dessus, Cabinet.
- **Copier/Coller JSON**: Export/import de config.
- **Rapport live**: Affiche les changements par rapport aux defaults.

## Retirer le debug (procédure)

Quand le debug n'est plus utile :

1. **Commenter la ligne d'import** dans `playfield/src/main.js` :
   ```js
   // import { wirePlayfieldDebug } from "./adapters/debug/wirePlayfieldDebug.js";
   ```

2. **Retirer l'appel** dans `main.js` (environ ligne 50) :
   ```js
   // wirePlayfieldDebug({ camera, renderer, scene, levelGroup, world, dirLight });
   ```

3. **Supprimer le dossier** `playfield/src/adapters/debug/`.

4. **Vérifier** que la vue figée dans `domain/viewConfig.js` est correcte.

Aucune autre trace du debug n'existera dans le projet.

## Organisation (clean architecture)

| Fichier | Rôle |
|---------|------|
| `config.js` | Flag `DEBUG_ENABLED` (env ou défaut) |
| `ui.js` | Panneau DOM (sliders, inputs, boutons) |
| `wirePlayfieldDebug.js` | Point d'entrée, applique changements en direct |
| `README.md` | (ce fichier) |

La config finale se grave dans `domain/viewConfig.js`.
