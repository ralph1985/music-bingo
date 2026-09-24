import { randomBytes } from "node:crypto";

console.log("Copia este valor directamente en Convex y Vercel; no lo guardes en Git ni lo compartas en el chat:");
console.log(`ADMIN_COMMAND_SECRET=${randomBytes(32).toString("base64url")}`);
