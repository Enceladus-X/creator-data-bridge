import { describe, expect, it } from "vitest";
import { resolveDateRange } from "../src/youtube/youtube-service";

describe("resolveDateRange", () => {
  it("uses the previous complete UTC day and includes the requested number of days", () => {
    expect(resolveDateRange(28, new Date("2026-07-11T12:00:00Z"))).toEqual({
      startDate: "2026-06-13",
      endDate: "2026-07-10",
    });
  });
});
