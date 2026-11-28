export type AudioSelection = { start: number; end: number; at: number; volume: number };
export function audioSelection(duration: number, start: number, end: number, at: number, volume: number): AudioSelection {
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const safeStart = Math.min(Math.max(0, start), Math.max(0, safeDuration - 0.1));
  return { start: safeStart, end: Math.min(safeDuration, Math.max(safeStart + 0.1, end)), at: Math.max(0, at), volume: Math.min(1, Math.max(0, volume)) };
}