import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MAX_PLAYLIST_SONGS = 75;

const songValidator = v.object({
  artist: v.string(),
  id: v.string(),
  title: v.string(),
});

export const createDemoGame = mutation({
  args: {
    joinCode: v.string(),
    playlist: v.array(songValidator),
  },
  handler: async (ctx, args) => {
    if (args.playlist.length > MAX_PLAYLIST_SONGS) {
      throw new Error(`A demo game can contain at most ${MAX_PLAYLIST_SONGS} songs.`);
    }

    const existingGame = await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (existingGame) {
      throw new Error("A game already exists for this join code.");
    }

    return await ctx.db.insert("games", {
      calledSongIds: [],
      fullCardWinnerPlayerId: null,
      joinCode: args.joinCode,
      lineWinnerPlayerId: null,
      playlist: args.playlist,
      status: "waiting",
    });
  },
});

export const callSong = mutation({
  args: {
    joinCode: v.string(),
    songId: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (!game) {
      throw new Error("Game not found.");
    }
    if (!game.playlist.some((song) => song.id === args.songId)) {
      throw new Error("Song is not on this game's playlist.");
    }
    if (game.calledSongIds.includes(args.songId)) {
      throw new Error("Song has already been called.");
    }

    await ctx.db.patch("games", game._id, {
      calledSongIds: [...game.calledSongIds, args.songId],
      status: game.status === "waiting" ? "playing" : game.status,
    });
  },
});

export const getByCode = query({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();
  },
});
