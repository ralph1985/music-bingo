export type ImportedSong = {
  title: string;
  artist: string;
};

export type PlaylistImportResult = {
  songs: ImportedSong[];
  errors: { line: number; message: string }[];
};

export function importPlaylist(input: string): PlaylistImportResult {
  const songs: ImportedSong[] = [];
  const errors: PlaylistImportResult["errors"] = [];
  const seenSongs = new Set<string>();
  const addSong = (title: string, artist: string) => {
    const key = `${title}\u0000${artist}`
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

    if (!seenSongs.has(key)) {
      seenSongs.add(key);
      songs.push({ title, artist });
    }
  };
  const lines = input.split(/\r?\n/);
  const csvRecords = parseCsvRecords(input);
  const header = parseCsvLine(csvRecords[0]?.text ?? "").map(normalizeHeader);
  const titleColumn = header.findIndex((column) => column === "titulo" || column === "title");
  const artistColumn = header.findIndex((column) => column === "artista" || column === "artist");

  if (titleColumn >= 0 && artistColumn >= 0) {
    for (const record of csvRecords.slice(1)) {
      const line = record.text.trim();

      if (!line) {
        continue;
      }

      if (!isValidCsvRecord(record.text)) {
        errors.push({ line: record.line, message: "CSV mal formado." });
        continue;
      }

      const columns = parseCsvLine(record.text);
      const title = columns[titleColumn]?.trim();
      const artist = columns[artistColumn]?.trim();

      if (!title || !artist) {
        errors.push({ line: record.line, message: "Faltan título o artista en el CSV." });
        continue;
      }

      addSong(title, artist);
    }

    return { songs, errors };
  }

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const separator = line.includes(";") ? ";" : " - ";
    const [title, artist, ...extra] = line.split(separator).map((part) => part.trim());

    if (!title || !artist || extra.length > 0) {
      errors.push({ line: index + 1, message: "Se esperaba Título;Artista o Título - Artista." });
      continue;
    }

    addSong(title, artist);
  }

  return { songs, errors };
}

function parseCsvLine(line: string): string[] {
  const columns: string[] = [];
  let column = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (quoted && character === '"' && line[index + 1] === '"') {
      column += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      columns.push(column);
      column = "";
    } else {
      column += character;
    }
  }

  columns.push(column);
  return columns;
}

function isValidCsvRecord(record: string): boolean {
  let quoted = false;
  let fieldStart = true;
  let quoteClosed = false;

  for (let index = 0; index < record.length; index += 1) {
    const character = record[index];

    if (quoted) {
      if (character === '"' && record[index + 1] === '"') {
        index += 1;
      } else if (character === '"') {
        quoted = false;
        quoteClosed = true;
      }
    } else if (character === '"') {
      if (!fieldStart) {
        return false;
      }
      quoted = true;
      fieldStart = false;
    } else if (character === ",") {
      fieldStart = true;
      quoteClosed = false;
    } else {
      if (quoteClosed) {
        return false;
      }
      fieldStart = false;
    }
  }

  return !quoted;
}

function parseCsvRecords(input: string): { text: string; line: number }[] {
  const records: { text: string; line: number }[] = [];
  let text = "";
  let quoted = false;
  let line = 1;
  let recordLine = 1;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted && character === '"' && input[index + 1] === '"') {
      text += '""';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
      text += character;
    } else if (character === "\n") {
      if (quoted) {
        text += character;
      } else {
        records.push({ text: text.replace(/\r$/, ""), line: recordLine });
        text = "";
        recordLine = line + 1;
      }
      line += 1;
    } else {
      text += character;
    }
  }

  records.push({ text: text.replace(/\r$/, ""), line: recordLine });
  return records;
}

function normalizeHeader(value: string): string {
  return value.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
