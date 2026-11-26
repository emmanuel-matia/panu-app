import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getGiftHistory } from '@/lib/gifts.functions';
import { formatGiftMoney } from '@/lib/gifts-data';
import { GiftArtwork } from './GiftArtwork';
import { useAuth } from '@/hooks/useAuth';

export function GiftHistory({direction}:{direction:'sent'|'received'|'admin'}) {
 const fetch=useServerFn(getGiftHistory);
 const {user}=useAuth();
 const [offset,setOffset]=useState(0),[search,setSearch]=useState('');
 const q=useQuery({queryKey:['gift-history',user?.id,direction,offset],enabled:Boolean(user),queryFn:()=>fetch({data:{direction,offset}})});
 const rows=q.data?.filter((r)=>`${r.id} ${r.gift_name} ${r.sender_username} ${r.recipient_username}`.toLowerCase().includes(search.toLowerCase()))??[];
 return <section className="space-y-3">
  <div className="flex items-center justify-between gap-2"><h3 className="font-semibold tracking-normal">{direction==='sent'?'Cadeaux envoyés':direction==='received'?'Cadeaux reçus':'Opérations cadeaux'}</h3><Button size="icon" variant="ghost" title="Actualiser l’historique" aria-label="Actualiser l’historique cadeaux" disabled={q.isFetching} onClick={()=>void q.refetch()}><RefreshCw className={q.isFetching?'animate-spin':''}/></Button></div>
  {direction==='admin'?<Input aria-label="Filtrer les opérations cadeaux" placeholder="Référence, cadeau ou compte" value={search} maxLength={160} onChange={(e)=>setSearch(e.target.value)}/>:null}
  {q.isPending?<p className="py-6 text-sm text-muted-foreground">Chargement des opérations…</p>:q.isError?<p role="alert" className="py-4 text-sm text-destructive">Historique inaccessible : {q.error.message}</p>:!rows.length?<p className="py-6 text-sm text-muted-foreground">Aucun cadeau {direction==='sent'?'envoyé':direction==='received'?'reçu':'enregistré'}{search?' dans cette sélection':''}.</p>:<ul className="divide-y divide-border">{rows.map((r)=><li key={r.id} className="space-y-2 py-4"><div className="flex items-start gap-3"><div className="w-16 shrink-0"><GiftArtwork name={r.gift_name} imageUrl={r.imageUrl}/></div><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{r.gift_name} · {BigInt(r.coins_spent).toLocaleString('fr-FR')} Coins</p><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('fr-FR')} · Envoyé</p><Link to="/@{$username}" params={{username:direction==='sent'?r.recipient_username:r.sender_username}} className="break-words text-xs text-accent">{direction==='sent'?'À':'De'} {direction==='sent'?r.recipient_name:r.sender_name}</Link>{direction==='admin'?<p className="break-words text-xs text-muted-foreground">Destinataire : @{r.recipient_username}</p>:null}</div></div>
   {r.message?<p className="break-words text-sm">{r.message}</p>:null}
   {r.target_kind==='post'?<Button asChild variant="link" className="h-auto p-0 text-xs"><Link to="/p/$postId" params={{postId:r.target_id}}>Publication associée</Link></Button>:r.target_kind==='live'?<Button asChild variant="link" className="h-auto p-0 text-xs"><Link to="/live/$streamId" params={{streamId:r.target_id}}>Direct associé</Link></Button>:null}
   {direction!=='sent'?r.earnings.map((e,index)=><p key={index} className="text-xs text-muted-foreground">Revenu créateur : {formatGiftMoney(e.creator_minor,e.exponent,e.currency)} · En attente{direction==='admin'?` · PANU : ${formatGiftMoney(e.panu_minor,e.exponent,e.currency)} · Net : ${formatGiftMoney(e.net_minor,e.exponent,e.currency)}`:''}</p>):null}
   <p className="break-all text-[10px] text-muted-foreground">Référence : {r.id}</p>
  </li>)}</ul>}
  <div className="flex items-center justify-between"><Button variant="ghost" size="sm" aria-label="Page précédente des cadeaux" disabled={offset===0||q.isFetching} onClick={()=>setOffset(Math.max(0,offset-30))}><ChevronLeft/>Précédent</Button><span className="text-xs text-muted-foreground">Page {Math.floor(offset/30)+1}</span><Button variant="ghost" size="sm" aria-label="Page suivante des cadeaux" disabled={(q.data?.length??0)<30||q.isFetching} onClick={()=>setOffset(offset+30)}>Suivant<ChevronRight/></Button></div>
 </section>;
}
