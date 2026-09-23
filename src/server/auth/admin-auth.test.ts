import { randomBytes, scryptSync } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createAdminSession,
  verifyAdminPassword,
  verifyAdminSession,
} from "./admin-auth";

const password = "contraseña de prueba";
const salt = randomBytes(16);
const hash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;

describe("admin auth", () => {
  it("acepta solamente la contraseña cuyo hash scrypt coincide", () => {
    expect(verifyAdminPassword(password, hash)).toBe(true);
    expect(verifyAdminPassword("incorrecta", hash)).toBe(false);
    expect(verifyAdminPassword(password, undefined)).toBe(false);
  });

  it("firma una sesión que caduca y rechaza secretos o firmas incorrectas", () => {
    const session = createAdminSession("secreto-de-prueba", 1_000, 600);

    expect(verifyAdminSession(session, "secreto-de-prueba", 1_500)).toBe(true);
    expect(verifyAdminSession(session, "otro-secreto", 1_500)).toBe(false);
    expect(verifyAdminSession(session, "secreto-de-prueba", 1_601)).toBe(false);
  });
});
