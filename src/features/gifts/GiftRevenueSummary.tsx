import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGiftSummary } from '@/lib/gifts.functions';
import { formatGiftMoney } from '@/lib/gifts-data';
import { useAuth } from '@/hooks/useAuth';

export function GiftRevenueSummary() {
 const fetch=useServerFn(getGiftSummary);
 const {user}=useAuth();
 const q=useQuery({queryKey:['gift-summary',user?.id],enabled:Boolean(user),queryFn:()=>fetch()});
 return <section className="space-y-3 border-t border-border py-5"><h3 className="flex items-center gap-2 text-sm font-semibold tracking-normal"><Gift className="size-5 text-gold"/>Revenus et cadeaux</h3>
 {q.isPending?<p className="text-sm text-muted-foreground">Chargement des revenus…</p>:q.isError?<p role="alert" className="text-sm text-destructive">Les revenus ne peuvent pas être confirmés.</p>:q.data?<><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Cadeaux reçus</dt><dd className="text-xl font-semibold">{q.data.received.toLocaleString('fr-FR')}</dd></div><div><dt className="text-muted-foreground">Cadeaux envoyés</dt><dd className="text-xl font-semibold">{q.data.sent.toLocaleString('fr-FR')}</dd></div></dl>{q.data.currencies.length?<ul>{q.data.currencies.map((c)=><li key={`${c.currency}:${c.exponent}`} className="py-2 text-sm"><span className="text-gold">{formatGiftMoney(c.pending_minor,c.exponent,c.currency)}</span> · Revenus en attente</li>)}</ul>:<p className="text-sm text-muted-foreground">Aucun revenu cadeau enregistré.</p>}</>:null}
 <p className="text-xs text-muted-foreground">Les revenus sont calculés sur les encaissements nets vérifiés après frais. Ils restent en attente et ne sont pas retirables.</p><Button asChild variant="outline" size="sm"><Link to="/cadeaux">Mes cadeaux</Link></Button>
 </section>;
}
