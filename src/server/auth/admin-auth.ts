import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

const SESSION_VERSION = 1;

type SessionPayload = {
  exp: number;
  v: number;
};

export function verifyAdminPassword(password: string, passwordHash: string | undefined): boolean {
  if (!passwordHash) {
    return false;
  }

  const [algorithm, saltHex, expectedHashHex] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !saltHex || !expectedHashHex) {
    return false;
  }

  try {
    const actualHash = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
    const expectedHash = Buffer.from(expectedHashHex, "hex");

    return expectedHash.length === actualHash.length && timingSafeEqual(expectedHash, actualHash);
  } catch {
    return false;
  }
}

export function createAdminSession(sessionSecret: string, now: number, durationMs: number): string {
  const payload: SessionPayload = { v: SESSION_VERSION, exp: now + durationMs };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload, sessionSecret)}`;
}

export function verifyAdminSession(session: string | undefined, sessionSecret: string, now: number): boolean {
  if (!session || !sessionSecret) {
    return false;
  }

  const [encodedPayload, signature, ...extra] = session.split(".");

  if (!encodedPayload || !signature || extra.length > 0 || !safeEqual(signature, sign(encodedPayload, sessionSecret))) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    return payload.v === SESSION_VERSION && Number.isFinite(payload.exp) && payload.exp > now;
  } catch {
    return false;
  }
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(first: string, second: string): boolean {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}
