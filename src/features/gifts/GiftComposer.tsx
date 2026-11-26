import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { Check, Coins, Loader2, Search, Send } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { findGiftRecipient, quoteGift, sendGift } from '@/lib/gifts.functions';
import type { GiftTarget } from '@/lib/gifts-data';
import { useAuth } from '@/hooks/useAuth';

export function GiftComposer({ giftId, available, target, onSent }: { giftId:string;available:boolean;target?:GiftTarget;onSent:()=>void }) {
 const find=useServerFn(findGiftRecipient),quote=useServerFn(quoteGift),send=useServerFn(sendGift);
 const cache=useQueryClient();
 const {user}=useAuth();
 const [username,setUsername]=useState('');
 const [recipient,setRecipient]=useState<Awaited<ReturnType<typeof find>>|null>(null);
 const [message,setMessage]=useState('');
 const request=useRef<{key:string;id:string}|null>(null);
 const lookup=useMutation({mutationFn:()=>find({data:{username}}),onSuccess:setRecipient,onError:(error)=>toast.error(error.message)});
 const destination=target ?? (recipient ? {kind:'profile' as const,targetId:recipient.id}:null);
 const q=useQuery({queryKey:['gift-quote',user?.id,giftId,destination?.kind,destination?.targetId],enabled:Boolean(user&&destination&&available),queryFn:()=>{if(!destination)throw new Error('Choisissez un destinataire');return quote({data:{giftId,...destination}});},refetchInterval:10000});
 const mutation=useMutation({mutationFn:async()=>{
  if(!destination||!q.data)throw new Error('Vérifiez le destinataire et le prix');
  const price=q.data.price;
  const key=JSON.stringify([giftId,destination.kind,destination.targetId,price,message.trim()]);
  if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
  const current=request.current;
  if(!current)throw new Error('Référence indisponible');
  return send({data:{giftId,...destination,expectedPrice:price,requestId:current.id,message}});
 },onSuccess:(result)=>{
  void cache.invalidateQueries({queryKey:['panu-coins']});void cache.invalidateQueries({queryKey:['gift-history']});void cache.invalidateQueries({queryKey:['gift-summary']});void cache.invalidateQueries({queryKey:['gift-quote']});
  toast.success(result.duplicate?'Cet envoi était déjà enregistré. Aucun deuxième débit.':'Cadeau envoyé');onSent();
 },onError:(error)=>{toast.error(error.message);void q.refetch();}});
 if(!available)return <p className="text-sm text-muted-foreground">Ce cadeau est indisponible.</p>;
 return <div className="space-y-3">
  {!target ? <form onSubmit={(event)=>{event.preventDefault();lookup.mutate();}} className="space-y-2"><label className="text-sm" htmlFor="gift-recipient">Destinataire</label><div className="flex gap-2"><Input id="gift-recipient" placeholder="@nom d’utilisateur" maxLength={64} value={username} disabled={mutation.isPending} onChange={(event)=>{setUsername(event.target.value);setRecipient(null);lookup.reset();}}/><Button type="submit" variant="outline" size="icon" title="Vérifier le destinataire" aria-label="Vérifier le destinataire" disabled={!username.trim()||lookup.isPending||mutation.isPending}>{lookup.isPending?<Loader2 className="animate-spin"/>:<Search/>}</Button></div>{lookup.isError?<p role="alert" className="text-xs text-destructive">{lookup.error.message}</p>:null}</form>:null}
  {recipient&&!target?<div className="flex items-center gap-2 text-sm">{recipient.avatarUrl?<img src={recipient.avatarUrl} alt="" className="size-8 rounded-full object-cover"/>:<Check className="size-4 text-accent"/>}<span className="min-w-0 break-words">{recipient.displayName} · @{recipient.username}</span></div>:null}
  {q.isFetching&&destination?<p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin"/>Vérification du prix et du solde…</p>:null}
  {q.isError?<p role="alert" className="text-sm text-destructive">{q.error.message}</p>:null}
  {q.data ? <><dl className="space-y-1 border-y border-border py-3 text-sm"><div className="flex justify-between gap-3"><dt>À</dt><dd className="min-w-0 break-words text-right font-semibold">{q.data.recipientName}</dd></div><div className="flex justify-between"><dt>Prix</dt><dd className="text-gold">{BigInt(q.data.price).toLocaleString('fr-FR')} Coins</dd></div><div className="flex justify-between"><dt>Solde disponible</dt><dd>{BigInt(q.data.balance).toLocaleString('fr-FR')} Coins</dd></div><div className="flex justify-between"><dt>Après envoi</dt><dd>{q.data.remaining===null?'Solde insuffisant':`${BigInt(q.data.remaining).toLocaleString('fr-FR')} Coins`}</dd></div></dl>
  <label className="block text-sm" htmlFor="gift-message">Message facultatif</label><Input id="gift-message" maxLength={250} value={message} disabled={mutation.isPending} onChange={(event)=>setMessage(event.target.value)}/>
  {q.data.remaining===null?<><p role="alert" className="text-sm text-destructive">Solde Coins insuffisant. Aucun Coin ne sera débité.</p><Button asChild variant="outline" className="w-full"><Link to="/coins"><Coins/>Recharger PANU Coins</Link></Button></>:<Button className="w-full" disabled={mutation.isPending||q.isFetching||q.isError} onClick={()=>mutation.mutate()}><Send/>{mutation.isPending?'Envoi…':`Confirmer · ${BigInt(q.data.price).toLocaleString('fr-FR')} Coins`}</Button>}
  </>:null}
 </div>;
}
