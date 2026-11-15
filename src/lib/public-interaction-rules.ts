export type PublicAction = 'watch' | 'listen' | 'like' | 'comment' | 'share' | 'profile' | 'follow' | 'panel' | 'panel-request' | 'panel-invitation' | 'panel-media';
export function canPublicAction(action: PublicAction, signedIn: boolean) {
  return signedIn || !['follow', 'panel', 'panel-request', 'panel-invitation', 'panel-media'].includes(action);
}
export function visitorLabel(number: number) { return `Visiteur anonyme ${String(number).padStart(3, '0')}`; }