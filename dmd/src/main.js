import { io } from "socket.io-client";

const app = document.createElement("main");
app.className = "dmd";
app.innerHTML = `
  <section class="dmd__screen" aria-live="polite">
    <p id="dmdMessage" class="dmd__message">PRESS START</p>
    <p class="dmd__score">SCORE: <span id="dmdScore">0</span></p>
  </section>
`;

document.body.append(app);

const styles = document.createElement("style");
styles.textContent = `
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: #050505;
    color: #ff5a1f;
    font-family: "Courier New", Courier, monospace;
  }

  .dmd {
    width: min(920px, 94vw);
    padding: 1rem;
  }

  .dmd__screen {
    border: 3px solid #ff7a2a;
    border-radius: 10px;
    padding: 2rem 1.2rem;
    background: #120701;
    box-shadow: 0 0 24px rgba(255, 90, 31, 0.25) inset;
    text-align: center;
  }

  .dmd__message {
    margin: 0;
    font-size: clamp(2rem, 6vw, 5rem);
    font-weight: 700;
    letter-spacing: 0.2rem;
    text-transform: uppercase;
    text-shadow: 0 0 8px rgba(255, 110, 45, 0.8);
  }

  .dmd__score {
    margin: 1.4rem 0 0;
    font-size: clamp(0.9rem, 1.8vw, 1.4rem);
    letter-spacing: 0.08rem;
    color: #ffae8d;
  }
`;
document.head.append(styles);

const messageEl = document.getElementById("dmdMessage");
const scoreEl = document.getElementById("dmdScore");

function renderMessage(text) {
  const nextText = typeof text === "string" && text.trim() ? text : "READY";
  messageEl.textContent = nextText;
}

function renderScore(score) {
  const nextScore = Number.isFinite(score) ? score : 0;
  scoreEl.textContent = String(nextScore);
}

const socket = io("http://localhost:3000");

socket.on("dmd_message", (payload) => {
  renderMessage(payload?.text);
});

socket.on("state_updated", (nextState) => {
  renderScore(nextState?.score);
});
