/**
 * Backglass — Composition root.
 */
import "./styles.css";
import { mountBackglassRoot } from "./view/mount.js";
import { BackglassView } from "./view/BackglassView.js";
import { NetworkAdapter } from "./net/NetworkAdapter.js";

const refs = mountBackglassRoot();
const view = new BackglassView(refs);

const network = new NetworkAdapter({
  onConnect() { refs.serverOverlay?.classList.remove("visible"); },
  onConnectionError() { refs.serverOverlay?.classList.add("visible"); },
  onStateUpdated: (state) => view.renderState(state),
  onHighScoreBeat: () => view.showHighScorePopup(),
  onSpecialEvent: ({ event }) => view.showVideoPopup(event),
});

// Écran d'accueil : "Press Enter to play" quitte l'attract et lance la partie.
window.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === "NumpadEnter") {
    view.dismissAttract();
    network.emitStartGame();
  }
});
