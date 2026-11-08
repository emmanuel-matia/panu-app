import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { createPublicServerClient, signStoragePaths } from './supabase-public.server';
import { cf, closeSession, liveDb, ownStream, viewerCount } from './live.server';
import { validLiveTracks } from './live-rules';
const idInput=z.object({streamId:z.string().uuid()});
const sdp=z.object({type:z.enum(['offer','answer']),sdp:z.string().min(10).max(40000)});
export type LiveSummary={id:string;title:string;status:'live'|'paused'|'ended';startedAt:string;hostId:string;hostUsername:string;hostDisplayName:string;hostAvatarUrl:string|null;coverUrl:string|null;sourceKind:'camera'|'prerecorded';viewersCount:number};
export const publicLives=createServerFn({method:'GET'}).inputValidator((i:unknown)=>z.object({streamId:z.string().uuid().optional()}).parse(i??{})).handler(async({data}):Promise<LiveSummary[]>=>{
 const db=createPublicServerClient();const {data:rows,error}=await db.rpc('get_live_public',{...(data.streamId?{_id:data.streamId}:{})});
 if(error) throw new Error('Impossible de charger les directs.');
 const avatars=await signStoragePaths('avatars',(rows??[]).map(r=>({path:r.host_avatar_url,ownerId:r.host_id})),600);
 const covers=await signStoragePaths('videos',(rows??[]).map(r=>({path:r.cover_path,ownerId:r.host_id})),600);
 return (rows??[]).map(r=>({id:r.id,title:r.title,status:r.status as LiveSummary['status'],startedAt:r.started_at,hostId:r.host_id,hostUsername:r.host_username,hostDisplayName:r.host_display_name,hostAvatarUrl:avatars.get(r.host_avatar_url??'')??null,coverUrl:covers.get(r.cover_path??'')??null,sourceKind:r.source_kind as LiveSummary['sourceKind'],viewersCount:Number(r.viewers_count)}));
});
export const startLive=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({title:z.string().trim().min(1).max(80),offer:sdp,tracks:z.array(z.object({mid:z.string().min(1).max(10).regex(/^\d+$/),kind:z.enum(['video','audio'])})).min(1).max(2).refine(validLiveTracks),coverPath:z.string().max(300).optional(),sourceKind:z.enum(['camera','prerecorded']).default('camera'),streamId:z.string().uuid().optional()}).parse(i)).handler(async({data,context})=>{
 const {data:profile}=await context.supabase.from('profiles').select('is_locked,deactivated_at').eq('id',context.userId).single();
 if(!profile || profile.deactivated_at || profile.is_locked) throw new Error('Un compte public actif est nécessaire pour diffuser.');
 if(data.coverPath && (!data.coverPath.startsWith(`${context.userId}/`) || data.coverPath.includes('..'))) throw new Error('Miniature non autorisée.');
 const db=await liveDb(); let oldSession:string|null=null;
 if(data.streamId) {const own=await ownStream(data.streamId,context.userId);oldSession=own.stream.cf_session_id;}
 const session=await cf('/sessions/new'); if(!session.sessionId) throw new Error('Session de diffusion indisponible.');
 const sessionId=session.sessionId;const names={video:`v-${crypto.randomUUID()}`,audio:`a-${crypto.randomUUID()}`};
 try {
  const pushed=await cf(`/sessions/${sessionId}/tracks/new`,{sessionDescription:data.offer,tracks:data.tracks.map(t=>({location:'local',mid:t.mid,trackName:names[t.kind]}))});
  if(!pushed.sessionDescription) throw new Error('Connexion vidéo non établie.');
  const values={title:data.title,cf_session_id:sessionId,video_track:names.video,audio_track:data.tracks.some(t=>t.kind==='audio')?names.audio:null,last_heartbeat_at:new Date().toISOString(),status:'live',cover_path:data.coverPath??null,source_kind:data.sourceKind};
  const result=data.streamId?await db.from('live_streams').update(values).eq('id',data.streamId).eq('host_id',context.userId).select('id').single():await db.from('live_streams').insert({...values,host_id:context.userId}).select('id').single();
  if(result.error || !result.data) throw new Error('Impossible d’enregistrer le direct.');
  await closeSession(oldSession);return {streamId:result.data.id,answer:pushed.sessionDescription};
 } catch(error) {await closeSession(sessionId);throw error;}
});
export const liveHeartbeat=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>idInput.extend({status:z.enum(['live','paused'])}).parse(i)).handler(async({data,context})=>{
 const {db,stream}=await ownStream(data.streamId,context.userId); const count=await viewerCount(data.streamId);
 const {error}=await db.from('live_streams').update({status:data.status,last_heartbeat_at:new Date().toISOString(),peak_viewers:Math.max(stream.peak_viewers,count)}).eq('id',data.streamId);if(error) throw new Error('Statut non enregistré.');return {viewersCount:count};
});
export const endLive=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>idInput.parse(i)).handler(async({data,context})=>{
 const {db,stream}=await ownStream(data.streamId,context.userId);const {error}=await db.from('live_streams').update({status:'ended',ended_at:new Date().toISOString()}).eq('id',data.streamId);if(error) throw new Error('Arrêt non enregistré.');await closeSession(stream.cf_session_id);return {ok:true};
});
export const joinLive=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>idInput.parse(i)).handler(async({data,context})=>{
 const {data:allowed}=await context.supabase.rpc('can_join_live',{_id:data.streamId});if(!allowed) throw new Error('Direct terminé ou accès refusé.');
 const db=await liveDb();const {data:s}=await db.from('live_streams').select('cf_session_id,video_track,audio_track').eq('id',data.streamId).single();if(!s?.cf_session_id) throw new Error('Direct indisponible.');
 const session=await cf('/sessions/new');if(!session.sessionId) throw new Error('Session indisponible.');
 try { const pulled=await cf(`/sessions/${session.sessionId}/tracks/new`,{tracks:[s.video_track,s.audio_track].filter(Boolean).map(trackName=>({location:'remote',sessionId:s.cf_session_id,trackName}))});if(!pulled.sessionDescription) throw new Error('Flux indisponible.');
 const {error}=await db.from('live_rtc_sessions').insert({session_id:session.sessionId,stream_id:data.streamId,user_id:context.userId});if(error) throw new Error('Connexion non enregistrée.');
 return {sessionId:session.sessionId,offer:pulled.sessionDescription};} catch(e){await closeSession(session.sessionId);throw e;}
});
export const liveAnswer=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({sessionId:z.string().min(8).max(100).regex(/^[\w-]+$/),answer:sdp}).parse(i)).handler(async({data,context})=>{
 const db=await liveDb();const {data:s}=await db.from('live_rtc_sessions').select('stream_id').eq('session_id',data.sessionId).eq('user_id',context.userId).maybeSingle();if(!s) throw new Error('Session non autorisée.');
 const {data:allowed}=await context.supabase.rpc('can_join_live',{_id:s.stream_id});if(!allowed) throw new Error('Accès refusé.');
 await cf(`/sessions/${data.sessionId}/renegotiate`,{sessionDescription:data.answer},'PUT');return {ok:true};
});
export const viewerPresence=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>idInput.extend({leave:z.boolean().default(false)}).parse(i)).handler(async({data,context})=>{
 const db=await liveDb();
 if(data.leave){await db.from('live_viewers').update({left_at:new Date().toISOString()}).eq('stream_id',data.streamId).eq('viewer_id',context.userId);const {data:sessions}=await db.from('live_rtc_sessions').select('session_id').eq('stream_id',data.streamId).eq('user_id',context.userId);await Promise.all((sessions??[]).map(s=>closeSession(s.session_id)));return {ok:true};}
 const {data:allowed}=await context.supabase.rpc('can_join_live',{_id:data.streamId});if(!allowed) throw new Error('Direct terminé ou accès refusé.');
 const {data:s}=await db.from('live_streams').select('host_id').eq('id',data.streamId).single();if(s?.host_id!==context.userId){const {error}=await db.from('live_viewers').upsert({stream_id:data.streamId,viewer_id:context.userId,last_seen_at:new Date().toISOString(),left_at:null},{onConflict:'stream_id,viewer_id'});if(error) throw new Error('Présence non enregistrée.');}return {ok:true};
});
export const liveComments=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>idInput.parse(i)).handler(async({data,context})=>{const {data:rows,error}=await context.supabase.rpc('list_live_comments',{_id:data.streamId});if(error) throw new Error('Commentaires indisponibles.');return (rows??[]).reverse();});
export const stopReportedLive=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>idInput.parse(i)).handler(async({data,context})=>{
 const {data:staff}=await context.supabase.rpc('my_staff_role');if(!staff) throw new Error('Accès refusé.');const db=await liveDb();const {data:s}=await db.from('live_streams').select('host_id,cf_session_id').eq('id',data.streamId).single();if(!s) throw new Error('Direct introuvable.');const {data:founder}=await context.supabase.rpc('is_founder',{_uid:s.host_id});if(founder && staff!=='founder') throw new Error('Réservé au fondateur.');const {error}=await db.from('live_streams').update({status:'ended',ended_at:new Date().toISOString()}).eq('id',data.streamId);if(error) throw new Error('Arrêt impossible.');await closeSession(s.cf_session_id);await db.from('admin_audit_log').insert({actor_id:context.userId,action:'live_stopped',target_user_id:s.host_id,details:{streamId:data.streamId}});return {ok:true};
});
