import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
export const recordPostConsultation=createServerFn({method:'POST'}).inputValidator((i:unknown)=>z.object({postId:z.string().uuid(),eventId:z.string().uuid()}).parse(i)).handler(async({data})=>{
 const {verifiedPublicUser,visitorSession,assertPublicTarget}=await import('./public-interactions.server');
 const uid=await verifiedPublicUser();await assertPublicTarget('post',data.postId);
 const {createViewerServerClient}=await import('./supabase-public.server');
 const client=createViewerServerClient();
 if(uid){const {error}=await client.rpc('record_member_post_consultation',{_post:data.postId,_event:data.eventId});if(error)throw new Error('Consultation non enregistrée.');}
 else {const s=await visitorSession();const {error}=await s.db.rpc('record_public_post_consultation',{_post:data.postId,_event:data.eventId,_hash:s.hash});if(error)throw new Error('Consultation non enregistrée.');}
 const {data:rows,error:readError}=await createViewerServerClient().rpc('post_view_counts',{_ids:[data.postId]});
 const row=rows?.[0];if(readError||!row)throw new Error('Compteurs indisponibles.');
 return {total:Number(row.total_views),unique:Number(row.unique_viewers)};
});