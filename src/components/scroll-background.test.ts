import { describe, expect, it } from "vitest";
import { getBackgroundShift } from "./scroll-background";

describe("getBackgroundShift", () => {
  it("moves the background subtly with the page scroll", () => {
    expect(getBackgroundShift(500)).toBe(40);
  });

  it("does not move backwards or grow without a limit", () => {
    expect(getBackgroundShift(-20)).toBe(0);
    expect(getBackgroundShift(10_000)).toBe(160);
  });
});
