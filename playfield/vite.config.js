import { defineConfig } from 'vite'

// `target: esnext` est requis pour le top-level await utilise par
// l'init Rapier dans `src/main.js` (cf. adapters/physics/rapier/init.js).
export default defineConfig({
  server: { port: 5173, strictPort: true, host: true },
  build: { target: 'esnext' },
  optimizeDeps: { esbuildOptions: { target: 'esnext' } },
})
