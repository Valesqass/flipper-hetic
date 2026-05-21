/**
 * Debug menu config — enable/disable and env flags.
 */

const DEBUG_ENABLED =
  (import.meta.env.VITE_PLAYFIELD_DEBUG === "true" || true) &&
  typeof window !== "undefined";

export { DEBUG_ENABLED };
