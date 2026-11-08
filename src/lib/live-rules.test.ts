import { describe, expect, it } from 'vitest';
import { activeViewer, liveStatus, liveShareTitle, validLiveTracks, LIVE_COMMENT_MAX, LIVE_COMMENT_INTERVAL_SECONDS } from './live-rules';
describe('Live real-state rules', () => {
 it('counts only present viewers, never departed viewers', () => {
  expect(activeViewer('2026-11-08T00:00:00Z', null, Date.parse('2026-11-08T00:00:34Z'))).toBe(true);
  expect(activeViewer('2026-11-08T00:00:00Z', null, Date.parse('2026-11-08T00:00:35Z'))).toBe(false);
  expect(activeViewer('2026-11-08T00:00:00Z', '2026-11-08T00:00:01Z', Date.parse('2026-11-08T00:00:02Z'))).toBe(false);
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
