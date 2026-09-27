import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PlaylistImport, { buildGameSummary, CancelGameConfirmation, getCreateGameReadiness, getTabAfterStartingGame, isSpotifyPlaybackError, pickRandomSongId, PlaybackErrorModal, shouldShowNewGameButton, songMatchesSearch, SpotifyImportFeedback } from "./playlist-import";

describe("PlaylistImport", () => {
  it("keeps game creation unavailable until a playlist has been reviewed", () => {
    const markup = renderToStaticMarkup(<PlaylistImport />);

    expect(markup).toContain("Previsualizar lista");
    expect(markup).not.toContain("Crear partida");
    expect(markup).toContain("Mínimo: 24 canciones");
    expect(markup).toContain("Recomendamos entre 30 y 45 canciones");
    expect(markup).toContain('data-icon="spotify"');
    expect(markup).toContain('data-icon="clipboard"');
    expect(markup).toContain('data-icon="eye"');
  });

  it("keeps the create-game action visible and explains how many valid songs are missing", () => {
    expect(getCreateGameReadiness(22, 0)).toEqual({
      canCreate: false,
      message: "Faltan 2 canciones válidas para crear la partida. Añádelas a la lista y vuelve a previsualizarla.",
    });
    expect(getCreateGameReadiness(23, 0)).toEqual({
      canCreate: false,
      message: "Falta 1 canción válida para crear la partida. Añádela a la lista y vuelve a previsualizarla.",
    });
    expect(getCreateGameReadiness(24, 0)).toEqual({ canCreate: true, message: null });
  });

  it("starts the administrator dashboard on the setup tab", () => {
    const markup = renderToStaticMarkup(<PlaylistImport />);

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain("Preparar");
    expect(markup).toContain("LISTA DE CANCIONES");
    expect(markup).not.toContain("CANCIONES PENDIENTES");
  });

  it("only shows the new-game action in setup after a round is completed", () => {
    expect(shouldShowNewGameButton("completed", "setup")).toBe(true);
    expect(shouldShowNewGameButton("completed", "room")).toBe(false);
    expect(shouldShowNewGameButton("waiting", "setup")).toBe(false);
  });

  it("takes the host straight to announcing songs when the game starts", () => {
    expect(getTabAfterStartingGame()).toBe("calls");
  });

  it("selects a pending song at random without selecting from an empty list", () => {
    expect(pickRandomSongId(["song-1", "song-2", "song-3"], 0)).toBe("song-1");
    expect(pickRandomSongId(["song-1", "song-2", "song-3"], 0.99)).toBe("song-3");
    expect(pickRandomSongId([], 0.5)).toBeNull();
  });

  it("matches songs by title or artist without accents", () => {
    const song = { artist: "Jarabe de Palo", title: "La Flaca" };

    expect(songMatchesSearch(song, "flaca")).toBe(true);
    expect(songMatchesSearch(song, "jarabe")).toBe(true);
    expect(songMatchesSearch({ ...song, title: "Canción de verano" }, "cancion")).toBe(true);
    expect(songMatchesSearch(song, "queen")).toBe(false);
  });

  it("shows Spotify import errors beside the import controls", () => {
    const markup = renderToStaticMarkup(<SpotifyImportFeedback message="No se encontró esa playlist de Spotify." />);

    expect(markup).toContain('class="spotify-import-feedback"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-live="assertive"');
    expect(markup).toContain("No se encontró esa playlist de Spotify.");
  });

  it("shows an actionable modal for playback errors", () => {
    const markup = renderToStaticMarkup(<PlaybackErrorModal message="No hay ningún dispositivo Spotify activo." onClose={() => undefined} onRetry={() => undefined} />);

    expect(isSpotifyPlaybackError("No hay ningún dispositivo Spotify activo.")).toBe(true);
    expect(isSpotifyPlaybackError("No se pudo anunciar la canción.")).toBe(false);
    expect(markup).toContain('role="alertdialog"');
    expect(markup).toContain("No se pudo reproducir");
    expect(markup).toContain("Reintentar");
    expect(markup).toContain("Reconectar Spotify");
    expect(markup).toContain("La canción todavía no se ha anunciado");
  });

  it("requires explicit confirmation before cancelling a round", () => {
    const markup = renderToStaticMarkup(<CancelGameConfirmation onCancel={() => undefined} onConfirm={() => undefined} pending={false} />);

    expect(markup).toContain('role="alertdialog"');
    expect(markup).toContain("Cancelar partida definitivamente");
    expect(markup).toContain("Mantener partida");
    expect(markup).toContain('data-icon="x-circle"');
    expect(markup).toContain('data-icon="check"');
  });

  it("builds a copyable results summary with the called songs and timestamps", () => {
    const summary = buildGameSummary({
      bingoWinner: "Luis",
      calledSongs: [{ artist: "ABBA", title: "Dancing Queen" }],
      completedAt: Date.UTC(2026, 8, 25, 18, 42),
      joinCode: "FIESTA",
      lineWinner: "Ana",
      startedAt: Date.UTC(2026, 8, 25, 18, 0),
    });

    expect(summary).toContain("RESULTADOS · FIESTA");
    expect(summary).toContain("Línea: Ana");
    expect(summary).toContain("¡Bingo!: Luis");
    expect(summary).toContain("Dancing Queen — ABBA");
    expect(summary).toContain("Inicio:");
    expect(summary).toContain("Fin:");
  });
});
