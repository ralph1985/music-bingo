export function playerGameUrl(origin: string, joinCode: string): string {
  return new URL(`/play/${encodeURIComponent(joinCode)}`, origin).toString();
}
