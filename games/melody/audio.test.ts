import { describe, expect, it } from "vitest";
import {
  DEFAULT_VOLUME,
  ENVELOPE,
  NOTE_DURATION,
  NOTE_SPACING,
  PARTIALS,
  estimatePeakLevel,
  volumeToGain,
} from "./audio";

describe("melody audio levels", () => {
  it("never sends a clipped signal into the compressor, even at full volume", () => {
    expect(estimatePeakLevel(1)).toBeLessThanOrEqual(1);
    expect(estimatePeakLevel(DEFAULT_VOLUME)).toBeLessThan(1);
  });

  it("defaults to a loud level", () => {
    // Within about 3 dB of the maximum pre-compressor peak.
    expect(estimatePeakLevel(DEFAULT_VOLUME)).toBeGreaterThan(estimatePeakLevel(1) * 0.7);
  });

  it("maps the slider monotonically and clamps out-of-range values", () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(-1)).toBe(0);
    expect(volumeToGain(2)).toBe(volumeToGain(1));
    expect(volumeToGain(0.5)).toBeLessThan(volumeToGain(1));
    expect(volumeToGain(0.5)).toBeGreaterThan(volumeToGain(0.25));
  });

  it("gives each note harmonics above the fundamental at lower gain", () => {
    const [fundamental, ...harmonics] = PARTIALS;
    expect(fundamental.ratio).toBe(1);
    expect(harmonics.length).toBeGreaterThanOrEqual(1);
    for (const harmonic of harmonics) {
      expect(harmonic.ratio).toBeGreaterThan(1);
      expect(harmonic.gain).toBeLessThan(fundamental.gain);
      expect(harmonic.gain).toBeGreaterThan(0);
    }
  });

  it("holds a clear sustain before the release", () => {
    const sustainStart = ENVELOPE.attack + ENVELOPE.decay;
    const sustainEnd = NOTE_DURATION - ENVELOPE.release;
    // The sustain is the longest part of the note and sits well above silence.
    expect(sustainEnd - sustainStart).toBeGreaterThan(NOTE_DURATION / 2);
    expect(ENVELOPE.sustainLevel).toBeGreaterThanOrEqual(0.5);
    // Notes in a sequence do not overlap.
    expect(NOTE_SPACING).toBeGreaterThanOrEqual(NOTE_DURATION);
  });
});
