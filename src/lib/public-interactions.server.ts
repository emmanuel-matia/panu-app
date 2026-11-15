import { getCookie, setCookie, getRequestHeader, setResponseHeader } from '@tanstack/react-start/server';
import { createViewerServerClient } from './supabase-public.server';
import { liveDb, watchHash } from './live.server';
import { visitorLabel } from './public-interaction-rules';
export async function visitorSession() {
  setResponseHeader('Cache-Control','no-store');
  const db = await liveDb();
  let token = getCookie('panu-visitor');
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const hash = await watchHash(token);
    const {data:s} = await db.from('visitor_sessions').select('id,label').eq('token_hash',hash).gt('expires_at',new Date().toISOString()).maybeSingle();
    if(s) return {db,hash,id:s.id,label:visitorLabel(s.label)};
  }
  token = crypto.randomUUID().replaceAll('-','') + crypto.randomUUID().replaceAll('-','');
  const hash = await watchHash(token);
  const {data:s,error} = await db.from('visitor_sessions').insert({token_hash:hash}).select('id,label').single();
  if(error || !s) throw new Error('Session visiteur indisponible.');
  setCookie('panu-visitor',token,{httpOnly:true,secure:process.env['NODE_ENV']==='production',sameSite:'lax',path:'/',maxAge:86400});
  return {db,hash,id:s.id,label:visitorLabel(s.label)};
}
export async function verifiedPublicUser() {
  const header=getRequestHeader('authorization');
  if(!header) return null;
  const token=header.match(/^Bearer (.+)$/i)?.[1];
  if(!token) throw new Error('Session membre invalide.');
  const {data,error}=await createViewerServerClient().auth.getUser(token);
  if(error || !data.user) throw new Error('Session membre expirée.');
  return data.user.id;
}
export async function assertPublicTarget(kind:'post'|'live',id:string) {
  const client=createViewerServerClient();
  const result=kind==='post'?await client.rpc('list_posts',{_post_id:id}):await client.rpc('get_live_public',{_id:id});
  if(result.error || !result.data?.length) throw new Error('Contenu inaccessible.');
}
export async function engagementRows(kind:'post'|'live',id:string) {
  await assertPublicTarget(kind,id);
  const db=await liveDb();
  const {data,error}=await db.from('public_engagement').select('id,user_id,session_id,action,body,parent_id,created_at,share_ref').eq('target_kind',kind).eq('target_id',id).is('hidden_at',null).order('created_at').limit(10000);
  if(error) throw new Error('Interactions indisponibles.');
  return data??[];
}
export async function publicCommentRows(kind:'post'|'live',id:string) {
  const rows=(await engagementRows(kind,id)).filter(r=>r.action==='comment').slice(-300);
  const db=await liveDb();
  const ids=[...new Set(rows.map(r=>r.session_id))], users=[...new Set(rows.flatMap(r=>r.user_id?[r.user_id]:[]))];
  const [{data:sessions},{data:profiles}]=await Promise.all([
    ids.length?db.from('visitor_sessions').select('id,label').in('id',ids):Promise.resolve({data:[]}),
    users.length?db.from('profiles').select('id,username,display_name').in('id',users):Promise.resolve({data:[]}),
  ]);
  return rows.map(r=>{const p=profiles?.find(p=>p.id===r.user_id);return {...r,display_name:p?.display_name??visitorLabel(sessions?.find(s=>s.id===r.session_id)?.label??0),username:p?.username??null};});
}