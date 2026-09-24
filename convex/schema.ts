import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const songValidator = v.object({
  artist: v.string(),
  id: v.string(),
  title: v.string(),
});

export default defineSchema({
  games: defineTable({
    calledSongIds: v.array(v.string()),
    fullCardWinnerPlayerId: v.union(v.string(), v.null()),
    joinCode: v.string(),
    lineWinnerPlayerId: v.union(v.string(), v.null()),
    playlist: v.array(songValidator),
    status: v.union(
      v.literal("waiting"),
      v.literal("playing"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  }).index("by_joinCode", ["joinCode"]).index("by_status", ["status"]),
  players: defineTable({
    card: v.object({
      cols: v.number(),
      rows: v.number(),
      songs: v.array(songValidator),
    }),
    eliminated: v.boolean(),
    gameId: v.id("games"),
    markedSongIds: v.array(v.string()),
    name: v.string(),
    playerIdentity: v.string(),
  }).index("by_gameId_and_playerIdentity", ["gameId", "playerIdentity"]),
});
