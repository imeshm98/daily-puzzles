import { describe, expect, it } from "vitest";
import { MAX_HOOK_LENGTH } from "@/lib/share";
import { games } from "./index";
import { colourMixHook } from "./colourmix/logic";
import { distanceHook, type RoundResult } from "./distance/logic";
import { melodyHook } from "./melody/logic";
import { numbersHook } from "./numbers/logic";
import { orderHook } from "./order/logic";

/** Every hook the games can produce, so the length rule is checked for all of them. */
const rows = (n: number) => Array.from({ length: n }, () => []);
const step = { a: 1, op: "+" as const, b: 1, result: 2 };
const distance = (total: number): RoundResult[] => {
  // Five rounds whose points add up to `total` (totalPoints just sums them).
  const base = Math.floor(total / 5);
  return Array.from({ length: 5 }, (_, i) => {
    const points = i === 0 ? total - base * 4 : base;
    return { guessKm: 1, actualKm: 1, errorPercent: 0, points };
  });
};

const allHooks: Record<string, string[]> = {
  melody: [
    ...[1, 2, 3, 4, 5, 6].map((n) => melodyHook({ won: true, marks: rows(n) })),
    melodyHook({ won: false, marks: rows(6) }),
  ],
  colourmix: [
    colourMixHook({ won: true, bestScore: 100 }),
    colourMixHook({ won: true, bestScore: 98 }),
    colourMixHook({ won: true, bestScore: 95 }),
    colourMixHook({ won: false, bestScore: 94 }),
    colourMixHook({ won: false, bestScore: 85 }),
    colourMixHook({ won: false, bestScore: 40 }),
  ],
  numbers: [
    numbersHook({ won: true, steps: [step], par: 1 }),
    numbersHook({ won: true, steps: [step, step, step], par: 3 }),
    numbersHook({ won: true, steps: [step, step, step, step], par: 2 }),
    numbersHook({ won: false, steps: [], par: 3 }),
  ],
  distance: [500, 450, 412, 350, 349, 199, 0].map((total) => distanceHook({ results: distance(total) })),
  order: [
    orderHook({ won: true, marks: rows(1) }),
    orderHook({ won: true, marks: rows(2) }),
    orderHook({ won: true, marks: rows(3) }),
    orderHook({ won: false, marks: rows(3) }),
  ],
};

describe("share hooks", () => {
  it("every registered game provides a hook builder", () => {
    for (const game of games) {
      expect(typeof game.buildHook, game.id).toBe("function");
      expect(allHooks[game.id], `no hook samples for ${game.id}`).toBeDefined();
    }
  });

  it("every hook is one short line under the limit", () => {
    for (const [id, hooks] of Object.entries(allHooks)) {
      for (const hook of hooks) {
        expect(hook.length, `${id}: "${hook}"`).toBeGreaterThan(0);
        expect(hook.length, `${id}: "${hook}"`).toBeLessThan(MAX_HOOK_LENGTH);
        expect(hook, `${id}: "${hook}"`).not.toMatch(/[\r\n]/);
        expect(hook, `${id}: "${hook}"`).toBe(hook.trim());
      }
    }
  });

  it("varies with the result so it never feels robotic", () => {
    for (const [id, hooks] of Object.entries(allHooks)) {
      expect(new Set(hooks).size, id).toBeGreaterThanOrEqual(3);
    }
  });

  it("speaks to the friend with the examples from the brief", () => {
    expect(melodyHook({ won: true, marks: rows(2) })).toBe("Bet you can't do it in 2.");
    expect(melodyHook({ won: true, marks: rows(3) })).toBe("Can you beat 3 tries?");
    expect(melodyHook({ won: true, marks: rows(5) })).toBe("Harder than it sounds. Try it.");
    expect(melodyHook({ won: false, marks: rows(6) })).toBe("I failed today. Your turn.");
    expect(colourMixHook({ won: true, bestScore: 98 })).toBe("Beat 98% if you can.");
    expect(colourMixHook({ won: false, bestScore: 60 })).toBe("My eyes failed me. Try yours.");
    expect(numbersHook({ won: true, steps: [step, step, step], par: 3 })).toBe(
      "Solved in 3 steps. Your turn.",
    );
    expect(distanceHook({ results: distance(412) }).startsWith("412/500. How good is your geography?")).toBe(true);
    expect(orderHook({ won: true, marks: rows(2) })).toBe("2/3 today. Think you know better?");
  });
});
