import { verifyAdminSession } from "./admin-auth";

export const ADMIN_SESSION_COOKIE = "music_bingo_admin";

export function hasAdminSession(session: string | undefined, sessionSecret: string | undefined): boolean {
  return Boolean(sessionSecret && verifyAdminSession(session, sessionSecret, Date.now()));
}
