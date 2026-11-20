import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validLiveTracks } from './live-rules';
const id=z.object({streamId:z.string().uuid()});
export const panelState=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>id.parse(i)).handler(async({data,context})=>{
 const {panelStateFor}=await import('./live-panel.server');return panelStateFor(data.streamId,context.userId);
});
export const panelCommand=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>id.extend({action:z.enum(['request','invite','accept','reject','mute','camera','capacity','remove','leave','layout','close','open']),targetId:z.string().uuid().optional(),muted:z.boolean().default(true),layout:z.enum(['grid','panel']).default('grid'),capacity:z.number().int().min(1).max(8).default(4)}).parse(i)).handler(async({data,context})=>{
 const {panelCommandFor}=await import('./live-panel.server');return panelCommandFor(data.streamId,context.userId,data.action,data.targetId??context.userId,data.muted,data.layout,data.capacity);
});
export const panelPublish=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>id.extend({offer:z.object({type:z.enum(['offer','answer']),sdp:z.string().min(10).max(40000)}),tracks:z.array(z.object({mid:z.string().regex(/^\d+$/),kind:z.enum(['video','audio'])})).min(1).max(2).refine(validLiveTracks)}).parse(i)).handler(async({data,context})=>{
 const {publishPanel}=await import('./live-panel.server');return publishPanel(data.streamId,context.userId,data.offer,data.tracks);
});
export const panelReceive=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>id.extend({targetId:z.string().uuid()}).parse(i)).handler(async({data,context})=>{
 const {receivePanel}=await import('./live-panel.server');return receivePanel(data.streamId,context.userId,data.targetId);
});
export const panelHeartbeat=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>id.parse(i)).handler(async({data,context})=>{const {panelBeat}=await import('./live-panel.server');return panelBeat(data.streamId,context.userId);});
