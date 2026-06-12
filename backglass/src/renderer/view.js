/**
 * Backglass — Mise à jour de la vue à partir de l'état serveur.
 */

const VIDEO_BY_EVENT = {
  'tunnel':    '/assets/video/tight-tight-tight.mov',
  'tunnel-rv': '/assets/video/own-private-domicile-video.mp4.mov',
};

export function createBackglassView(refs) {
  const { scoreValue, ballsLeftValue, highscoreValue } = refs;
  let highscoreBeatAnimationEndTime = 0;

  return {
    renderState(nextState) {
      scoreValue.textContent = String(nextState.score ?? 0);
      if (highscoreValue) highscoreValue.textContent = String(nextState.highScore ?? 0);
      ballsLeftValue.textContent = `${String(nextState.ballsLeft ?? 0)}/3`;
    },
    showHighScorePopup() {
      const popup = refs.highscorePopup;
      if (!popup) return;
      popup.setAttribute("aria-hidden", "false");
      popup.classList.add("visible");
      const ANIMATION_DURATION = 3500;
      highscoreBeatAnimationEndTime = performance.now() + ANIMATION_DURATION;
      setTimeout(() => {
        popup.classList.remove("visible");
        popup.setAttribute("aria-hidden", "true");
      }, ANIMATION_DURATION);
    },
    isHighScoreAnimationBlocking() {
      return performance.now() < highscoreBeatAnimationEndTime;
    },
    showVideoPopup(eventType) {
      const popup = refs.videoPopup;
      const video = refs.specialEventVideo;
      if (!popup || !video) return;
      if (!video.paused && !video.ended) return;
      const src = VIDEO_BY_EVENT[eventType];
      if (!src) return;

      const hide = () => {
        popup.classList.remove("visible");
        popup.setAttribute("aria-hidden", "true");
        video.src = "";
        video.onerror = null;
        video.onended = null;
      };

      video.src = src;
      video.load();
      popup.setAttribute("aria-hidden", "false");
      popup.classList.add("visible");
      video.onended = hide;
      video.onerror = hide;
      video.addEventListener('canplay', function onCanPlay() {
        video.removeEventListener('canplay', onCanPlay);
        video.play().catch(hide);
      });
    },
  };
}
