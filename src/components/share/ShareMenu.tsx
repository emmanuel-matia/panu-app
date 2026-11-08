import { useState } from 'react';
import { Share2, Copy, ExternalLink, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
export function ShareMenu({url,title,text,onShared,label='Partager',className}:{url:string;title:string;text?:string;onShared?:(channel:string)=>void;label?:string;className?:string}){
 const [open,setOpen]=useState(false);
 const payload={title,text:text??title,url};
 async function native(){try{if(!navigator.share){toast.info('Le partage natif n’est pas disponible sur ce navigateur.');return;}await navigator.share(payload);onShared?.('natif');}catch(e){if(e instanceof Error && e.name!=='AbortError')toast.error('Partage indisponible. Copiez le lien.');}}
 async function copy(){try{await navigator.clipboard.writeText(url);onShared?.('lien');toast.success('Lien copié');}catch{toast.error('Copie indisponible. Sélectionnez le lien ci-dessous.');}}
 const u=encodeURIComponent(url),t=encodeURIComponent(`${payload.text}\n${url}`);
 const links=[['WhatsApp',`https://wa.me/?text=${t}`],['Facebook',`https://www.facebook.com/sharer/sharer.php?u=${u}`],['Telegram',`https://t.me/share/url?url=${u}&text=${encodeURIComponent(title)}`],['X',`https://twitter.com/intent/tweet?url=${u}&text=${encodeURIComponent(title)}`]];
 return <><Button variant="outline" className={className} onClick={()=>setOpen(true)} aria-label={label}><Share2/>{label}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Partager sur</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-2">{links.map(([name,href])=><Button key={name} variant="outline" asChild><a href={href} target="_blank" rel="noopener noreferrer" onClick={()=>onShared?.(name??'lien')}><ExternalLink/>{name}</a></Button>)}{['Messenger','Instagram','TikTok','Snapchat'].map(name=><Button key={name} variant="outline" onClick={()=>void native()}><Smartphone/>{name}</Button>)}<Button variant="outline" onClick={()=>void native()}><Smartphone/>Partage Android</Button><Button variant="outline" onClick={()=>void copy()}><Copy/>Copier le lien</Button></div><input aria-label="Lien de partage" value={url} readOnly onFocus={e=>e.target.select()} className="w-full rounded-md border border-input bg-background p-3 text-sm"/></DialogContent></Dialog></>;
}
