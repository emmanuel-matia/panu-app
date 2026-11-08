/** Browser-only WebRTC setup; no service credentials are exposed. */
export function waitIce(pc: RTCPeerConnection): Promise<void> {
 if(pc.iceGatheringState==='complete') return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pc.removeEventListener('icegatheringstatechange',changed);reject(new Error('Connexion réseau trop lente. Réessayez.'));},15000);
  function changed(){if(pc.iceGatheringState==='complete'){clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',changed);resolve();}}
  pc.addEventListener('icegatheringstatechange',changed);
 });
}
export function localSdp(pc: RTCPeerConnection){const s=pc.localDescription;if(!s?.sdp || (s.type!=='offer' && s.type!=='answer')) throw new Error('Connexion vidéo non prête.');return {type:s.type,sdp:s.sdp};}
