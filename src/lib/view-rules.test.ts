import { describe, expect, it } from 'vitest';
import { viewsLabel,newViewVisit,isReplay } from './view-rules';
describe('viewsLabel', () => {
  it('formats thousands like 1 250 vues', () => expect(viewsLabel(1250)).toBe('1 250 vues'));
  it('singular for 1', () => expect(viewsLabel(1)).toBe('1 vue'));
});
describe('consultations répétées réelles',()=>{
 it('compte un retour visible mais pas les notifications répétées du même affichage',()=>{expect(newViewVisit(false,true)).toBe(true);expect(newViewVisit(true,true)).toBe(false);expect(newViewVisit(true,false)).toBe(false);});
 it('compte une nouvelle lecture au début mais pas une pause ni la progression',()=>{expect(isReplay(5,0,0)).toBe(true);expect(isReplay(5,5,0)).toBe(false);expect(isReplay(5,6,0)).toBe(false);});
});
