import { describe, expect, it } from 'vitest';
import { canPublicAction, visitorLabel, type PublicAction } from './public-interaction-rules';
describe('droits publics PANU', () => {
  for (const action of ['watch','listen','like','comment','share','profile'] as PublicAction[]) {
    it(`autorise ${action} sans compte`, () => expect(canPublicAction(action,false)).toBe(true));
  }
  for (const action of ['follow','panel','panel-request','panel-invitation','panel-media'] as PublicAction[]) {
    it(`refuse ${action} sans compte`, () => expect(canPublicAction(action,false)).toBe(false));
    it(`autorise ${action} pour un membre`, () => expect(canPublicAction(action,true)).toBe(true));
  }
  it('identifie temporairement le visiteur 001', () => expect(visitorLabel(1)).toBe('Visiteur anonyme 001'));
});