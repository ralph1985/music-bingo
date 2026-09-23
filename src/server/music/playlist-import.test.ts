import { describe, expect, it } from "vitest";

import { importPlaylist } from "./playlist-import";

describe("importPlaylist", () => {
  it("importa texto pegado separado por punto y coma", () => {
    expect(importPlaylist("La Flaca;Jarabe de Palo\nDancing Queen;ABBA")).toEqual({
      songs: [
        { title: "La Flaca", artist: "Jarabe de Palo" },
        { title: "Dancing Queen", artist: "ABBA" },
      ],
      errors: [],
    });
  });

  it("acepta el formato Título - Artista", () => {
    expect(importPlaylist("Mediterráneo - Joan Manuel Serrat")).toEqual({
      songs: [{ title: "Mediterráneo", artist: "Joan Manuel Serrat" }],
      errors: [],
    });
  });

  it("importa CSV con cabecera y comillas UTF-8", () => {
    const csv = 'Título,Artista\n"Bésame mucho, otra vez","Consuelo Velázquez"';

    expect(importPlaylist(csv)).toEqual({
      songs: [{ title: "Bésame mucho, otra vez", artist: "Consuelo Velázquez" }],
      errors: [],
    });
  });

  it("reconoce una cabecera CSV UTF-8 con BOM", () => {
    expect(importPlaylist("\uFEFFTítulo,Artista\nLa Flaca,Jarabe de Palo")).toEqual({
      songs: [{ title: "La Flaca", artist: "Jarabe de Palo" }],
      errors: [],
    });
  });

  it("importa campos CSV entrecomillados que contienen saltos de línea", () => {
    const csv = 'Título,Artista\n"Canción\nen directo",Artista';

    expect(importPlaylist(csv)).toEqual({
      songs: [{ title: "Canción\nen directo", artist: "Artista" }],
      errors: [],
    });
  });

  it("informa de CSV mal formado en vez de alterar campos entrecomillados", () => {
    expect(importPlaylist('Título,Artista\n"Song"x,Artist')).toEqual({
      songs: [],
      errors: [{ line: 2, message: "CSV mal formado." }],
    });
  });

  it("considera vacíos los campos CSV entrecomillados sin contenido", () => {
    expect(importPlaylist('Título,Artista\n"",ABBA')).toEqual({
      songs: [],
      errors: [{ line: 2, message: "Faltan título o artista en el CSV." }],
    });
  });

  it("elimina duplicados y explica filas inválidas", () => {
    expect(importPlaylist("La Flaca;Jarabe de Palo\n la flaca ; JARABE DE PALO \nSin artista")).toEqual({
      songs: [{ title: "La Flaca", artist: "Jarabe de Palo" }],
      errors: [{ line: 3, message: "Se esperaba Título;Artista o Título - Artista." }],
    });
  });
});
