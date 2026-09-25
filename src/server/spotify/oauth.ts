import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

type SpotifyAuthorizeInput = {
  clientId: string;
  redirectUri: string;
  session: string;
  sessionSecret: string;
};

type SpotifyState = { expiresAt: number; nonce: string; sessionHash: string };

const SPOTIFY_SCOPES = ["playlist-read-private", "playlist-read-collaborative"];

export function buildSpotifyAuthorizeUrl(input: SpotifyAuthorizeInput): string {
  const state = createSpotifyState(input.session, input.sessionSecret);
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", SPOTIFY_SCOPES.join(" "));
  url.searchParams.set("show_dialog", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

export function verifySpotifyState(state: string, session: string, sessionSecret: string): boolean {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = sign(payload, sessionSecret);
  if (signature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SpotifyState;
    return typeof decoded.nonce === "string"
      && decoded.expiresAt >= Date.now()
      && decoded.sessionHash === hashSession(session);
  } catch {
    return false;
  }
}

export function encryptSpotifyRefreshToken(refreshToken: string, key: string): string {
  const encryptionKey = parseEncryptionKey(key);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSpotifyRefreshToken(value: string, key: string): string {
  const [iv, tag, ciphertext] = value.split(".");
  if (!iv || !tag || !ciphertext) throw new Error("Spotify token storage is invalid.");

  const decipher = createDecipheriv("aes-256-gcm", parseEncryptionKey(key), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

function createSpotifyState(session: string, sessionSecret: string): string {
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Date.now() + 10 * 60_000,
    nonce: randomBytes(16).toString("base64url"),
    sessionHash: hashSession(session),
  })).toString("base64url");
  return `${payload}.${sign(payload, sessionSecret)}`;
}

function hashSession(session: string): string {
  return createHash("sha256").update(session).digest("base64url");
}

function sign(payload: string, sessionSecret: string): string {
  return createHmac("sha256", sessionSecret).update(payload).digest("base64url");
}

function parseEncryptionKey(value: string): Buffer {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("SPOTIFY_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}
