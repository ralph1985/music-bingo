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
    ),
  }).index("by_joinCode", ["joinCode"]),
});
