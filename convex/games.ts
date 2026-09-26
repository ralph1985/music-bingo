import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

import { v } from "convex/values";

import { CARD_COLS, CARD_ROWS, generateCards, type GeneratedCard } from "../shared/card-generation";
import { isValidCardCount } from "../shared/card-config";

const MAX_PLAYLIST_SONGS = 75;
const MIN_PLAYLIST_SONGS = 24;
const MIN_GAME_PLAYERS = 2;

type StoredSong = { artist: string; id: string; title: string };
type StoredCard = GeneratedCard;

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
      fullCardWinnerCardId: null,
      fullCardWinnerPlayerId: null,
      joinCode: args.joinCode,
      lineWinnerCardId: null,
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
      ...(game.status === "waiting" ? { startedAt: Date.now() } : {}),
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

    const players = await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .take(MIN_GAME_PLAYERS);
    if (players.length < MIN_GAME_PLAYERS) {
      throw new Error(`A game requires at least ${MIN_GAME_PLAYERS} players to start.`);
    }

    await ctx.db.patch("games", game._id, { startedAt: Date.now(), status: "playing" });
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

    await ctx.db.patch("games", game._id, { completedAt: Date.now(), status: "completed" });
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
      .first() ?? await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .order("desc")
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
    cardCount: v.optional(v.number()),
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
      const cards = playerCards(existingPlayer);
      if (!existingPlayer.cards) {
        await ctx.db.patch("players", existingPlayer._id, {
          cards,
          cols: existingPlayer.card?.cols ?? CARD_COLS,
          rows: existingPlayer.card?.rows ?? CARD_ROWS,
        });
      }
      return { cards, cols: existingPlayer.cols ?? existingPlayer.card?.cols ?? CARD_COLS, playerId: existingPlayer._id, rows: existingPlayer.rows ?? existingPlayer.card?.rows ?? CARD_ROWS };
    }

    const cardCount = args.cardCount ?? 1;
    if (!isValidCardCount(cardCount)) {
      throw new Error("El número de cartones debe estar entre 1 y 4.");
    }

    const cards = generateCards({ cardCount, playerIdentity: args.playerIdentity, playlist: game.playlist });
    const playerId = await ctx.db.insert("players", {
      cards,
      cols: CARD_COLS,
      eliminated: false,
      gameId: game._id,
      name,
      playerIdentity: args.playerIdentity,
      rows: CARD_ROWS,
    });

    return { cards, cols: CARD_COLS, playerId, rows: CARD_ROWS };
  },
});

export const markCell = mutation({
  args: {
    cardId: v.optional(v.string()),
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

    const cards = player ? playerCards(player) : [];
    const card = cards.find((candidate) => candidate.id === (args.cardId ?? cards[0]?.id));
    if (!player || !card || !card.songs.some((song) => song.id === args.songId)) {
      throw new Error("The selected card cell cannot be marked.");
    }
    await ctx.db.patch("players", player._id, {
      cards: cards.map((candidate) => candidate.id !== card.id ? candidate : {
        ...candidate,
        markedSongIds: candidate.markedSongIds.includes(args.songId)
          ? candidate.markedSongIds.filter((songId) => songId !== args.songId)
          : [...candidate.markedSongIds, args.songId],
      }),
      eliminated: false,
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

    const winningCard = playerCards(player).find((card) => hasValidLine(card, game.calledSongIds));
    if (!winningCard) {
      return { outcome: "invalid" };
    }

    await ctx.db.patch("games", game._id, { lineWinnerCardId: winningCard.id, lineWinnerPlayerId: player._id });
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

    const winningCard = playerCards(player).find((card) => card.songs.every((song) => card.markedSongIds.includes(song.id) && game.calledSongIds.includes(song.id)));
    if (!winningCard) {
      return { outcome: "invalid" };
    }

    await ctx.db.patch("games", game._id, {
      completedAt: Date.now(),
      fullCardWinnerCardId: winningCard.id,
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

    const cards = playerCards(player);
    return {
      game: {
        calledSongCount: game.calledSongIds.length,
        calledCardSongIds: cards.flatMap((card) => card.songs)
          .map((song) => song.id)
          .filter((songId) => game.calledSongIds.includes(songId)),
        fullCardClaimed: Boolean(game.fullCardWinnerPlayerId),
        lineClaimed: Boolean(game.lineWinnerPlayerId),
        status: game.status,
      },
      player: {
        cards,
        cols: player.cols ?? player.card?.cols ?? CARD_COLS,
        eliminated: player.eliminated,
        name: player.name,
        rows: player.rows ?? player.card?.rows ?? CARD_ROWS,
      },
    };
  },
});

function playerCards(player: { card?: { cols: number; rows: number; songs: StoredSong[] }; cards?: StoredCard[]; markedSongIds?: string[]; playerIdentity: string }): StoredCard[] {
  if (player.cards) return player.cards;
  if (!player.card) return [];
  return [{
    id: `card-legacy-${player.playerIdentity}`,
    markedSongIds: player.markedSongIds ?? [],
    songs: player.card.songs,
  }];
}

function hasValidLine(card: StoredCard, calledSongIds: string[]): boolean {
  const visualColumns = CARD_COLS;
  const visualRows = card.songs.length / visualColumns;

  for (let column = 0; column < visualColumns; column += 1) {
    const songs = Array.from({ length: visualRows }, (_, row) => card.songs[row * visualColumns + column]);

    if (songs.every((song) => card.markedSongIds.includes(song.id) && calledSongIds.includes(song.id))) {
      return true;
    }
  }

  return false;
}
