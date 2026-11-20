import { useEffect, useRef } from 'react';
export function PanelMedia({stream,name,muted=false,cameraOff=false}:{stream:MediaStream;name:string;muted?:boolean;cameraOff?:boolean|undefined}) {
 const video=useRef<HTMLVideoElement>(null);
 useEffect(()=>{const v=video.current;if(!v)return;v.srcObject=stream;void v.play().catch(()=>undefined);return()=>{v.srcObject=null;};},[stream]);
 return <div className="relative min-h-0 overflow-hidden rounded-md bg-media-scrim"><video ref={video} autoPlay playsInline muted={muted} className={'h-full w-full object-cover '+(cameraOff?'invisible':'')} />{cameraOff?<span className="absolute inset-0 grid place-items-center text-on-media">Caméra désactivée</span>:null}<span className="absolute inset-x-0 bottom-0 truncate bg-media-scrim px-2 py-1 text-xs text-on-media">{name}</span></div>;
}