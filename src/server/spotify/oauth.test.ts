import { describe, expect, it } from "vitest";

import { buildSpotifyAuthorizeUrl, decryptSpotifyRefreshToken, encryptSpotifyRefreshToken, verifySpotifyState } from "./oauth";

describe("Spotify OAuth helpers", () => {
  it("creates a scoped authorization URL and validates state for the same admin session", () => {
    const url = new URL(buildSpotifyAuthorizeUrl({
      clientId: "client-id",
      redirectUri: "https://example.test/callback",
      session: "admin-session",
      sessionSecret: "session-secret",
    }));

    expect(url.origin).toBe("https://accounts.spotify.com");
    expect(url.searchParams.get("scope")).toBe("playlist-read-private playlist-read-collaborative");
    expect(verifySpotifyState(url.searchParams.get("state")!, "admin-session", "session-secret")).toBe(true);
    expect(verifySpotifyState(url.searchParams.get("state")!, "other-session", "session-secret")).toBe(false);
  });

  it("encrypts a refresh token without retaining it in the cookie payload", () => {
    const key = Buffer.alloc(32, 1).toString("base64");
    const encrypted = encryptSpotifyRefreshToken("refresh-token", key);

    expect(encrypted).not.toContain("refresh-token");
    expect(decryptSpotifyRefreshToken(encrypted, key)).toBe("refresh-token");
  });
});
