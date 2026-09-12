import { beforeEach, describe, expect, it } from "vitest";
import { getDailyMelody, MAX_TRIES, type Note } from "./logic";
import { useMelodyStore } from "./store";

const notes = (text: string) => text.split(" ") as Note[];

/** Types a full row and submits it. */
function submitRow(row: Note[]) {
  const store = useMelodyStore.getState();
  row.forEach((note) => store.pressNote(note));
  return useMelodyStore.getState().submit();
}

describe("melody store", () => {
  beforeEach(() => {
    // Fresh store per test: init() keeps a half-typed daily row on purpose.
    useMelodyStore.setState(useMelodyStore.getInitialState());
    useMelodyStore.getState().init();
  });

  it("starts in daily mode with today's melody and an empty board", () => {
    const state = useMelodyStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.mode).toBe("daily");
    expect(state.answer).toEqual(getDailyMelody(state.dateKey));
    expect(state.guesses).toEqual([]);
    expect(state.status).toBe("playing");
  });

  it("only submits a complete row", () => {
    const store = useMelodyStore.getState();
    store.pressNote("C4");
    expect(useMelodyStore.getState().submit()).toBeNull();
    expect(useMelodyStore.getState().guesses).toHaveLength(0);
  });

  it("scores a submitted row and advances", () => {
    const answer = useMelodyStore.getState().answer;
    const result = submitRow(answer);
    expect(result?.status).toBe("won");
    expect(result?.tries).toBe(1);
    expect(useMelodyStore.getState().status).toBe("won");
    expect(useMelodyStore.getState().current).toEqual([]);
  });

  it("loses after six wrong tries", () => {
    const answer = useMelodyStore.getState().answer;
    // A row that can never be fully correct: shift every note by one key.
    const wrong = answer.map((note) => (note === "C5" ? "C4" : "C5")) as Note[];
    let result = null;
    for (let i = 0; i < MAX_TRIES; i++) result = submitRow(wrong);
    expect(result?.status).toBe("lost");
    expect(useMelodyStore.getState().guesses).toHaveLength(MAX_TRIES);
    expect(useMelodyStore.getState().submit()).toBeNull();
  });

  it("practice uses the given melody, a fresh board, and does not touch the daily game", () => {
    const daily = useMelodyStore.getState();
    submitRow(daily.answer); // finish the daily puzzle first

    useMelodyStore.getState().startPractice(notes("C4 D4 E4 F4 G4"));
    let state = useMelodyStore.getState();
    expect(state.mode).toBe("practice");
    expect(state.answer).toEqual(notes("C4 D4 E4 F4 G4"));
    expect(state.status).toBe("playing");
    expect(state.guesses).toEqual([]);

    const result = submitRow(notes("C4 D4 E4 F4 A4"));
    expect(result?.marks).toEqual(["correct", "correct", "correct", "correct", "absent"]);

    // Back to daily: the finished daily puzzle is restored, not the practice round.
    useMelodyStore.getState().init();
    state = useMelodyStore.getState();
    expect(state.mode).toBe("daily");
    expect(state.status).toBe("won");
    expect(state.guesses).toEqual([daily.answer]);
  });

  it("keeps the half-typed daily row across re-init and across a practice round", () => {
    useMelodyStore.getState().pressNote("C4");
    useMelodyStore.getState().init();
    expect(useMelodyStore.getState().current).toEqual(["C4"]);

    useMelodyStore.getState().startPractice(notes("C4 D4 E4 F4 G4"));
    useMelodyStore.getState().pressNote("D4");
    expect(useMelodyStore.getState().current).toEqual(["D4"]);

    // The practice row is dropped; the daily row comes back.
    useMelodyStore.getState().init();
    expect(useMelodyStore.getState().mode).toBe("daily");
    expect(useMelodyStore.getState().current).toEqual(["C4"]);
  });

  it("survives several practice rounds in a row", () => {
    const daily = useMelodyStore.getState();
    submitRow(daily.answer);
    useMelodyStore.getState().startPractice(notes("C4 D4 E4 F4 G4"));
    submitRow(notes("C4 D4 E4 F4 G4"));
    useMelodyStore.getState().startPractice(notes("E4 F4 G4 A4 B4"));
    expect(useMelodyStore.getState().status).toBe("playing");
    expect(useMelodyStore.getState().guesses).toEqual([]);
    useMelodyStore.getState().init();
    expect(useMelodyStore.getState().status).toBe("won");
    expect(useMelodyStore.getState().guesses).toEqual([daily.answer]);
  });
});
