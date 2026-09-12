import { describe, expect, it } from "vitest";
import { createRng, hashString, mulberry32, pickOne, randomInt, shuffle } from "./random";

describe("hashString", () => {
  it("is stable and returns an unsigned 32-bit integer", () => {
    const h = hashString("melody:2026-09-14");
    expect(h).toBe(hashString("melody:2026-09-14"));
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it("differs for nearby strings", () => {
    expect(hashString("melody:2026-09-14")).not.toBe(hashString("melody:2026-09-15"));
    expect(hashString("melody:2026-09-14")).not.toBe(hashString("other:2026-09-14"));
  });
});

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces values in [0, 1) that differ across seeds", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe("createRng helpers", () => {
  it("is deterministic per seed string", () => {
    expect(createRng("x")()).toBe(createRng("x")());
    expect(createRng("x")()).not.toBe(createRng("y")());
  });

  it("randomInt stays within range and pickOne returns a member", () => {
    const rng = createRng("range");
    for (let i = 0; i < 500; i++) {
      const n = randomInt(rng, 8);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(8);
    }
    expect(["a", "b", "c"]).toContain(pickOne(rng, ["a", "b", "c"]));
  });

  it("shuffle keeps the same elements and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(createRng("shuffle"), input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(out).toEqual(shuffle(createRng("shuffle"), input));
  });
});
