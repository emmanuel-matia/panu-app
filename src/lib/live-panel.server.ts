import { liveDb, cf, closeSession, watchHash } from './live.server';
import { assertPanelAction, assertPanelPublish, type PanelAction, type PanelStatus } from './live-panel-rules';
import { createViewerServerClient, signStoragePaths } from './supabase-public.server';

export async function panelAccess(streamId: string, userId: string) {
 const viewer = createViewerServerClient();
 const {data:visible,error} = await viewer.rpc('get_live_public',{_id:streamId});
 if(error || !visible?.some(s=>s.status==='live'||s.status==='paused')) throw new Error('Direct inaccessible ou terminé.');
 const db=await liveDb(); const {data:stream,error:err}=await db.from('live_streams').select('host_id,panel_open,panel_layout,panel_capacity,status').eq('id',streamId).single();
 if(err || !stream || stream.status==='ended') throw new Error('Direct terminé.');
 const {data:profile}=await db.from('profiles').select('is_locked,deactivated_at').eq('id',userId).single();
 if(!profile || profile.is_locked || profile.deactivated_at) throw new Error('Compte inactif ou suspendu.');
 return {db,stream};
}
export async function panelStateFor(streamId: string, userId: string) {
 const {db,stream}=await panelAccess(streamId,userId);
 await expirePanelMembers(streamId);
 const {data:rows,error}=await db.from('live_panel_members').select('user_id,status,muted_by_host,camera_off_by_host,invite_expires_at,updated_at').eq('stream_id',streamId);
 if(error) throw new Error('Panel indisponible.');
 const permitted=(rows??[]).filter(r=>userId===stream.host_id || r.user_id===userId || r.status==='connected');
 const ids=permitted.map(r=>r.user_id);
 const {data:profiles}=ids.length?await db.from('profiles').select('id,username,display_name,avatar_url').in('id',ids):{data:[]};
 const avatars=await signStoragePaths('avatars',(profiles??[]).map(p=>({path:p.avatar_url,ownerId:p.id})),60,256);
 return {open:stream.panel_open,capacity:stream.panel_capacity,layout:stream.panel_layout as 'grid'|'panel',hostId:stream.host_id,members:permitted.map(r=>{const p=profiles?.find(p=>p.id===r.user_id);return {userId:r.user_id,status:(r.status==='rejected' && r.invite_expires_at && Date.parse(r.invite_expires_at)<=Date.now()?'expired':r.status) as PanelStatus,muted:r.muted_by_host,cameraOff:r.camera_off_by_host,version:r.updated_at,username:p?.username??'',displayName:p?.display_name??'Membre PANU',avatarUrl:avatars.get(p?.avatar_url??'')??null};})};
}
export async function panelCommandFor(streamId:string,actor:string,action:PanelAction,target:string,muted:boolean,layout:'grid'|'panel',capacity=4) {
 const {db,stream}=await panelAccess(streamId,actor);
 await expirePanelMembers(streamId);
 const {data:member}=await db.from('live_panel_members').select('*').eq('stream_id',streamId).eq('user_id',target).maybeSingle();
 assertPanelAction(action,actor,stream.host_id,target,(member?.status as PanelStatus)??null,stream.panel_open);
 const now=new Date().toISOString();
 if(['close','open','layout','capacity'].includes(action)) {
  const {error}=await db.from('live_streams').update(action==='capacity'?{panel_capacity:capacity}:action==='layout'?{panel_layout:layout}:{panel_open:action==='open'}).eq('id',streamId).eq('host_id',actor);
  if(error) throw new Error('Panel non modifié.');
  if(action==='close') await closePanelMembers(streamId);
  return {ok:true};
 }
 if(action==='request'||action==='invite') {
  if(member && ['requested','invited','accepted','connected'].includes(member.status)) return {ok:true};
  if(action==='invite') {const {data:watchers}=await db.from('live_watch_sessions').select('user_id').eq('stream_id',streamId).eq('user_id',target).is('left_at',null).gt('last_seen_at',new Date(Date.now()-15000).toISOString());if(!watchers?.length) throw new Error('Ce membre ne regarde plus le direct.');}
  const {error}=await db.from('live_panel_members').upsert({stream_id:streamId,user_id:target,status:action==='request'?'requested':'invited',invite_expires_at:new Date(Date.now()+60000).toISOString(),last_seen_at:null,muted_by_host:false,camera_off_by_host:false,updated_at:now,cf_session_id:null,video_track:null,audio_track:null},{onConflict:'stream_id,user_id'});
  if(error) throw new Error('Demande ou invitation non enregistrée.');
 } else {
  if(!member) throw new Error('Invité introuvable.');
  // Closing the actual upstream session makes host moderation effective even for a modified client.
  if(['mute','camera','remove','reject','leave'].includes(action)) await closeSession(member.cf_session_id);
  const status=action==='accept'?'accepted':action==='reject'?'rejected':action==='remove'?'removed':action==='leave'?'left':member.status==='connected'?'accepted':member.status;
  const {error}=await db.from('live_panel_members').update({status,updated_at:now,...(action==='mute'?{muted_by_host:muted}:{}),...(action==='camera'?{camera_off_by_host:muted}:{}),...(action==='reject'?{invite_expires_at:null}:{}),...(action==='accept'?{invite_expires_at:new Date(Date.now()+60000).toISOString()}:{}),...(['mute','camera','remove','reject','leave'].includes(action)?{cf_session_id:null,video_track:null,audio_track:null}:{})}).eq('stream_id',streamId).eq('user_id',target).eq('status',member.status).eq('updated_at',member.updated_at);
  if(error) throw new Error('Gestion de l’invité non enregistrée.');
 }
 return {ok:true};
}
export async function closePanelMembers(streamId:string) {
 const db=await liveDb();
 const {data:sessions,error:readError}=await db.from('live_panel_members').select('cf_session_id').eq('stream_id',streamId).in('status',['requested','invited','accepted','connected']);
 if(readError) throw new Error('Connexions invité indisponibles.');
 const {data:members,error}=await db.from('live_panel_members').update({status:'left',cf_session_id:null,video_track:null,audio_track:null,updated_at:new Date().toISOString()}).eq('stream_id',streamId).in('status',['requested','invited','accepted','connected']).select('user_id');
 if(error) throw new Error('Fermeture des invités impossible.');
 await Promise.all((sessions??[]).map(s=>closeSession(s.cf_session_id)));
 return members;
}
export async function publishPanel(streamId:string,userId:string,offer:{type:'offer'|'answer';sdp:string},tracks:{mid:string;kind:'audio'|'video'}[]) {
 const {db,stream}=await panelAccess(streamId,userId);
 const {data:member}=await db.from('live_panel_members').select('*').eq('stream_id',streamId).eq('user_id',userId).single();
 assertPanelPublish(userId,userId===stream.host_id?'accepted':(member?.status as PanelStatus)??null,stream.panel_open);
 if(userId===stream.host_id && !member) {
  const {error}=await db.from('live_panel_members').insert({stream_id:streamId,user_id:userId,role:'host',status:'accepted'});
  if(error) throw new Error('Connexion du présentateur non enregistrée.');
  return publishPanel(streamId,userId,offer,tracks);
 }
 if(!member) throw new Error('Invitation non acceptée.');
 const session=await cf('/sessions/new');if(!session.sessionId) throw new Error('Connexion invité indisponible.');
 const sessionId=session.sessionId,video=`pv-${crypto.randomUUID()}`,audio=`pa-${crypto.randomUUID()}`;
 try {
  const sent=tracks.filter(t=>(t.kind!=='audio'||!member.muted_by_host)&&(t.kind!=='video'||!member.camera_off_by_host));
  if(!sent.length) throw new Error('Caméra et micro suspendus par le présentateur.');
  const pushed=await cf(`/sessions/${sessionId}/tracks/new`,{sessionDescription:offer,tracks:sent.map(t=>({location:'local',mid:t.mid,trackName:t.kind==='video'?video:audio}))});
  if(!pushed.sessionDescription) throw new Error('Caméra invité non connectée.');
  const {data:saved,error}=await db.from('live_panel_members').update({cf_session_id:sessionId,video_track:sent.some(t=>t.kind==='video')?video:null,last_seen_at:new Date().toISOString(),invite_expires_at:null,audio_track:sent.some(t=>t.kind==='audio')?audio:null,status:'connected',updated_at:new Date().toISOString()}).eq('stream_id',streamId).eq('user_id',userId).eq('status',member.status).eq('updated_at',member.updated_at).select('user_id');
  if(error||!saved?.length) throw new Error('Invitation modifiée : reconnectez-vous.');
  const {data:check}=await db.from('live_streams').select('panel_open,status').eq('id',streamId).single();
  if(!check?.panel_open||check.status==='ended') throw new Error('Panel fermé.');
  await closeSession(member.cf_session_id);return {answer:pushed.sessionDescription};
 } catch(e) {await closeSession(sessionId);throw e;}
}
export async function receivePanel(streamId:string,userId:string,targetId:string) {
 const {db,stream}=await panelAccess(streamId,userId);
 const {data:mine}=await db.from('live_panel_members').select('status').eq('stream_id',streamId).eq('user_id',userId).maybeSingle();
 // Receiving guest tracks never grants publishing permissions.
 void mine;
 const {data:target}=await db.from('live_panel_members').select('*').eq('stream_id',streamId).eq('user_id',targetId).eq('status','connected').single();
 if(!stream.panel_open || targetId===userId || !target?.cf_session_id || (!target.video_track&&!target.audio_track)) throw new Error('Invité non connecté.');
 const created=await cf('/sessions/new');if(!created.sessionId) throw new Error('Réception du panel indisponible.');
 const sessionId=created.sessionId;
 try {
  const tracks=[...(!target.camera_off_by_host&&target.video_track?[target.video_track]:[]),...(!target.muted_by_host&&target.audio_track?[target.audio_track]:[])];
  const pulled=await cf(`/sessions/${sessionId}/tracks/new`,{tracks:tracks.map(trackName=>({location:'remote',sessionId:target.cf_session_id,trackName}))});
  if(!pulled.sessionDescription) throw new Error('Flux invité indisponible.');
  const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
  const {error}=await db.from('live_watch_sessions').insert({stream_id:streamId,user_id:userId,rtc_session_id:sessionId,token_hash:await watchHash(token)});
  if(error) throw new Error('Réception non enregistrée.');
  return {watchToken:token,offer:pulled.sessionDescription};
 }catch(e){await closeSession(sessionId);throw e;}
}
export async function expirePanelMembers(streamId:string) {
 const db=await liveDb();const now=Date.now();
 const {data:rows,error}=await db.from('live_panel_members').select('user_id,status,invite_expires_at,last_seen_at,cf_session_id,updated_at').eq('stream_id',streamId).in('status',['invited','requested','accepted','connected']);
 if(error) throw new Error('Présence du panel indisponible.');
 for(const r of rows??[]) {
  const expired=r.status!=='connected' && r.invite_expires_at && Date.parse(r.invite_expires_at)<=now;
  const gone=r.status==='connected' && r.last_seen_at && Date.parse(r.last_seen_at)<=now-30000;
  if(!expired&&!gone)continue;
  const {data:changed,error:e}=await db.from('live_panel_members').update({status:expired?'rejected':'left',cf_session_id:null,video_track:null,audio_track:null,updated_at:new Date().toISOString()}).eq('stream_id',streamId).eq('user_id',r.user_id).eq('updated_at',r.updated_at).select('user_id');
  if(e) throw new Error('Expiration du panel impossible.');
  if(changed?.length)await closeSession(r.cf_session_id);
 }
}
export async function panelBeat(streamId:string,userId:string) {
 const {db}=await panelAccess(streamId,userId);
 const {error}=await db.from('live_panel_members').update({last_seen_at:new Date().toISOString()}).eq('stream_id',streamId).eq('user_id',userId).eq('status','connected');
 if(error)throw new Error('Présence invité non enregistrée.');return {ok:true};
}
