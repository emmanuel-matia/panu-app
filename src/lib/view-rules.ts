/** Libellé accessible du compteur : « 1 250 vues », « 1 vue », « 0 vue ». */
export function viewsLabel(n: number): string {
  const v = Math.max(0, Math.floor(n));
  return `${v.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} ${v > 1 ? 'vues' : 'vue'}`;
}
export function uniqueViewsLabel(n:number):string {
 const v=Math.max(0,Math.floor(n));return `${v.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g,' ')} ${v>1?'visiteurs uniques':'visiteur unique'}`;
}
/** A fresh visible visit or a completed replay counts; buffering and pause/resume do not. */
export function newViewVisit(previousVisible:boolean,visible:boolean):boolean {return visible&&!previousVisible;}
export function isReplay(previous:number,current:number,start:number):boolean {return previous>start+0.5&&current<=start+0.25;}
