import { describe, expect, it } from "vitest";

import { findTimelineStepIndex } from "./timelineNavigation";

const MINUTE = 60_000;
const frames = [0, 15, 30, 60, 90, 180].map((minutes) => ({
  timestamp: minutes * MINUTE,
}));

describe("findTimelineStepIndex", () => {
  it("supports five-minute navigation when fine-grained frames are available", () => {
    const fineFrames = [0, 5, 10, 15].map((minutes) => ({
      timestamp: minutes * MINUTE,
    }));
    expect(findTimelineStepIndex(fineFrames, 1, 5, 1)).toBe(2);
    expect(findTimelineStepIndex(fineFrames, 2, 5, -1)).toBe(1);
  });

  it("moves to the first frame at or beyond a forward step", () => {
    expect(findTimelineStepIndex(frames, 1, 60, 1)).toBe(4);
  });

  it("moves to the last frame at or beyond a backward step", () => {
    expect(findTimelineStepIndex(frames, 5, 60, -1)).toBe(4);
  });

  it("clamps steps to the timeline boundaries", () => {
    expect(findTimelineStepIndex(frames, 1, 1_440, -1)).toBe(0);
    expect(findTimelineStepIndex(frames, 4, 1_440, 1)).toBe(frames.length - 1);
  });
});
