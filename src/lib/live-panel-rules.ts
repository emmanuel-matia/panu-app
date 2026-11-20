export type PanelStatus = 'requested' | 'invited' | 'accepted' | 'connected' | 'rejected' | 'expired' | 'removed' | 'left';
export type PanelAction = 'request' | 'invite' | 'accept' | 'reject' | 'mute' | 'camera' | 'capacity' | 'remove' | 'leave' | 'layout' | 'close' | 'open';
export function assertPanelAction(action: PanelAction, actor: string | null, host: string, target: string, status: PanelStatus | null, open: boolean) {
  if (!actor) throw new Error('Un compte est nécessaire pour participer au panel.');
  const own = actor === target, isHost = actor === host;
  if (['invite','mute','camera','capacity','remove','layout','close','open'].includes(action) && !isHost) throw new Error('Réservé au présentateur.');
  if (action === 'reject' && !isHost && !(own && status === 'invited')) throw new Error('Refus non autorisé.');
  if (action === 'request' && (!own || isHost || !open || status === 'removed')) throw new Error('Demande non autorisée.');
  if (action === 'invite' && (!open || target === host)) throw new Error('Invitation non autorisée.');
  if (action === 'accept' && (!open || !((isHost && status === 'requested') || (own && status === 'invited')))) throw new Error('Acceptation non autorisée.');
  if (action === 'leave' && !own) throw new Error('Départ non autorisé.');
}
export function assertPanelPublish(actor: string | null, status: PanelStatus | null, open: boolean) {
  if (!actor || !open || !status || !['accepted','connected'].includes(status)) throw new Error('Accès caméra et micro du panel refusé.');
}