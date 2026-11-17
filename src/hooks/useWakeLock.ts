import { useEffect } from 'react';
/** Garde l'écran allumé tant que `active` est vrai (Screen Wake Lock), reprend le verrou au retour au premier plan, le libère sinon. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    type Sentinel = { release: () => Promise<void> };
    const wl = (navigator as unknown as { wakeLock: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock;
    let lock: Sentinel | null = null; let stopped = false;
    const take = async () => { if (stopped || document.visibilityState !== 'visible') return; try { lock = await wl.request('screen'); if (stopped) void lock.release(); } catch { /* refus du navigateur (batterie faible, etc.) : on réessaiera au retour */ } };
    const onVis = () => { if (document.visibilityState === 'visible') void take(); };
    void take(); document.addEventListener('visibilitychange', onVis);
    return () => { stopped = true; document.removeEventListener('visibilitychange', onVis); void lock?.release().catch(() => undefined); lock = null; };
  }, [active]);
}
