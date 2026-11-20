import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { panelState, panelCommand, panelPublish, panelReceive, panelHeartbeat } from '@/lib/live-panel.functions';
import { liveAnswer, viewerPresence } from '@/lib/live.functions';
import { waitIce, localSdp } from '@/lib/live-peer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PanelAction } from '@/lib/live-panel-rules';

export function useLivePanel(streamId: string | null, userId: string | undefined, host = false) {
 const get=useServerFn(panelState),command=useServerFn(panelCommand),publish=useServerFn(panelPublish),receive=useServerFn(panelReceive),answer=useServerFn(liveAnswer),presence=useServerFn(viewerPresence),beat=useServerFn(panelHeartbeat);
 const q=useQuery({queryKey:['live-panel',streamId,userId],enabled:Boolean(streamId&&userId),queryFn:()=>streamId?get({data:{streamId}}):Promise.resolve(null),refetchInterval:1500});
 const [error,setError]=useState(''),[local,setLocal]=useState<MediaStream|null>(null),[remote,setRemote]=useState<Map<string,MediaStream>>(new Map()),[preparing,setPreparing]=useState(false),[connected,setConnected]=useState(false);
 const uplink=useRef<RTCPeerConnection|null>(null),ownsLocal=useRef(false),localRef=useRef<MediaStream|null>(null),generation=useRef(0),connecting=useRef(false);
 const receivers=useRef(new Map<string,{peer:RTCPeerConnection;token:string;version:string}>());
 const closeReceiver=useCallback((id:string)=>{const r=receivers.current.get(id);if(r){r.peer.close();void presence({data:{watchToken:r.token,leave:true}}).catch(()=>undefined);receivers.current.delete(id);}setRemote(old=>{const n=new Map(old);n.delete(id);return n;});},[presence]);
 const release=useCallback(()=>{generation.current++;uplink.current?.close();uplink.current=null;if(ownsLocal.current)localRef.current?.getTracks().forEach(t=>t.stop());localRef.current=null;setLocal(null);setConnected(false);setPreparing(false);for(const id of receivers.current.keys())closeReceiver(id);},[closeReceiver]);
 useEffect(()=>()=>release(),[streamId,release]);
 async function act(action:PanelAction,targetId?:string,extra:{muted?:boolean;layout?:'grid'|'panel';capacity?:number}={}) {
  if(!streamId)return;setError('');try{await command({data:{streamId,action,...(targetId?{targetId}:{}),...extra}});await q.refetch();if(action==='leave'||action==='close')release();return true;}catch(e){setError(e instanceof Error?e.message:'Action panel impossible.');return false;}
 }
 async function prepare() {
  setError('');try{if(localRef.current&&ownsLocal.current)localRef.current.getTracks().forEach(t=>t.stop());const m=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});ownsLocal.current=true;localRef.current=m;setLocal(m);setPreparing(true);}catch(e){setError(e instanceof Error?e.message:'Autorisez la caméra et le microphone.');}
 }
 async function connect(stream?:MediaStream) {
  if(!streamId||connecting.current)return;const m=stream??localRef.current;if(!m)return;
  connecting.current=true;setError('');const g=generation.current;
  try{
   if(stream){ownsLocal.current=false;localRef.current=stream;setLocal(stream);}
   uplink.current?.close();const p=new RTCPeerConnection({bundlePolicy:'max-bundle'});uplink.current=p;
   const mine=q.data?.members.find(m=>m.userId===userId);
   m.getTracks().filter(t=>(t.kind!=='audio'||!mine?.muted)&&(t.kind!=='video'||!mine?.cameraOff)).forEach(t=>p.addTransceiver(t,{direction:'sendonly',streams:[m]}));
   await p.setLocalDescription(await p.createOffer());await waitIce(p);
   const tracks=p.getTransceivers().flatMap(t=>t.mid&&t.sender.track?[{mid:t.mid,kind:t.sender.track.kind as 'video'|'audio'}]:[]);
   const result=await publish({data:{streamId,offer:localSdp(p),tracks}});
   if(generation.current!==g){p.close();return;}
   await p.setRemoteDescription(result.answer);setConnected(true);setPreparing(false);await q.refetch();
   p.onconnectionstatechange=()=>{if(['failed','disconnected'].includes(p.connectionState)){setConnected(false);setError('Connexion invité perdue. Reconnexion…');}};
  }catch(e){uplink.current?.close();setConnected(false);setError(e instanceof Error?e.message:'Connexion invité impossible.');}finally{connecting.current=false;}
 }
 const mine=q.data?.members.find(m=>m.userId===userId);
 const signature=q.data?.members.filter(m=>m.status==='connected'&&m.userId!==userId).map(m=>`${m.userId}:${m.version}`).join('|')??'';
 useEffect(()=>{
  if(!q.data?.open) {for(const id of receivers.current.keys())closeReceiver(id);return;}
  let cancelled=false;
  const members=q.data.members.filter(m=>m.status==='connected'&&m.userId!==userId);
  for(const [id,r] of receivers.current)if(!members.some(m=>m.userId===id&&m.version===r.version))closeReceiver(id);
  async function pull(){for(const m of members){if(receivers.current.has(m.userId)||cancelled||!streamId)continue;let token:string|null=null,p:RTCPeerConnection|null=null;
   try{const r=await receive({data:{streamId,targetId:m.userId}});token=r.watchToken;if(cancelled){await presence({data:{watchToken:token,leave:true}});continue;}p=new RTCPeerConnection({bundlePolicy:'max-bundle'});const pc=p,media=new MediaStream();receivers.current.set(m.userId,{peer:pc,token,version:m.version});pc.ontrack=e=>{media.addTrack(e.track);setRemote(old=>new Map(old).set(m.userId,media));};await pc.setRemoteDescription(r.offer);await pc.setLocalDescription(await pc.createAnswer());await waitIce(pc);await answer({data:{watchToken:token,answer:localSdp(pc)}});if(cancelled)closeReceiver(m.userId);
   }catch(e){p?.close();if(token)void presence({data:{watchToken:token,leave:true}}).catch(()=>undefined);receivers.current.delete(m.userId);if(!cancelled)setError(e instanceof Error?e.message:'Réception invité impossible.');}
  }}void pull();return()=>{cancelled=true;};
 },[signature,q.data?.open,mine?.status,streamId,userId,host,receive,answer,presence,closeReceiver]);
 useEffect(()=>{
  if(!q.data)return;
  if(!q.data.open||['removed','rejected','left'].includes(mine?.status??'')){release();return;}
  if(connected&&mine?.status==='accepted'){uplink.current?.close();setConnected(false);if(!host && localRef.current)void connect();}
 },[q.data?.open,mine?.status,mine?.version,connected,host,release]);
 useEffect(()=>{
  if(!streamId||!connected)return;const timer=setInterval(()=>{if(uplink.current?.connectionState==='connected')void beat({data:{streamId}}).catch(e=>setError(e.message));},5000);
  void beat({data:{streamId}}).catch(()=>undefined);return()=>clearInterval(timer);
 },[streamId,connected,beat]);
 useEffect(()=>{
  if(!streamId||!localRef.current||connected||!['accepted','connected'].includes(mine?.status??''))return;
  const timer=setTimeout(()=>void connect(),2500);return()=>clearTimeout(timer);
 },[streamId,connected,mine?.status,mine?.version]);
 useEffect(()=>{
  if(!userId||!streamId)return;
  const ch=supabase.channel(`panu-panel:${userId}`,{config:{private:true}}).on('broadcast',{event:'panel_changed'},()=>{void q.refetch();}).subscribe();
  return()=>{void supabase.removeChannel(ch);};
 },[streamId,userId]);
 const oldStatuses=useRef(new Map<string,string>());
 useEffect(()=>{if(!host||!q.data)return;for(const m of q.data.members){const old=oldStatuses.current.get(m.userId);if(old&&old!==m.status&&['accepted','rejected','expired','connected'].includes(m.status))toast(`${m.displayName} : ${m.status==='accepted'?'invitation acceptée':m.status==='connected'?'a rejoint le panel':m.status==='expired'?'invitation expirée':'invitation refusée'}`);oldStatuses.current.set(m.userId,m.status);}},[host,q.data]);
 return {data:q.data,mine,error,act,prepare,connect,release,local,remote,preparing,connected,loading:q.isFetching};
}