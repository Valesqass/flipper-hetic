# Flipper Hetic

Flipper virtuel multi-écran : **Playfield** (3D), **Backglass**, **DMD**, synchronisés en temps réel via WebSocket.

## Architecture

```
├── server/
│   ├── package.json
│   └── src/
│       └── index.js          # Node.js + WebSocket, état du jeu
│
├── playfield/
│   ├── package.json
│   └── src/
│       └── main.js           # Three.js + Cannon-es (écran 3D)
│
├── backglass/
│   ├── package.json
│   └── src/
│       └── main.js           # Écran arrière (score, infos)
│
└── dmd/
    ├── package.json
    └── src/
        └── main.js           # Affichage type dot-matrix
```

## Lancement du projet

L'ordre de lancement est important : commencez par le serveur.

1. **Serveur (Port 3000)** :
   `cd server && npm install && npm run dev`
2. **Playfield (Port 5173)** :
   `cd playfield && npm install && npm run dev`
3. **Backglass (Port 5174)** :
   `cd backglass && npm install && npm run dev`
4. **DMD (Port 5175)** :
   `cd dmd && npm install && npm run dev`

## Test du serveur
Pour tester les sockets sans interface graphique, lancez le serveur puis exécutez dans un autre terminal :
`cd server && npm run test:client`