import { beforeEach, describe, expect, it } from "vitest";
import { findSolution, type Step } from "./logic";
import { useNumbersStore } from "./store";

const state = () => useNumbersStore.getState();
const values = () => state().tiles.map((tile) => tile.value);

/** Plays a step through the tap actions, like a player would. */
function play(step: Step) {
  state().clearSelection();
  const a = state().tiles.find((tile) => tile.value === step.a)!;
  const b = state().tiles.find((tile) => tile.value === step.b && tile.id !== a.id)!;
  state().tapTile(a.id);
  state().tapOperator(step.op);
  state().tapTile(b.id);
}

describe("numbers store", () => {
  beforeEach(() => {
    useNumbersStore.setState(useNumbersStore.getInitialState());
    state().init();
  });

  it("starts with the five daily tiles and nothing selected", () => {
    expect(state().hydrated).toBe(true);
    expect(state().mode).toBe("daily");
    expect(state().tiles).toHaveLength(5);
    expect(values()).toEqual(state().puzzle.tiles);
    expect(state().status).toBe("playing");
    expect(state().selectedTile).toBeNull();
  });

  it("combines two tiles: tap number, operator, number", () => {
    const [first, second] = state().tiles;
    state().tapTile(first.id);
    expect(state().selectedTile).toBe(first.id);
    state().tapOperator("+");
    expect(state().selectedOp).toBe("+");
    state().tapTile(second.id);

    expect(state().tiles).toHaveLength(4);
    expect(values()).toContain(first.value + second.value);
    expect(state().steps).toEqual([
      { a: first.value, op: "+", b: second.value, result: first.value + second.value },
    ]);
    // The result tile takes the first operand's place and stays selected.
    expect(state().tiles[0].value).toBe(first.value + second.value);
    expect(state().selectedTile).toBe(state().tiles[0].id);
    expect(state().selectedOp).toBeNull();
  });

  it("tapping the selected tile again deselects it; tapping another switches", () => {
    const [first, second] = state().tiles;
    state().tapTile(first.id);
    state().tapTile(first.id);
    expect(state().selectedTile).toBeNull();
    state().tapTile(first.id);
    state().tapTile(second.id);
    expect(state().selectedTile).toBe(second.id);
    expect(state().tiles).toHaveLength(5);
  });

  it("refuses an impossible operation with a message and keeps the selection", () => {
    const small = state().tiles.find((tile) => tile.value < 15)!;
    const big = state().tiles.find((tile) => tile.value >= 15)!;
    state().tapTile(small.id);
    state().tapOperator("-");
    state().tapTile(big.id);
    expect(state().error).toMatch(/negative/);
    expect(state().tiles).toHaveLength(5);
    expect(state().selectedTile).toBe(small.id);
    expect(state().selectedOp).toBe("-");
  });

  it("needs a number before an operator", () => {
    state().tapOperator("×");
    expect(state().selectedOp).toBeNull();
    expect(state().error).toMatch(/number first/);
  });

  it("undo restores the previous tiles and reset restarts", () => {
    const start = values();
    const [first, second, third] = state().tiles;
    state().tapTile(first.id);
    state().tapOperator("×");
    state().tapTile(second.id);
    state().clearSelection();
    state().tapTile(third.id);
    state().tapOperator("+");
    state().tapTile(state().tiles[0].id);
    expect(state().tiles).toHaveLength(3);

    state().undo();
    expect(state().tiles).toHaveLength(4);
    expect(state().steps).toHaveLength(1);
    state().reset();
    expect(values()).toEqual(start);
    expect(state().steps).toEqual([]);
    expect(state().history).toEqual([]);
  });

  it("wins when a tile equals the target and then ignores taps", () => {
    const { tiles, target, par } = state().puzzle;
    const solution = findSolution(tiles, target)!;
    expect(solution).toHaveLength(par);
    for (const step of solution) play(step);
    expect(state().status).toBe("won");
    expect(values()).toContain(target);
    expect(state().selectedTile).toBeNull();
    const before = state().tiles;
    state().tapTile(before[0].id);
    expect(state().selectedTile).toBeNull();
    state().undo();
    expect(state().tiles).toBe(before);
  });

  it("show a solution ends the game as a loss with a shortest solution", () => {
    const solution = state().showSolution();
    expect(state().status).toBe("lost");
    expect(solution).toHaveLength(state().puzzle.par);
    expect(state().solution).toEqual(solution);
    expect(state().showSolution()).toEqual(solution);
  });

  it("practice uses the given puzzle and restores the daily board afterwards", () => {
    const [first, second] = state().tiles;
    state().tapTile(first.id);
    state().tapOperator("+");
    state().tapTile(second.id);
    const dailySteps = state().steps;

    state().startPractice({ tiles: [1, 2, 3, 4, 100], target: 110, par: 3 });
    expect(state().mode).toBe("practice");
    expect(values()).toEqual([1, 2, 3, 4, 100]);
    expect(state().steps).toEqual([]);
    play({ a: 100, op: "+", b: 4, result: 104 });
    play({ a: 104, op: "+", b: 3, result: 107 });
    play({ a: 107, op: "+", b: 2, result: 109 });
    play({ a: 109, op: "+", b: 1, result: 110 });
    expect(state().status).toBe("won");

    state().init();
    expect(state().mode).toBe("daily");
    expect(state().steps).toEqual(dailySteps);
    expect(state().tiles).toHaveLength(4);
    expect(state().status).toBe("playing");
  });
});
