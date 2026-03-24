import { io } from "socket.io-client";
import "./styles.css";

const app = document.createElement("main");
app.className = "backglass";
app.innerHTML = `
  <h1 class="backglass__title">FLIPPER HETIC</h1>
  <section class="backglass__grid" aria-live="polite">
    <article class="card">
      <p class="card__label">Score</p>
      <p id="scoreValue" class="card__value">0</p>
    </article>
    <article class="card">
      <p class="card__label">Billes restantes</p>
      <p id="ballsLeftValue" class="card__value">3</p>
    </article>
    <article class="card">
      <p class="card__label">Statut</p>
      <p id="statusValue" class="card__value">idle</p>
    </article>
  </section>
`;

document.body.append(app);

const scoreValue = document.getElementById("scoreValue");
const ballsLeftValue = document.getElementById("ballsLeftValue");
const statusValue = document.getElementById("statusValue");

function renderState(nextState) {
  scoreValue.textContent = String(nextState.score ?? 0);
  ballsLeftValue.textContent = String(nextState.ballsLeft ?? 0);
  statusValue.textContent = String(nextState.status ?? "idle");
}

const socket = io("http://localhost:3000");

socket.on("state_updated", (nextState) => {
  renderState(nextState);
});
