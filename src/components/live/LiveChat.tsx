import { useEffect,useState } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { liveComments } from '@/lib/live.functions';
import { publicInteraction,moderatePublicComment } from '@/lib/public-interactions.functions';
import { LIVE_COMMENT_MAX } from '@/lib/live-rules';
export function LiveChat({streamId}:{streamId:string}){
 const {user}=useAuth();const qc=useQueryClient();const [body,setBody]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const key=['live-comments',streamId];
 const query=useQuery({queryKey:key,queryFn:()=>liveComments({data:{streamId}}),refetchInterval:2000});
 useEffect(()=>{if(!user)return;const channel=supabase.channel(`live-chat-${streamId}-${crypto.randomUUID()}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'live_comments',filter:`stream_id=eq.${streamId}`},()=>{void qc.invalidateQueries({queryKey:['live-comments',streamId]});}).subscribe();return ()=>{void supabase.removeChannel(channel);};},[streamId,user?.id,qc]);
 async function send(){if(!body.trim()||busy)return;setBusy(true);setError('');try{await publicInteraction({data:{kind:'live',id:streamId,action:'comment',body:body.trim()}});setBody('');void qc.invalidateQueries({queryKey:key});}catch(e){setError(e instanceof Error?e.message:'Commentaire non envoyé.');}finally{setBusy(false);}}
 async function remove(id:string){try{await moderatePublicComment({data:{id}});void qc.invalidateQueries({queryKey:key});}catch(e){setError(e instanceof Error?e.message:'Modération impossible.');}}

 return <section className="border-t border-border px-4 py-4"><h2 className="mb-3 font-semibold">Commentaires</h2><div aria-live="polite" className="max-h-64 space-y-2 overflow-y-auto">{query.data?.map(c=><p key={c.id} className="break-words text-sm"><span className="mr-2 font-semibold">{c.display_name}</span>{c.body}{c.canDelete?<Button variant="ghost" size="sm" onClick={()=>void remove(c.id)}>Supprimer</Button>:null}</p>)}{query.data?.length===0?<p className="text-sm text-muted-foreground">Aucun commentaire pour le moment.</p>:null}</div>{<form className="mt-3 flex gap-2" onSubmit={e=>{e.preventDefault();void send();}}><input aria-label="Votre commentaire" placeholder="Votre commentaire…" maxLength={LIVE_COMMENT_MAX} value={body} onChange={e=>setBody(e.target.value)} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2"/><Button size="icon" aria-label="Envoyer" disabled={busy||!body.trim()}><Send/></Button></form>}{error?<p role="alert" className="mt-2 text-sm text-destructive">{error}</p>:null}</section>;
}
