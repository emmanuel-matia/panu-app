import { describe, expect, it } from 'vitest';
import { assertPanelAction, assertPanelPublish } from './live-panel-rules';
describe('permissions réelles du panel', () => {
 it('refuse un visiteur même avec une invitation acceptée', () => { expect(()=>assertPanelAction('accept',null,'host','guest','invited',true)).toThrow(); expect(()=>assertPanelPublish(null,'accepted',true)).toThrow(); });
 it('réserve la modération et les invitations au présentateur', () => { for(const a of ['invite','reject','mute','remove','layout','close','open'] as const) expect(()=>assertPanelAction(a,'guest','host','other','connected',true)).toThrow(); });
 it('permet au présentateur d’accepter une demande, pas au demandeur', () => { expect(()=>assertPanelAction('accept','host','host','guest','requested',true)).not.toThrow(); expect(()=>assertPanelAction('accept','guest','host','guest','requested',true)).toThrow(); });
 it('seul le destinataire accepte une invitation', () => { expect(()=>assertPanelAction('accept','guest','host','guest','invited',true)).not.toThrow(); expect(()=>assertPanelAction('accept','other','host','guest','invited',true)).toThrow(); });
 it('un panel fermé ne permet pas de demande ou de publication', () => { expect(()=>assertPanelAction('request','guest','host','guest',null,false)).toThrow(); expect(()=>assertPanelPublish('guest','accepted',false)).toThrow(); });
 it('un invité retiré ne peut pas se réinviter', () => { expect(()=>assertPanelAction('request','guest','host','guest','removed',true)).toThrow(); expect(()=>assertPanelPublish('guest','removed',true)).toThrow(); });
 it('les pistes ne sont autorisées qu’après acceptation', () => { for(const s of ['requested','invited','rejected','left'] as const) expect(()=>assertPanelPublish('guest',s,true)).toThrow(); expect(()=>assertPanelPublish('guest','accepted',true)).not.toThrow(); });
 it('un membre peut quitter sans fermer le direct', () => { expect(()=>assertPanelAction('leave','guest','host','guest','connected',true)).not.toThrow(); expect(()=>assertPanelAction('leave','guest','host','other','connected',true)).toThrow(); });
});