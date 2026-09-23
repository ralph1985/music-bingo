import { randomBytes, scryptSync } from "node:crypto";

if (!process.stdin.isTTY) {
  throw new Error("Ejecuta este comando desde una terminal interactiva.");
}

process.stdout.write("Contraseña de administrador: ");

let password = "";
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

process.stdin.on("data", (character) => {
  if (character === "\r" || character === "\n") {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write("\n");

    if (!password) {
      throw new Error("La contraseña no puede estar vacía.");
    }

    const salt = randomBytes(16);
    const passwordHash = scryptSync(password, salt, 64);
    const sessionSecret = randomBytes(32).toString("base64url");

    console.log("\nCopia estos valores directamente en Vercel; no los guardes en Git:");
    console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString("hex")}$${passwordHash.toString("hex")}`);
    console.log(`SESSION_SECRET=${sessionSecret}`);
    password = "";
    return;
  }

  if (character === "\u0003") {
    process.exit(130);
  }

  if (character === "\u007f") {
    password = password.slice(0, -1);
    return;
  }

  password += character;
});
