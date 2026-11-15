import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
const target=z.object({kind:z.enum(['post','live']),id:z.string().uuid()});
export const publicInteraction=createServerFn({method:'POST'}).inputValidator((i:unknown)=>target.extend({action:z.enum(['like','comment','view','share','arrival']),body:z.string().trim().min(1).max(500).optional(),parentId:z.string().uuid().optional(),channel:z.string().max(40).optional(),ref:z.string().uuid().optional(),liked:z.boolean().optional()}).strict().parse(i)).handler(async({data})=>{
  const {visitorSession,verifiedPublicUser}=await import('./public-interactions.server');
  const userId=await verifiedPublicUser();const {db,hash,label}=await visitorSession();
  const {error}=await db.rpc('visitor_engage',{_hash:hash,_kind:data.kind,_target:data.id,_action:data.action,_user:userId??undefined,_body:data.body,_parent:data.parentId,_channel:data.channel,_ref:data.ref,_liked:data.liked??true});
  if(error) throw new Error(error.code==='P0001'?error.message:'Interaction non enregistrée. Réessayez.');
  return {ok:true,label};
});
export const publicInteractionState=createServerFn({method:'POST'}).inputValidator((i:unknown)=>target.parse(i)).handler(async({data})=>{
  const {visitorSession,verifiedPublicUser,engagementRows}=await import('./public-interactions.server');
  const userId=await verifiedPublicUser();const s=await visitorSession();const rows=await engagementRows(data.kind,data.id);
  const counts=(action:string)=>rows.filter(r=>r.action===action).length;
  return {likes:counts('like'),comments:counts('comment'),shares:counts('share'),views:counts('view'),arrivals:counts('arrival'),anonymous:rows.filter(r=>!r.user_id).length,members:rows.filter(r=>r.user_id).length,liked:rows.some(r=>r.action==='like'&&(r.session_id===s.id||(userId&&r.user_id===userId)))};
});
export const moderatePublicComment=createServerFn({method:'POST'}).inputValidator((i:unknown)=>z.object({id:z.string().uuid()}).parse(i)).handler(async({data})=>{
  const {verifiedPublicUser}=await import('./public-interactions.server');const uid=await verifiedPublicUser();if(!uid) throw new Error('Connexion requise.');
  const {liveDb}=await import('./live.server');const db=await liveDb();
  const {data:r}=await db.from('public_engagement').select('target_kind,target_id,user_id').eq('id',data.id).eq('action','comment').single();if(!r) throw new Error('Commentaire introuvable.');
  const {createViewerServerClient}=await import('./supabase-public.server');const client=createViewerServerClient();const {data:staff}=await client.rpc('my_staff_role');
  const owner=r.target_kind==='post'?await db.from('posts').select('author_id').eq('id',r.target_id).single():await db.from('live_streams').select('host_id').eq('id',r.target_id).single();
  const ownerId=owner.data&&('author_id' in owner.data?owner.data.author_id:owner.data.host_id);
  if(r.user_id!==uid&&ownerId!==uid&&!staff) throw new Error('Modération non autorisée.');
  const {error}=await db.from('public_engagement').update({hidden_at:new Date().toISOString()}).eq('id',data.id);if(error) throw new Error('Modération impossible.');return {ok:true};
});