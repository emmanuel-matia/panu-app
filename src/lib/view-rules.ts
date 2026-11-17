/** Libellé accessible du compteur : « 1 250 vues », « 1 vue », « 0 vue ». */
export function viewsLabel(n: number): string {
  const v = Math.max(0, Math.floor(n));
  return `${v.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} ${v > 1 ? 'vues' : 'vue'}`;
}
