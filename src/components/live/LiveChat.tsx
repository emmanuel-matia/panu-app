import { useEffect,useState } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { liveComments } from '@/lib/live.functions';
import { LIVE_COMMENT_MAX } from '@/lib/live-rules';
export function LiveChat({streamId}:{streamId:string}){
 const {user}=useAuth();const qc=useQueryClient();const [body,setBody]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const key=['live-comments',streamId];
 const query=useQuery({queryKey:key,queryFn:()=>liveComments({data:{streamId}}),enabled:Boolean(user),refetchInterval:15000});
 useEffect(()=>{if(!user)return;const channel=supabase.channel(`live-chat-${streamId}-${crypto.randomUUID()}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'live_comments',filter:`stream_id=eq.${streamId}`},()=>{void qc.invalidateQueries({queryKey:['live-comments',streamId]});}).subscribe();return ()=>{void supabase.removeChannel(channel);};},[streamId,user?.id,qc]);
 async function send(){if(!user || !body.trim())return;setBusy(true);setError('');const {error:e}=await supabase.from('live_comments').insert({stream_id:streamId,author_id:user.id,body:body.trim()});setBusy(false);if(e){setError(e.message);return;}setBody('');void qc.invalidateQueries({queryKey:key});}
 return <section className="border-t border-border px-4 py-4"><h2 className="mb-3 font-semibold">Commentaires</h2><div aria-live="polite" className="max-h-64 space-y-2 overflow-y-auto">{query.data?.map(c=><p key={c.id} className="break-words text-sm"><span className="mr-2 font-semibold">{c.display_name}</span>{c.body}</p>)}{query.data?.length===0?<p className="text-sm text-muted-foreground">Aucun commentaire pour le moment.</p>:null}</div>{user?<form className="mt-3 flex gap-2" onSubmit={e=>{e.preventDefault();void send();}}><input aria-label="Votre commentaire" placeholder="Votre commentaire…" maxLength={LIVE_COMMENT_MAX} value={body} onChange={e=>setBody(e.target.value)} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2"/><Button size="icon" aria-label="Envoyer" disabled={busy||!body.trim()}><Send/></Button></form>:null}{error?<p role="alert" className="mt-2 text-sm text-destructive">{error}</p>:null}</section>;
}
