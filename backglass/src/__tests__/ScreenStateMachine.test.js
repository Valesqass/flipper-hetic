import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ScreenStateMachine } from "../presentation/ScreenStateMachine.js";

function makeMachine(holdMs = 1000) {
  const effects = {
    onAttract: vi.fn(),
    onBackglass: vi.fn(),
    onGameOver: vi.fn(),
  };
  const machine = new ScreenStateMachine({ ...effects, holdMs });
  return { machine, effects };
}

describe("ScreenStateMachine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1 — status 'playing' montre le backglass et n'est pas en game over", () => {
    const { machine, effects } = makeMachine();
    machine.sync("playing", 0, 0);
    expect(effects.onBackglass).toHaveBeenCalledTimes(1);
    expect(machine.gameOverActive).toBe(false);
  });

  it("2 — status 'idle' (hors maintien) montre l'accueil", () => {
    const { machine, effects } = makeMachine();
    machine.sync("idle", 0, 0);
    expect(effects.onAttract).toHaveBeenCalledTimes(1);
  });

  it("3 — premier 'game_over' appelle onGameOver avec score/highScore et active le maintien", () => {
    const { machine, effects } = makeMachine();
    machine.sync("game_over", 1500, 3000);
    expect(effects.onGameOver).toHaveBeenCalledWith(1500, 3000);
    expect(machine.gameOverActive).toBe(true);
  });

  it("4 — 'game_over' repete ne remplit l'ecran qu'une seule fois", () => {
    const { machine, effects } = makeMachine();
    machine.sync("game_over", 1500, 3000);
    machine.sync("game_over", 1500, 3000);
    expect(effects.onGameOver).toHaveBeenCalledTimes(1);
  });

  it("5 — 'idle' pendant le maintien est ignore (pas de retour accueil)", () => {
    const { machine, effects } = makeMachine();
    machine.sync("game_over", 1500, 3000);
    machine.sync("idle", 1500, 3000);
    expect(effects.onAttract).not.toHaveBeenCalled();
    expect(machine.gameOverActive).toBe(true);
  });

  it("6 — apres l'expiration du maintien, l'accueil revient automatiquement", () => {
    const { machine, effects } = makeMachine(1000);
    machine.sync("game_over", 1500, 3000);
    vi.advanceTimersByTime(1000);
    expect(effects.onAttract).toHaveBeenCalledTimes(1);
    expect(machine.gameOverActive).toBe(false);
  });

  it("7 — repasser en 'playing' annule le maintien : le minuteur ne ramene pas l'accueil", () => {
    const { machine, effects } = makeMachine(1000);
    machine.sync("game_over", 1500, 3000);
    machine.sync("playing", 0, 0);
    expect(machine.gameOverActive).toBe(false);
    expect(effects.onBackglass).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    // Le timer de l'ancien game over ne doit pas declencher l'accueil.
    expect(effects.onAttract).not.toHaveBeenCalled();
  });

  it("8 — apres expiration, un nouveau 'game_over' rouvre l'ecran", () => {
    const { machine, effects } = makeMachine(1000);
    machine.sync("game_over", 100, 0);
    vi.advanceTimersByTime(1000);
    machine.sync("game_over", 200, 0);
    expect(effects.onGameOver).toHaveBeenCalledTimes(2);
    expect(effects.onGameOver).toHaveBeenLastCalledWith(200, 0);
    expect(machine.gameOverActive).toBe(true);
  });
});
