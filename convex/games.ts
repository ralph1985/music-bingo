import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

import { v } from "convex/values";

const MAX_PLAYLIST_SONGS = 75;
const MIN_PLAYLIST_SONGS = 24;
const CARD_SONGS = 12;

type StoredSong = { artist: string; id: string; title: string };
type StoredCard = { cols: number; rows: number; songs: StoredSong[] };

const songValidator = v.object({
  artist: v.string(),
  id: v.string(),
  title: v.string(),
});

export const createGame = internalMutation({
  args: {
    joinCode: v.string(),
    playlist: v.array(songValidator),
  },
  handler: async (ctx, args) => {
    if (args.playlist.length < MIN_PLAYLIST_SONGS) {
      throw new Error(`A game requires at least ${MIN_PLAYLIST_SONGS} songs.`);
    }
    if (args.playlist.length > MAX_PLAYLIST_SONGS) {
      throw new Error(`A game can contain at most ${MAX_PLAYLIST_SONGS} songs.`);
    }
    if (new Set(args.playlist.map((song) => song.id)).size !== args.playlist.length) {
      throw new Error("A game playlist requires unique identifiers.");
    }

    const existingGame = await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (existingGame) {
      return null;
    }

    const waitingGame = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .first();
    const playingGame = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "playing"))
      .first();

    if (waitingGame || playingGame) {
      return null;
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

export const callSong = internalMutation({
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

export const startGame = internalMutation({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (!game || game.status !== "waiting") {
      return null;
    }

    await ctx.db.patch("games", game._id, { status: "playing" });
    return null;
  },
});

export const cancelGame = internalMutation({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (!game || game.status === "completed" || game.status === "cancelled") {
      return null;
    }

    await ctx.db.patch("games", game._id, { status: "cancelled" });
    return null;
  },
});

export const finishGame = internalMutation({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (!game || game.status === "completed" || game.status === "cancelled") {
      return null;
    }

    await ctx.db.patch("games", game._id, { status: "completed" });
    return null;
  },
});

export const getActiveGame = internalQuery({
  args: {},
  handler: async (ctx) => {
    const waitingGame = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .first();

    return waitingGame ?? await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "playing"))
      .first();
  },
});

export const getActiveAdminGame = internalQuery({
  args: {},
  handler: async (ctx) => {
    const waitingGame = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .first();
    const game = waitingGame ?? await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "playing"))
      .first();
    if (!game) {
      return null;
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .collect();
    return { game, players: players.map((player) => ({ id: player._id, name: player.name })) };
  },
});

export const getAdminGameByCode = internalQuery({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();
    if (!game) {
      return null;
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .collect();
    return { game, players: players.map((player) => ({ id: player._id, name: player.name })) };
  },
});

export const joinPlayer = mutation({
  args: {
    joinCode: v.string(),
    name: v.string(),
    playerIdentity: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();

    if (!name || name.length > 50) {
      throw new Error("Player name must contain between 1 and 50 characters.");
    }

    const game = await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (!game || game.status !== "waiting") {
      throw new Error("Game not found.");
    }

    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_gameId_and_playerIdentity", (q) =>
        q.eq("gameId", game._id).eq("playerIdentity", args.playerIdentity),
      )
      .unique();

    if (existingPlayer) {
      return { card: existingPlayer.card, playerId: existingPlayer._id };
    }

    const card = generateCard(game.playlist, args.playerIdentity);
    const playerId = await ctx.db.insert("players", {
      card,
      eliminated: false,
      gameId: game._id,
      markedSongIds: [],
      name,
      playerIdentity: args.playerIdentity,
    });

    return { card, playerId };
  },
});

export const markCell = mutation({
  args: {
    joinCode: v.string(),
    playerIdentity: v.string(),
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
    if (game.status === "completed" || game.status === "cancelled") {
      throw new Error("Game is not active.");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_gameId_and_playerIdentity", (q) =>
        q.eq("gameId", game._id).eq("playerIdentity", args.playerIdentity),
      )
      .unique();

    if (
      !player
      || !player.card.songs.some((song) => song.id === args.songId)
    ) {
      throw new Error("The selected card cell cannot be marked.");
    }
    if (player.markedSongIds.includes(args.songId)) {
      await ctx.db.patch("players", player._id, {
        eliminated: false,
        markedSongIds: player.markedSongIds.filter((songId) => songId !== args.songId),
      });
      return null;
    }

    await ctx.db.patch("players", player._id, {
      eliminated: false,
      markedSongIds: [...player.markedSongIds, args.songId],
    });
    return null;
  },
});

export const claimLine = mutation({
  args: {
    joinCode: v.string(),
    playerIdentity: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (!game || game.status !== "playing" || game.lineWinnerPlayerId) {
      return { outcome: "unavailable" };
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_gameId_and_playerIdentity", (q) =>
        q.eq("gameId", game._id).eq("playerIdentity", args.playerIdentity),
      )
      .unique();

    if (!player || player.eliminated) {
      return { outcome: "unavailable" };
    }

    if (!hasValidLine(player.card, player.markedSongIds, game.calledSongIds)) {
      return { outcome: "invalid" };
    }

    await ctx.db.patch("games", game._id, { lineWinnerPlayerId: player._id });
    return { outcome: "won" };
  },
});

export const claimFullCard = mutation({
  args: {
    joinCode: v.string(),
    playerIdentity: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (!game || game.status !== "playing" || game.fullCardWinnerPlayerId) {
      return { outcome: "unavailable" };
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_gameId_and_playerIdentity", (q) =>
        q.eq("gameId", game._id).eq("playerIdentity", args.playerIdentity),
      )
      .unique();

    if (!player || player.eliminated) {
      return { outcome: "unavailable" };
    }

    if (!player.card.songs.every((song) => player.markedSongIds.includes(song.id) && game.calledSongIds.includes(song.id))) {
      return { outcome: "invalid" };
    }

    await ctx.db.patch("games", game._id, {
      fullCardWinnerPlayerId: player._id,
      status: "completed",
    });
    return { outcome: "won" };
  },
});

export const getByCode = internalQuery({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();
  },
});

export const getJoinAvailability = query({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    return { available: game?.status === "waiting" };
  },
});

export const getPlayerGame = query({
  args: {
    joinCode: v.string(),
    playerIdentity: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (!game) {
      return null;
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_gameId_and_playerIdentity", (q) =>
        q.eq("gameId", game._id).eq("playerIdentity", args.playerIdentity),
      )
      .unique();

    if (!player) {
      return null;
    }

    return {
      game: {
        calledSongCount: game.calledSongIds.length,
        calledCardSongIds: player.card.songs
          .map((song) => song.id)
          .filter((songId) => game.calledSongIds.includes(songId)),
        fullCardClaimed: Boolean(game.fullCardWinnerPlayerId),
        lineClaimed: Boolean(game.lineWinnerPlayerId),
        status: game.status,
      },
      player: {
        card: player.card,
        eliminated: player.eliminated,
        markedSongIds: player.markedSongIds,
        name: player.name,
      },
    };
  },
});

function generateCard(playlist: StoredSong[], seed: string): StoredCard {
  const songs = [...playlist];
  const random = createSeededRandom(seed);

  for (let index = songs.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [songs[index], songs[swapIndex]] = [songs[swapIndex], songs[index]];
  }

  return { cols: 3, rows: 4, songs: songs.slice(0, CARD_SONGS) };
}

function createSeededRandom(seed: string): () => number {
  let state = 2166136261;

  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hasValidLine(card: StoredCard, markedSongIds: string[], calledSongIds: string[]): boolean {
  const visualColumns = 3;
  const visualRows = card.songs.length / visualColumns;

  for (let column = 0; column < visualColumns; column += 1) {
    const songs = Array.from({ length: visualRows }, (_, row) => card.songs[row * visualColumns + column]);

    if (songs.every((song) => markedSongIds.includes(song.id) && calledSongIds.includes(song.id))) {
      return true;
    }
  }

  return false;
}
