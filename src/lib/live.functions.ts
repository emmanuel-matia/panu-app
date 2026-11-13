import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { createPublicServerClient, createViewerServerClient, signStoragePaths } from './supabase-public.server';
import { cf, closeSession, liveDb, ownStream, viewerCount, authorizedWatch, watchHash, leaveWatch, audienceCounts } from './live.server';
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
const watchInput=z.object({watchToken:z.string().regex(/^[a-f0-9]{64}$/)});
export const joinLive=createServerFn({method:'POST'}).inputValidator((i:unknown)=>idInput.parse(i)).handler(async({data})=>{
 const viewer=createViewerServerClient();
 const {data:rows}=await viewer.rpc('get_live_public',{_id:data.streamId});
 if(!rows?.some(s=>s.status==='live'||s.status==='paused')) throw new Error('Direct terminé ou accès refusé.');
 const {data:auth}=await viewer.auth.getUser(); const userId=auth.user?.id??null;
 const db=await liveDb();const {data:s}=await db.from('live_streams').select('cf_session_id,video_track,audio_track').eq('id',data.streamId).single();if(!s?.cf_session_id) throw new Error('Direct indisponible.');
 const session=await cf('/sessions/new');if(!session.sessionId) throw new Error('Session indisponible.');
 const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
 try {const pulled=await cf(`/sessions/${session.sessionId}/tracks/new`,{tracks:[s.video_track,s.audio_track].filter(Boolean).map(trackName=>({location:'remote',sessionId:s.cf_session_id,trackName}))});if(!pulled.sessionDescription) throw new Error('Flux indisponible.');
 const {error}=await db.from('live_watch_sessions').insert({token_hash:await watchHash(token),stream_id:data.streamId,rtc_session_id:session.sessionId,user_id:userId});if(error) throw new Error('Connexion non enregistrée.');
 return {watchToken:token,offer:pulled.sessionDescription};} catch(e){await closeSession(session.sessionId);throw e;}
});
export const liveAnswer=createServerFn({method:'POST'}).inputValidator((i:unknown)=>watchInput.extend({answer:sdp}).parse(i)).handler(async({data})=>{
 const {session}=await authorizedWatch(data.watchToken);
 await cf(`/sessions/${session.rtc_session_id}/renegotiate`,{sessionDescription:data.answer},'PUT');return {ok:true};
});
export const viewerPresence=createServerFn({method:'POST'}).inputValidator((i:unknown)=>watchInput.extend({leave:z.boolean().default(false)}).parse(i)).handler(async({data})=>{
 if(data.leave){await leaveWatch(data.watchToken);return {ok:true};}
 const {db,hash}=await authorizedWatch(data.watchToken);
 const {error}=await db.from('live_watch_sessions').update({last_seen_at:new Date().toISOString()}).eq('token_hash',hash).is('left_at',null);
 if(error) throw new Error('Présence non enregistrée.');return {ok:true};
});
export const hostAudience=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>idInput.parse(i)).handler(async({data,context})=>{
 await ownStream(data.streamId,context.userId);
 const {data:rows,error}=await context.supabase.rpc('live_host_audience',{_id:data.streamId});if(error) throw new Error('Spectateurs indisponibles.');
 const avatars=await signStoragePaths('avatars',(rows??[]).map(r=>({path:r.avatar_url,ownerId:r.user_id})),60,256);
 return {...await audienceCounts(data.streamId),users:(rows??[]).map(r=>({id:r.user_id,username:r.username,displayName:r.display_name,avatarUrl:avatars.get(r.avatar_url??'')??null}))};
});
export const liveComments=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>idInput.parse(i)).handler(async({data,context})=>{const {data:rows,error}=await context.supabase.rpc('list_live_comments',{_id:data.streamId});if(error) throw new Error('Commentaires indisponibles.');return (rows??[]).reverse();});
export const stopReportedLive=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>idInput.parse(i)).handler(async({data,context})=>{
 const {data:staff}=await context.supabase.rpc('my_staff_role');if(!staff) throw new Error('Accès refusé.');const db=await liveDb();const {data:s}=await db.from('live_streams').select('host_id,cf_session_id').eq('id',data.streamId).single();if(!s) throw new Error('Direct introuvable.');const {data:founder}=await context.supabase.rpc('is_founder',{_uid:s.host_id});if(founder && staff!=='founder') throw new Error('Réservé au fondateur.');const {error}=await db.from('live_streams').update({status:'ended',ended_at:new Date().toISOString()}).eq('id',data.streamId);if(error) throw new Error('Arrêt impossible.');await closeSession(s.cf_session_id);await db.from('admin_audit_log').insert({actor_id:context.userId,action:'live_stopped',target_user_id:s.host_id,details:{streamId:data.streamId}});return {ok:true};
});
