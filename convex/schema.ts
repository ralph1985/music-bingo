import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const songValidator = v.object({
  artist: v.string(),
  id: v.string(),
  title: v.string(),
});

const cardValidator = v.object({
  id: v.string(),
  markedSongIds: v.array(v.string()),
  songs: v.array(songValidator),
});

export default defineSchema({
  games: defineTable({
    calledSongIds: v.array(v.string()),
    completedAt: v.optional(v.number()),
    fullCardWinnerCardId: v.optional(v.union(v.string(), v.null())),
    fullCardWinnerPlayerId: v.union(v.id("players"), v.null()),
    joinCode: v.string(),
    lineWinnerCardId: v.optional(v.union(v.string(), v.null())),
    lineWinnerPlayerId: v.union(v.id("players"), v.null()),
    playlist: v.array(songValidator),
    startedAt: v.optional(v.number()),
    status: v.union(
      v.literal("waiting"),
      v.literal("playing"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  }).index("by_joinCode", ["joinCode"]).index("by_status", ["status"]),
  players: defineTable({
    card: v.optional(v.object({
      cols: v.number(),
      rows: v.number(),
      songs: v.array(songValidator),
    })),
    cards: v.optional(v.array(cardValidator)),
    cols: v.optional(v.number()),
    eliminated: v.boolean(),
    gameId: v.id("games"),
    markedSongIds: v.optional(v.array(v.string())),
    name: v.string(),
    playerIdentity: v.string(),
    rows: v.optional(v.number()),
  }).index("by_gameId", ["gameId"]).index("by_gameId_and_playerIdentity", ["gameId", "playerIdentity"]),
});
