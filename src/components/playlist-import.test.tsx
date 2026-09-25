import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PlaylistImport, { buildGameSummary, CancelGameConfirmation, shouldShowNewGameButton, SpotifyImportFeedback } from "./playlist-import";

describe("PlaylistImport", () => {
  it("keeps game creation unavailable until a playlist has been reviewed", () => {
    const markup = renderToStaticMarkup(<PlaylistImport />);

    expect(markup).toContain("Previsualizar lista");
    expect(markup).not.toContain("Crear partida");
    expect(markup).toContain("Mínimo: 24 canciones");
    expect(markup).toContain("Recomendamos entre 30 y 45 canciones");
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

  it("shows Spotify import errors beside the import controls", () => {
    const markup = renderToStaticMarkup(<SpotifyImportFeedback message="No se encontró esa playlist de Spotify." />);

    expect(markup).toContain('class="spotify-import-feedback"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-live="assertive"');
    expect(markup).toContain("No se encontró esa playlist de Spotify.");
  });

  it("requires explicit confirmation before cancelling a round", () => {
    const markup = renderToStaticMarkup(<CancelGameConfirmation onCancel={() => undefined} onConfirm={() => undefined} pending={false} />);

    expect(markup).toContain('role="alertdialog"');
    expect(markup).toContain("Cancelar partida definitivamente");
    expect(markup).toContain("Mantener partida");
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
