import { describe, expect, it } from 'vitest';
import { activeViewer, watchIdentity, isWatchingLive, liveAndroidIntent, liveStatus, liveShareTitle, validLiveTracks, LIVE_COMMENT_MAX, LIVE_COMMENT_INTERVAL_SECONDS } from './live-rules';
describe('Live real-state rules', () => {
 it('counts playback only when visible, connected and receiving video', () => {
  const state = { playing:true, paused:false, connected:true, visible:true, readyState:4 };
  expect(isWatchingLive(state)).toBe(true);
  for (const change of [{playing:false},{paused:true},{connected:false},{visible:false},{readyState:2}]) expect(isWatchingLive({...state,...change})).toBe(false);
 });
 it('opens the permanent Android app and falls back to the same public live', () => {
  const id='279634f2-e5ca-406b-a591-c5b7c1875f68';
  expect(liveAndroidIntent(id)).toBe(`intent://panu.site/live/${id}#Intent;scheme=https;package=site.panu.app;S.browser_fallback_url=https%3A%2F%2Fpanu.site%2Flive%2F${id};end`);
  expect(()=>liveAndroidIntent('https://other.site')).toThrow();
 });
 it('counts only present viewers, never departed viewers', () => {
  expect(activeViewer('2026-11-08T00:00:00Z', null, Date.parse('2026-11-08T00:00:14Z'))).toBe(true);
  expect(activeViewer('2026-11-08T00:00:00Z', null, Date.parse('2026-11-08T00:00:15Z'))).toBe(false);
  expect(activeViewer('2026-11-08T00:00:00Z', '2026-11-08T00:00:01Z', Date.parse('2026-11-08T00:00:02Z'))).toBe(false);
 });
 it('deduplicates identified viewers and keeps separate anonymous watch sessions', () => {
  expect(new Set([watchIdentity('user-1','a'),watchIdentity('user-1','b')]).size).toBe(1);
  expect(new Set([watchIdentity(null,'a'),watchIdentity(null,'b')]).size).toBe(2);
 });
 it('never counts a connection before playback has started', () => {
  expect(activeViewer(null,null,Date.now())).toBe(false);
 });
 it('abandoned live is ended after a minute', () => {
  expect(liveStatus('live','2026-11-08T00:00:00Z',Date.parse('2026-11-08T00:01:00Z'))).toBe('ended');
 });
 it('shares actual creator title and ended status', () => {
  expect(liveShareTitle({status:'ended',hostDisplayName:'Emmanuel MATIA',title:'Émission spéciale'})).toBe('PANU — DIRECT TERMINÉ · Emmanuel MATIA · Émission spéciale');
 });
 it('rejects duplicate tracks and audio-only publishing', () => {
  expect(validLiveTracks([{mid:'0',kind:'video'},{mid:'1',kind:'audio'}])).toBe(true);
  expect(validLiveTracks([{mid:'0',kind:'video'},{mid:'0',kind:'video'}])).toBe(false);
  expect(validLiveTracks([{mid:'1',kind:'audio'}])).toBe(false);
 });
 it('enforces bounded comments and spam interval', () => { expect(LIVE_COMMENT_MAX).toBe(500); expect(LIVE_COMMENT_INTERVAL_SECONDS).toBe(3); });
});
