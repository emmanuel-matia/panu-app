import { describe, it, expect } from 'vitest';
import { canvasFilter, coverCrop, DEFAULT_LOOK } from './live-effects';
describe('live effects', () => {
  it('no effect means no filter', () => expect(canvasFilter(DEFAULT_LOOK)).toBe('none'));
  it('black & white filter applies grayscale', () => expect(canvasFilter({ ...DEFAULT_LOOK, filtre: 'nb' })).toContain('grayscale(1)'));
  it('landscape camera is cropped to fill a 9:16 frame', () => { const c = coverCrop(1280, 720, 720, 1280); expect(c.h).toBe(1280); expect(c.w).toBeGreaterThan(720); });
});
