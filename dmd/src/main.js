/**
 * DMD — Composition root.
 */
import "./styles.css";
import { mountDmdShell } from "./view/mount.js";
import { DotMatrixRenderer } from "./view/DotMatrixRenderer.js";
import { wireDmdNetwork } from "./composition/wireDmdNetwork.js";

const refs = mountDmdShell();
const renderer = new DotMatrixRenderer(refs.canvas);

wireDmdNetwork({ refs, renderer });
renderer.init();
