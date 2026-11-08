export type SDP = { type: 'offer' | 'answer'; sdp: string };
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
 const db=await liveDb(); const {count,error}=await db.from('live_viewers').select('viewer_id',{count:'exact',head:true}).eq('stream_id',id).is('left_at',null).gt('last_seen_at',new Date(Date.now()-35000).toISOString());
 if(error) throw new Error('Compteur indisponible.'); return count??0;
}
