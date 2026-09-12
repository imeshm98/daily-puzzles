import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_GUESS, getDailyColour, MAX_TRIES, type RGB } from "./logic";
import { useColourMixStore } from "./store";

function setColour(colour: RGB) {
  const store = useColourMixStore.getState();
  store.setChannel("r", colour.r);
  store.setChannel("g", colour.g);
  store.setChannel("b", colour.b);
}

describe("colour mix store", () => {
  beforeEach(() => {
    useColourMixStore.setState(useColourMixStore.getInitialState());
    useColourMixStore.getState().init();
  });

  it("starts in daily mode with today's target and centred sliders", () => {
    const state = useColourMixStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.mode).toBe("daily");
    expect(state.target).toEqual(getDailyColour(state.dateKey));
    expect(state.current).toEqual(DEFAULT_GUESS);
    expect(state.guesses).toEqual([]);
    expect(state.status).toBe("playing");
  });

  it("clamps slider values", () => {
    useColourMixStore.getState().setChannel("r", 999);
    useColourMixStore.getState().setChannel("g", -3);
    expect(useColourMixStore.getState().current).toMatchObject({ r: 255, g: 0 });
  });

  it("scores a try, keeps the sliders in place and gives hints", () => {
    const target = useColourMixStore.getState().target;
    const guess = { r: target.r - 40, g: target.g + 40, b: target.b };
    setColour(guess);
    const result = useColourMixStore.getState().submit();
    expect(result?.hints).toEqual(["higher", "lower", "close"]);
    expect(result?.status).toBe("playing");
    expect(result?.tries).toBe(1);
    const state = useColourMixStore.getState();
    expect(state.current).toEqual(guess);
    expect(state.hints).toEqual([["higher", "lower", "close"]]);
    expect(state.scores[0]).toBeLessThan(95);
  });

  it("wins on an exact match", () => {
    setColour(useColourMixStore.getState().target);
    const result = useColourMixStore.getState().submit();
    expect(result?.score).toBe(100);
    expect(result?.status).toBe("won");
    expect(useColourMixStore.getState().submit()).toBeNull();
  });

  it("loses after three tries below 95%", () => {
    setColour({ r: 0, g: 0, b: 0 });
    let result = null;
    for (let i = 0; i < MAX_TRIES; i++) result = useColourMixStore.getState().submit();
    expect(result?.status).toBe("lost");
    expect(useColourMixStore.getState().guesses).toHaveLength(MAX_TRIES);
    expect(useColourMixStore.getState().submit()).toBeNull();
  });

  it("practice uses the given target, resets the sliders and restores the daily game after", () => {
    const target = useColourMixStore.getState().target;
    setColour(target);
    useColourMixStore.getState().submit(); // daily won

    useColourMixStore.getState().startPractice({ r: 40, g: 60, b: 80 });
    let state = useColourMixStore.getState();
    expect(state.mode).toBe("practice");
    expect(state.target).toEqual({ r: 40, g: 60, b: 80 });
    expect(state.current).toEqual(DEFAULT_GUESS);
    expect(state.guesses).toEqual([]);

    setColour({ r: 40, g: 60, b: 80 });
    expect(useColourMixStore.getState().submit()?.status).toBe("won");

    useColourMixStore.getState().init();
    state = useColourMixStore.getState();
    expect(state.mode).toBe("daily");
    expect(state.status).toBe("won");
    expect(state.guesses).toEqual([target]);
  });
});
