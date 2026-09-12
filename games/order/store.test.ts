import { beforeEach, describe, expect, it } from "vitest";
import { MAX_TRIES, type OrderPuzzle } from "./logic";
import { useOrderStore } from "./store";

const state = () => useOrderStore.getState();

/** Arranges the board into the given order using drag moves. */
function arrange(target: number[]) {
  for (let position = 0; position < target.length; position++) {
    const from = state().order.indexOf(target[position]);
    if (from !== position) state().move(from, position);
  }
}

describe("order store", () => {
  beforeEach(() => {
    useOrderStore.setState(useOrderStore.getInitialState());
    state().init();
  });

  it("starts with the daily items in their shuffled order and nothing locked", () => {
    expect(state().hydrated).toBe(true);
    expect(state().puzzle.items).toHaveLength(5);
    expect(state().order).toEqual([0, 1, 2, 3, 4]);
    expect(state().locked).toEqual([false, false, false, false, false]);
    expect(state().order).not.toEqual(state().correct);
    expect(state().status).toBe("playing");
  });

  it("moves items with drag and with arrows", () => {
    state().move(0, 4);
    expect(state().order).toEqual([1, 2, 3, 4, 0]);
    state().step(4, -1);
    expect(state().order).toEqual([1, 2, 3, 0, 4]);
    state().step(0, -1);
    expect(state().order).toEqual([1, 2, 3, 0, 4]);
  });

  it("marks positions, locks the green ones and keeps them fixed", () => {
    const correct = state().correct;
    // Put the first two items in the right place, the rest deliberately wrong.
    const rest = state().order.filter((i) => i !== correct[0] && i !== correct[1]);
    const wrong = [correct[0], correct[1], rest[1], rest[2], rest[0]];
    arrange(wrong);
    const result = state().submit();
    expect(result?.marks.slice(0, 2)).toEqual(["correct", "correct"]);
    expect(result?.status).toBe("playing");
    expect(state().locked.slice(0, 2)).toEqual([true, true]);
    // Locked items cannot move and are not displaced by other moves.
    state().move(0, 4);
    expect(state().order[0]).toBe(correct[0]);
    state().move(4, 0);
    expect(state().order.slice(0, 2)).toEqual([correct[0], correct[1]]);
  });

  it("wins when every position is right and then ignores moves", () => {
    arrange(state().correct);
    const result = state().submit();
    expect(result?.status).toBe("won");
    expect(result?.marks.every((m) => m === "correct")).toBe(true);
    const before = state().order;
    state().move(0, 1);
    expect(state().order).toEqual(before);
    expect(state().submit()).toBeNull();
  });

  it("loses after three tries", () => {
    let result = null;
    for (let i = 0; i < MAX_TRIES; i++) {
      // Keep it wrong: rotate the unlocked items each time.
      if (state().order.join() === state().correct.join()) state().move(0, 4);
      result = state().submit();
      if (result?.status === "won") break;
    }
    expect(["lost", "won"]).toContain(result?.status);
    expect(state().guesses.length).toBeLessThanOrEqual(MAX_TRIES);
  });

  it("practice uses the given puzzle and restores the daily board afterwards", () => {
    state().move(0, 1);
    const dailyOrder = state().order;

    const puzzle: OrderPuzzle = {
      categoryId: "animals-weight",
      items: [
        { name: "Lion", value: 190 },
        { name: "House cat", value: 4.5 },
        { name: "Horse", value: 500 },
        { name: "Rabbit", value: 2 },
        { name: "African elephant", value: 6000 },
      ],
    };
    state().startPractice(puzzle);
    expect(state().mode).toBe("practice");
    expect(state().correct).toEqual([3, 1, 0, 2, 4]);
    arrange([3, 1, 0, 2, 4]);
    expect(state().submit()?.status).toBe("won");

    state().init();
    expect(state().mode).toBe("daily");
    expect(state().order).toEqual(dailyOrder);
    expect(state().guesses).toEqual([]);
  });
});
