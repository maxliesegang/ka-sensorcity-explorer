import { describe, expect, it } from "vitest";

import { findClosestFrameIndex, findTimelineStepIndex } from "./timelineNavigation";

const MINUTE = 60_000;
const frames = [0, 15, 30, 60, 90, 180].map((minutes) => ({
  timestamp: minutes * MINUTE,
}));

describe("findClosestFrameIndex", () => {
  it("returns the single frame when there is only one", () => {
    const single = [{ timestamp: 42 }];
    expect(findClosestFrameIndex(single, 0)).toBe(0);
    expect(findClosestFrameIndex(single, 100)).toBe(0);
  });

  it("returns 0 for an empty array", () => {
    expect(findClosestFrameIndex([], 0)).toBe(0);
  });

  it("finds the exact match", () => {
    expect(findClosestFrameIndex(frames, 0)).toBe(0);
    expect(findClosestFrameIndex(frames, 30 * MINUTE)).toBe(2);
    expect(findClosestFrameIndex(frames, 180 * MINUTE)).toBe(5);
  });

  it("rounds to the nearest frame for a time between frames", () => {
    // Halfway between 15 min and 30 min = 22.5 min → closer to 30
    expect(findClosestFrameIndex(frames, 23.5 * MINUTE)).toBe(2);
    // Just before 15 → closer to 15
    expect(findClosestFrameIndex(frames, 14 * MINUTE)).toBe(1);
    // Just after 60 → closer to 60
    expect(findClosestFrameIndex(frames, 61 * MINUTE)).toBe(3);
  });

  it("clamps to boundaries for timestamps outside the range", () => {
    expect(findClosestFrameIndex(frames, -1_000_000)).toBe(0);
    expect(findClosestFrameIndex(frames, 1_000_000_000)).toBe(frames.length - 1);
  });
});

describe("findTimelineStepIndex", () => {
  it("supports one-minute navigation when one-minute frames are available", () => {
    const minuteFrames = [0, 1, 2, 3].map((minutes) => ({
      timestamp: minutes * MINUTE,
    }));
    expect(findTimelineStepIndex(minuteFrames, 1, 1, 1)).toBe(2);
    expect(findTimelineStepIndex(minuteFrames, 2, 1, -1)).toBe(1);
  });

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
