export type SDP = { type: 'offer' | 'answer'; sdp: string };
import { createPublicServerClient } from './supabase-public.server';
import { LIVE_VIEWER_TTL_MS, watchIdentity } from './live-rules';
export async function watchHash(token: string) {
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function authorizedWatch(token: string) {
 const db=await liveDb(); const hash=await watchHash(token);
 const {data:session}=await db.from('live_watch_sessions').select('*').eq('token_hash',hash).is('left_at',null).maybeSingle();
 if(!session) throw new Error('Session de visionnage non autorisée.');
 const {data:rows}=await createPublicServerClient().rpc('get_live_public',{_id:session.stream_id});
 if(!rows?.some(s=>s.status==='live'||s.status==='paused')) throw new Error('Direct indisponible.');
 if(session.user_id) { const {data:blocked}=await db.rpc('is_blocked_between',{_a:session.user_id,_b:rows[0].host_id}); if(blocked) throw new Error('Accès refusé.'); }
 return {db,session,hash};
}
export async function leaveWatch(token: string) {
 const db=await liveDb(); const hash=await watchHash(token);
 const {data:s}=await db.from('live_watch_sessions').update({left_at:new Date().toISOString()}).eq('token_hash',hash).is('left_at',null).select('rtc_session_id').maybeSingle();
 if(s) await closeSession(s.rtc_session_id);
}
export async function liveDb() { return (await import('@/integrations/supabase/client.server')).supabaseAdmin; }
export async function cf(path: string, body?: unknown, method = 'POST') {
 const app=process.env['CF_REALTIME_APP_ID'], secret=process.env['CF_REALTIME_APP_SECRET'];
 if(!app || !secret) throw new Error('Service de diffusion non configuré.');
 const res=await fetch(`https://rtc.live.cloudflare.com/v1/apps/${app}${path}`,{method,headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!res.ok) throw new Error(`Cloudflare refuse la diffusion (${res.status}). Réessayez ou vérifiez le service de diffusion.`);
 const json=await res.json() as {sessionId?:string;sessionDescription?:SDP;tracks?:{mid?:string;errorCode?:string}[];errorCode?:string};
 if(json.errorCode || json.tracks?.some(t=>t.errorCode)) throw new Error('Cloudflare n’a pas pu connecter les pistes vidéo.');
 return json;
}
export async function closeSession(sessionId: string | null) {
 if(!sessionId) return;
 try { const s=await cf(`/sessions/${sessionId}`,undefined,'GET'); const tracks=(s.tracks??[]).filter(t=>t.mid).map(t=>({mid:t.mid})); if(tracks.length) await cf(`/sessions/${sessionId}/tracks/close`,{tracks,force:true},'PUT'); } catch { /* closed/disconnected sessions expire on Cloudflare */ }
}
export async function ownStream(id: string,userId:string) {
 const db=await liveDb(); const {data,error}=await db.from('live_streams').select('*').eq('id',id).eq('host_id',userId).maybeSingle();
 if(error || !data || data.status==='ended') throw new Error('Ce direct n’est plus actif ou ne vous appartient pas.');
 return {db,stream:data};
}
export async function viewerCount(id:string) {
 return (await audienceCounts(id)).viewersCount;
}
export async function audienceCounts(id:string) {
 const db=await liveDb();
 const {data:s}=await db.from('live_streams').select('host_id').eq('id',id).single();
 const {data:rows,error}=await db.from('live_watch_sessions').select('user_id,token_hash').eq('stream_id',id).is('left_at',null).gt('last_seen_at',new Date(Date.now()-LIVE_VIEWER_TTL_MS).toISOString());
 if(error) throw new Error('Compteur indisponible.');
 const watching=(rows??[]).filter(r=>r.user_id!==s?.host_id);
 return {viewersCount:new Set(watching.map(r=>watchIdentity(r.user_id,r.token_hash))).size,anonymousCount:watching.filter(r=>!r.user_id).length};
}
