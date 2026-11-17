import { describe, expect, it } from 'vitest';
import { viewsLabel } from './view-rules';
describe('viewsLabel', () => {
  it('formats thousands like 1 250 vues', () => expect(viewsLabel(1250)).toBe('1 250 vues'));
  it('singular for 1', () => expect(viewsLabel(1)).toBe('1 vue'));
});
