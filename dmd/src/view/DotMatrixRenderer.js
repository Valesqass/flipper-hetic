/**
 * DMD — Rendu dot-matrix sur canvas (POO).
 */
import { drawBitmapText } from "./font.js";
import { measureTextWidth } from "../presentation/textMetrics.js";
import { TextScroller } from "../presentation/TextScroller.js";

const DOT_COLS = 96;
const DOT_ROWS = 54;
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const DOT_RADIUS_RATIO = 0.35;
// LED color changed to green as requested
const DOT_ON = "#CFFFD0";
const DOT_OFF = "rgba(14, 129, 66, 0.12)";
const DISPLAY_BG = "#040201";
const TEXT_MARGIN = 2;
const TEXT_LINE_Y = Math.floor((DOT_ROWS - 7) / 2);
const TEXT_BG_PADDING = 1;
const TEXT_BG_OPACITY = 0.92;
const GAME_OVER_PAUSE_MS = 5000;
const BALL_FLASH_MS = 2000;

// Fallback vide — permet d'accéder à imagePixels[idx] avant le chargement sans erreur
const EMPTY_PIXELS = new Uint8ClampedArray(0);

function normalizeMessage(input) {
  const src = typeof input === "string" ? input : "";
  const up = src.trim().toUpperCase();
  if (!up) return "PRESS START";
  return up.slice(0, 16);
}

/**
 * Renderer dot-matrix attache a un canvas.
 * Methodes publiques : renderMessage, flashBallMessage, renderScore,
 * updateStatus, init.
 */
export class DotMatrixRenderer {
  #canvas;
  #ctx;
  #imageCanvas;
  #imageCtx;
  #textMaskCanvas;
  #textMaskCtx;

  #dmdState = {
    message: "PRESS START",
    score: 0,
    status: "idle",
  };

  // Affichage temporaire "BALL N" : pendant `playing`, prend le pas sur POINTS
  // jusqu'a `until`, puis l'affichage revient automatiquement aux points.
  #flashState = { text: null, until: 0 };

  // Machine de defilement de texte (statique / boucle / transition).
  #scroller = new TextScroller({ cols: DOT_COLS, margin: TEXT_MARGIN });

  // Pixel-art de fond charge depuis dmd/img, dessine plein ecran sur le canvas 16:9.
  #img = new Image();
  #imgLoaded = false;
  #imgNaturalW = 0;
  #imgNaturalH = 0;
  // Pixels caches une fois au chargement — evite un transfert getImageData de 8 Mo par frame.
  #cachedImagePixels = null;

  constructor(canvas) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d");

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    this.#imageCanvas = document.createElement("canvas");
    this.#imageCanvas.width = CANVAS_WIDTH;
    this.#imageCanvas.height = CANVAS_HEIGHT;
    this.#imageCtx = this.#imageCanvas.getContext("2d", { willReadFrequently: true });

    this.#textMaskCanvas = document.createElement("canvas");
    this.#textMaskCanvas.width = DOT_COLS;
    this.#textMaskCanvas.height = DOT_ROWS;
    this.#textMaskCtx = this.#textMaskCanvas.getContext("2d", { willReadFrequently: true });

    this.#loadBackgroundImage();
  }

  #loadBackgroundImage() {
    this.#img.onload = () => {
      this.#imgLoaded = true;
      this.#imgNaturalW = this.#img.naturalWidth;
      this.#imgNaturalH = this.#img.naturalHeight;
      const scaleH = CANVAS_HEIGHT / this.#imgNaturalH || 1;
      const scaleW = CANVAS_WIDTH / this.#imgNaturalW || 1;
      const scale = Math.min(scaleH, scaleW);
      const drawW = Math.max(1, Math.round(this.#imgNaturalW * scale));
      const drawH = Math.max(1, Math.round(this.#imgNaturalH * scale));
      const dstX = Math.round((CANVAS_WIDTH - drawW) / 2);
      const dstY = Math.round((CANVAS_HEIGHT - drawH) / 2);
      try {
        this.#imageCtx.drawImage(this.#img, 0, 0, this.#imgNaturalW, this.#imgNaturalH, dstX, dstY, drawW, drawH);
        this.#cachedImagePixels = this.#imageCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
      } catch (e) {
        // silently ignore
      }
      this.#render();
    };
    this.#img.onerror = () => {
      // silently ignore
    };
    this.#img.src = "/assets/img/BB-Pixel-DMD.jpg";
  }

  #getScoreText() {
    return `POINTS : ${String(this.#dmdState.score).slice(0, 8)}`;
  }

  #getTextForStatus(status) {
    if (status === "playing") {
      return this.#getScoreText();
    }
    if (status === "game_over") {
      return "GAME OVER!";
    }
    return this.#dmdState.message || "PRESS START";
  }

  // Texte « courant » du point de vue de l'affichage : le composite en cours de
  // transition, sinon le texte canonique du status.
  #currentDisplayText() {
    if (this.#scroller.isTransitioning) {
      return this.#scroller.text;
    }
    return this.#getTextForStatus(this.#dmdState.status);
  }

  // Texte affiche en mode statique : le flash "BALL N" prime sur les POINTS
  // pendant `playing`, le temps de la fenetre `flashState.until`.
  #getStaticDisplayText() {
    if (
      this.#flashState.text &&
      this.#dmdState.status === "playing" &&
      performance.now() < this.#flashState.until
    ) {
      return this.#flashState.text;
    }
    return this.#getTextForStatus(this.#dmdState.status);
  }

  #render() {
    const canvas = this.#canvas;
    const ctx = this.#ctx;

    this.#textMaskCtx.clearRect(0, 0, DOT_COLS, DOT_ROWS);
    this.#textMaskCtx.fillStyle = "#ffffff";

    let text, textWidth, textX;

    if (this.#scroller.isDriving) {
      // During a transition or an active scroll we render the composite/scrolling text.
      text = this.#scroller.text;
      textWidth = this.#scroller.textWidth;
      textX = Math.floor(this.#scroller.offsetX);
    } else {
      // Otherwise render the canonical text for the current status (ou le flash
      // "BALL N" en cours), centré.
      text = this.#getStaticDisplayText();
      textWidth = measureTextWidth(text);
      textX = Math.round((DOT_COLS - textWidth) / 2);
    }

    drawBitmapText(this.#textMaskCtx, text, textX, TEXT_LINE_Y, { spacing: 1 });

    const imagePixels = this.#cachedImagePixels ?? EMPTY_PIXELS;
    const textPixels = this.#textMaskCtx.getImageData(0, 0, DOT_COLS, DOT_ROWS).data;
    const dotPitchX = canvas.width / DOT_COLS;
    const dotPitchY = canvas.height / DOT_ROWS;
    const dotRadius = Math.min(dotPitchX, dotPitchY) * DOT_RADIUS_RATIO;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = DISPLAY_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.22;
    ctx.drawImage(this.#imageCanvas, 0, 0);
    ctx.globalAlpha = 1;

    const textRectX = TEXT_MARGIN * dotPitchX;
    const textRectY = Math.max(0, TEXT_LINE_Y * dotPitchY - TEXT_BG_PADDING * dotPitchY);
    const textRectW = Math.min(canvas.width - textRectX * 2, canvas.width);
    const textRectH = Math.min(canvas.height - textRectY, (7 + TEXT_BG_PADDING * 2) * dotPitchY);
    ctx.fillStyle = `rgba(0, 0, 0, ${TEXT_BG_OPACITY})`;
    ctx.fillRect(textRectX, textRectY, textRectW, textRectH);

    for (let y = 0; y < DOT_ROWS; y += 1) {
      for (let x = 0; x < DOT_COLS; x += 1) {
        const sampleX = Math.min(CANVAS_WIDTH - 1, Math.round((x + 0.5) * (CANVAS_WIDTH / DOT_COLS)));
        const sampleY = Math.min(CANVAS_HEIGHT - 1, Math.round((y + 0.5) * (CANVAS_HEIGHT / DOT_ROWS)));
        const idx = (sampleY * CANVAS_WIDTH + sampleX) * 4;
        const imgR = imagePixels[idx + 0];
        const imgG = imagePixels[idx + 1];
        const imgB = imagePixels[idx + 2];
        const imgA = imagePixels[idx + 3];
        const textA = textPixels[(y * DOT_COLS + x) * 4 + 3];
        const drawX = x * dotPitchX + dotPitchX / 2;
        const drawY = y * dotPitchY + dotPitchY / 2;
        // Bande horizontale du texte : on y supprime les points colorés de
        // l'image pour que le texte ressorte sur un fond propre et sombre.
        const inTextBand =
          y >= TEXT_LINE_Y - TEXT_BG_PADDING && y < TEXT_LINE_Y + 7 + TEXT_BG_PADDING;
        let fillStyle = DOT_OFF;
        let shadowColor = "transparent";
        let shadowBlur = 0;

        if (textA > 0) {
          // contour noir plus large derrière chaque point de texte
          ctx.beginPath();
          ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.arc(drawX, drawY, dotRadius * 1.5, 0, Math.PI * 2);
          ctx.fill();

          // point de texte plus gros que les points de fond + halo vert
          fillStyle = DOT_ON;
          shadowColor = "rgba(180, 255, 180, 0.95)";
          shadowBlur = 12;
          ctx.beginPath();
          ctx.fillStyle = fillStyle;
          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = shadowBlur;
          ctx.arc(drawX, drawY, dotRadius * 1.08, 0, Math.PI * 2);
          ctx.fill();
          continue;
        } else if (imgA > 16 && !inTextBand) {
          fillStyle = `rgba(${imgR}, ${imgG}, ${imgB}, 0.8)`;
        }

        ctx.beginPath();
        ctx.fillStyle = fillStyle;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.arc(drawX, drawY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;
  }

  #animate(now) {
    this.#scroller.update(now);
    this.#render();
    requestAnimationFrame((next) => this.#animate(next));
  }

  renderMessage(text) {
    const normalized = normalizeMessage(text);
    this.#dmdState.message = normalized;

    // If we're idle, schedule the normal transition so the message scrolls in.
    if (this.#dmdState.status === "idle") {
      this.#scroller.scheduleTransition(this.#dmdState.message, this.#currentDisplayText());
      this.#render();
      return;
    }

    // If the machine is in game_over, show the DMD message immediately and
    // keep it visible for the GAME_OVER_PAUSE_MS so the client matches server
    // behavior even if network ordering varies.
    if (this.#dmdState.status === "game_over") {
      this.#scroller.reset(this.#dmdState.message, { pauseMs: GAME_OVER_PAUSE_MS });
      this.#render();
      return;
    }

    // For other statuses (playing), just update the stored message so it can
    // be used when returning to idle or for transitions triggered by status.
    this.#render();
  }

  /**
   * Affiche brievement "BALL N" par-dessus les POINTS (pendant `playing`),
   * puis revient automatiquement aux points a l'expiration de la fenetre.
   */
  flashBallMessage(text, ms = BALL_FLASH_MS) {
    this.#flashState.text = normalizeMessage(text);
    this.#flashState.until = performance.now() + ms;
    // Coupe tout scroll/transition en cours pour montrer le flash centre tout
    // de suite ; le retour aux POINTS se fait via getStaticDisplayText.
    this.#scroller.interrupt();
    this.#render();
  }

  renderScore(score) {
    this.#dmdState.score = Number.isFinite(score) ? score : 0;
    // Pendant la partie, le score reste statique et centre (setStatic ignore
    // l'appel si une transition est en cours, pour ne pas la casser).
    if (this.#dmdState.status === "playing") {
      this.#scroller.setStatic(this.#getTextForStatus("playing"));
    }
    this.#render();
  }

  updateStatus(status) {
    const nextStatus = status ?? "idle";
    const currentStatus = this.#dmdState.status;
    if (nextStatus === currentStatus) {
      return;
    }

    const currentText = this.#getTextForStatus(currentStatus);
    this.#dmdState.status = nextStatus;
    const nextText = this.#getTextForStatus(nextStatus);

    if (nextStatus === "game_over") {
      if (currentStatus === "playing") {
        this.#scroller.scheduleTransition(nextText, currentText);
      } else {
        this.#scroller.reset(nextText, { pauseMs: GAME_OVER_PAUSE_MS });
      }
      return;
    }

    if (nextStatus === "idle" && currentStatus === "game_over") {
      this.#scroller.scheduleTransition(nextText, currentText);
      return;
    }

    if (nextStatus === "idle") {
      this.#scroller.reset(nextText);
      return;
    }

    // Other statuses (playing): transition from the current text.
    this.#scroller.scheduleTransition(nextText, currentText);
  }

  /** Rendu initial. */
  init() {
    this.#scroller.reset(this.#getTextForStatus(this.#dmdState.status));
    this.#render();
    requestAnimationFrame((now) => this.#animate(now));
  }
}
