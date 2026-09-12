import { beforeEach, describe, expect, it } from "vitest";
import { CITIES } from "./cities";
import { haversineKm, MAX_SCORE, ROUNDS, WIN_SCORE, type DistancePuzzle } from "./logic";
import { useDistanceStore } from "./store";

const state = () => useDistanceStore.getState();

function guess(text: string) {
  state().setInput(text);
  return state().submit();
}

const city = (name: string) => CITIES.find((c) => c.name === name)!;
const pair = (a: string, b: string) => ({
  from: city(a),
  to: city(b),
  distanceKm: Math.round(haversineKm(city(a), city(b))),
});

describe("distance store", () => {
  beforeEach(() => {
    useDistanceStore.setState(useDistanceStore.getInitialState());
    state().init();
  });

  it("starts on round 1 with the daily puzzle in km", () => {
    expect(state().hydrated).toBe(true);
    expect(state().puzzle.rounds).toHaveLength(ROUNDS);
    expect(state().guesses).toEqual([]);
    expect(state().phase).toBe("guessing");
    expect(state().unit).toBe("km");
    expect(state().status).toBe("playing");
  });

  it("ignores an empty or invalid guess", () => {
    expect(guess("")).toBeNull();
    expect(guess("far")).toBeNull();
    expect(state().guesses).toEqual([]);
    expect(state().phase).toBe("guessing");
  });

  it("scores a guess, shows the review, then moves to the next round", () => {
    const actual = state().puzzle.rounds[0].distanceKm;
    const result = guess(String(actual));
    expect(result?.points).toBe(100);
    expect(result?.errorPercent).toBe(0);
    expect(state().phase).toBe("reviewing");
    expect(state().results).toHaveLength(1);
    // A second submit while reviewing does nothing.
    expect(guess("1")).toBeNull();
    state().nextRound();
    expect(state().phase).toBe("guessing");
    expect(state().input).toBe("");
  });

  it("converts a guess in miles to km before scoring", () => {
    state().setUnit("mi");
    const actualKm = state().puzzle.rounds[0].distanceKm;
    const miles = actualKm / 1.609344;
    const result = guess(miles.toFixed(0));
    expect(result?.guessKm).toBe(Math.round(Number(miles.toFixed(0)) * 1.609344));
    expect(result?.points).toBe(100);
  });

  it("finishes after five rounds and wins at 350 or more", () => {
    for (let i = 0; i < ROUNDS; i++) {
      guess(String(state().puzzle.rounds[i].distanceKm));
      state().nextRound();
    }
    expect(state().status).toBe("won");
    expect(state().results.reduce((sum, r) => sum + r.points, 0)).toBe(MAX_SCORE);
    expect(guess("100")).toBeNull();
  });

  it("loses with a low total", () => {
    for (let i = 0; i < ROUNDS; i++) {
      guess("1"); // hopelessly short every time
      state().nextRound();
    }
    expect(state().status).toBe("lost");
    expect(state().results.every((r) => r.points === 0)).toBe(true);
    expect(WIN_SCORE).toBeGreaterThan(0);
  });

  it("practice uses the given puzzle and restores the daily game afterwards", () => {
    guess(String(state().puzzle.rounds[0].distanceKm));
    state().nextRound();
    const dailyGuesses = state().guesses;

    const puzzle: DistancePuzzle = {
      rounds: [
        pair("London", "Paris"),
        pair("Tokyo", "Seoul"),
        pair("Cairo", "Nairobi"),
        pair("New York", "Chicago"),
        pair("Sydney", "Auckland"),
      ],
    };
    state().startPractice(puzzle);
    expect(state().mode).toBe("practice");
    expect(state().puzzle).toBe(puzzle);
    expect(state().guesses).toEqual([]);
    expect(guess("343")?.points).toBe(100);

    state().init();
    expect(state().mode).toBe("daily");
    expect(state().guesses).toEqual(dailyGuesses);
    expect(state().results).toHaveLength(1);
    expect(state().status).toBe("playing");
  });
});
