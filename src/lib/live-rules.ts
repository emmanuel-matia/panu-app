export const LIVE_COMMENT_MAX = 500;
export const LIVE_COMMENT_INTERVAL_SECONDS = 3;
export const LIVE_VIEWER_TTL_MS = 15_000;
export function watchIdentity(userId: string | null, tokenHash: string): string { return userId ?? tokenHash; }
export function activeViewer(lastSeen: string | null, leftAt: string | null, now: number): boolean {
  return !leftAt && Boolean(lastSeen && now - Date.parse(lastSeen) < LIVE_VIEWER_TTL_MS);
}
export function liveStatus(status: string, heartbeat: string, now: number): 'live' | 'paused' | 'ended' {
  if (status === 'ended' || now - Date.parse(heartbeat) >= 60_000) return 'ended';
  return status === 'paused' ? 'paused' : 'live';
}
export function liveShareTitle(s: { status: string; hostDisplayName: string; title: string }): string {
  return `PANU — ${s.status === 'ended' ? 'DIRECT TERMINÉ' : s.status === 'paused' ? 'EN PAUSE' : 'EN DIRECT'} · ${s.hostDisplayName} · ${s.title}`;
}
export function validLiveTracks(tracks: { mid: string; kind: string }[]): boolean {
  return tracks.some(t => t.kind === 'video') && new Set(tracks.map(t => t.kind)).size === tracks.length && new Set(tracks.map(t => t.mid)).size === tracks.length;
}
