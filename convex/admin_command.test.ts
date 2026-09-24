import { describe, expect, it } from "vitest";

import { isAuthorizedAdminCommand, parseCallSongRequest, parseCreateGameRequest } from "./admin_command";

describe("admin command request", () => {
  it("accepts only the configured command secret", () => {
    expect(isAuthorizedAdminCommand("shared-test-secret", "shared-test-secret")).toBe(true);
    expect(isAuthorizedAdminCommand("wrong-secret", "shared-test-secret")).toBe(false);
    expect(isAuthorizedAdminCommand(null, "shared-test-secret")).toBe(false);
  });

  it("parses a complete game request", () => {
    expect(parseCreateGameRequest({
      joinCode: "FIESTA",
      playlist: [{ id: "song-1", title: "La Flaca", artist: "Jarabe de Palo" }],
    })).toEqual({
      joinCode: "FIESTA",
      playlist: [{ id: "song-1", title: "La Flaca", artist: "Jarabe de Palo" }],
    });
  });

  it("rejects malformed game requests", () => {
    expect(parseCreateGameRequest({ joinCode: "FIESTA", playlist: [{ id: "song-1" }] })).toBeNull();
  });

  it("parses an administrative song call", () => {
    expect(parseCallSongRequest({ joinCode: "FIESTA", songId: "song-1" })).toEqual({
      joinCode: "FIESTA",
      songId: "song-1",
    });
    expect(parseCallSongRequest({ joinCode: "FIESTA" })).toBeNull();
  });
});
