import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getGiftHistory } from '@/lib/gifts.functions';

/** One private, data-free doorbell per signed-in identity; no public financial broadcast. */
export function GiftNotificationBridge() {
 const {user}=useAuth();
 const cache=useQueryClient();
 const fetch=useServerFn(getGiftHistory);
 useEffect(()=>{
  if(!user)return;
  const started=Date.now(),seen=new Set<string>();
  let subscriptions=0,cancelled=false,timer:ReturnType<typeof setTimeout>|null=null;
  const refresh=(showToast=false)=>{
   if(timer)clearTimeout(timer);
   timer=setTimeout(()=>{
    if(cancelled)return;
    void cache.invalidateQueries({queryKey:['gift-history']});void cache.invalidateQueries({queryKey:['gift-summary']});void cache.invalidateQueries({queryKey:['panu-coins']});void cache.invalidateQueries({queryKey:['notifications']});void cache.invalidateQueries({queryKey:['gift-notification-context']});void cache.invalidateQueries({queryKey:['unread-notifications']});
    if(showToast)void fetch({data:{direction:'received',offset:0}}).then((rows)=>{
     if(cancelled)return;
     for(const row of rows.filter((r)=>r.notification_id&&new Date(r.created_at).getTime()>=started&&!seen.has(r.id)).slice(0,3)) {seen.add(row.id);toast(`${row.sender_name} vous a envoyé ${row.gift_name}`,row.message?{description:row.message}:{});}
    }).catch(()=>undefined);
   },200);
  };
  const channel=supabase.channel(`panu-gifts:${user.id}`,{config:{private:true}}).on('broadcast',{event:'gift_changed'},()=>refresh(true)).subscribe((status)=>{
   if(status!=='SUBSCRIBED')return;
   subscriptions++;
   if(subscriptions>1){refresh();return;}
   const state=cache.getQueryState(['gift-summary',user.id]);
   if(state&&state.fetchStatus!=='fetching'&&Date.now()-state.dataUpdatedAt>10000)refresh();
  });
  return()=>{cancelled=true;if(timer)clearTimeout(timer);void supabase.removeChannel(channel);};
 },[user?.id,cache,fetch]);
 return null;
}
