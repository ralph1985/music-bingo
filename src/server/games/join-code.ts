const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const JOIN_CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 8;

type GenerateJoinCodeInput = {
  exists: (code: string) => Promise<boolean>;
  randomBytes?: (size: number) => Uint8Array;
};

export async function generateJoinCode({
  exists,
  randomBytes = (size) => crypto.getRandomValues(new Uint8Array(size)),
}: GenerateJoinCodeInput): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const bytes = randomBytes(JOIN_CODE_LENGTH);

    if (bytes.length !== JOIN_CODE_LENGTH) {
      throw new Error("La fuente aleatoria devolvió una longitud inválida.");
    }

    const code = Array.from(bytes, (value) =>
      JOIN_CODE_ALPHABET[value & 31],
    ).join("");

    if (!(await exists(code))) {
      return code;
    }
  }

  throw new Error("No se pudo generar un código de partida único.");
}
