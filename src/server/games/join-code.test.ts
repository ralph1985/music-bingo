import { describe, expect, it } from "vitest";

import { generateJoinCode } from "./join-code";

describe("generateJoinCode", () => {
  it("uses unambiguous uppercase characters", async () => {
    const code = await generateJoinCode({
      exists: async () => false,
      randomBytes: () => new Uint8Array([0, 1, 2, 3, 4, 5]),
    });

    expect(code).toBe("ABCDEF");
  });

  it("rejects an invalid random source output length", async () => {
    await expect(
      generateJoinCode({
        exists: async () => false,
        randomBytes: () => new Uint8Array([0]),
      }),
    ).rejects.toThrow("fuente aleatoria");
  });
});
