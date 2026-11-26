import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { ArrowLeft, Coins, Gift, Plus, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getGiftCatalogue } from '@/lib/gifts.functions';
import { getCoins } from '@/lib/coins.functions';
import { giftCategoryLabel, giftMatchesFilter } from '@/lib/gifts-rules';
import { GiftArtwork } from './GiftArtwork';
import { GiftComposer } from './GiftComposer';
import { GiftHistory } from './GiftHistory';
import { GiftRevenueSummary } from './GiftRevenueSummary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const giftsQueryOptions = queryOptions({ queryKey: ['panu-gifts','catalogue'], queryFn: () => getGiftCatalogue(), staleTime: 30_000 });
const filters = [{ id: 'all', label: 'Tous' }, { id: 'popular', label: 'Populaires' }, { id: 'accessible', label: 'Simples' }, { id: 'animated', label: 'Animés' }, { id: 'premium', label: 'Premium' }, { id: 'special', label: 'Spéciaux' }];
export function GiftsPage() {
  const catalogue = useSuspenseQuery(giftsQueryOptions);
  const fetchCoins = useServerFn(getCoins);
  const wallet = useQuery({ queryKey: ['panu-coins'], queryFn: () => fetchCoins() });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = catalogue.data.find((g) => g.id === selectedId);
  const gifts = catalogue.data.filter((g) => giftMatchesFilter(g,filter) && g.name.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')));
  return <AppShell title="PANU Cadeaux" subtitle="La galerie" headerAction={<Button variant="ghost" size="icon" aria-label="Actualiser les cadeaux" title="Actualiser les cadeaux" disabled={catalogue.isFetching} onClick={() => void catalogue.refetch()}><RefreshCw className={catalogue.isFetching ? 'animate-spin' : ''}/></Button>}>
    <div className="space-y-5 px-4 py-5">
      <Button asChild variant="link" className="h-auto p-0"><Link to="/coins"><ArrowLeft/>PANU Coins</Link></Button>
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div><p className="text-xs text-muted-foreground">Votre solde PANU Coins</p><p className="mt-1 flex items-center gap-2 text-2xl font-bold"><Coins className="size-6 text-gold"/>{wallet.data ? BigInt(wallet.data.wallet.balance).toLocaleString('fr-FR') : wallet.isError ? 'Indisponible' : '…'}<span className="text-sm font-medium text-muted-foreground">Coins</span></p></div>
        <Button asChild variant="outline" size="sm"><Link to="/coins"><Plus/>Recharger</Link></Button>
      </section>
      <Tabs defaultValue="galerie" className="space-y-4"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="galerie">Galerie</TabsTrigger><TabsTrigger value="sent">Envoyés</TabsTrigger><TabsTrigger value="received">Reçus</TabsTrigger></TabsList><TabsContent value="galerie" className="space-y-4">
      <section className="space-y-2"><h2 className="flex items-center gap-2 text-lg font-semibold tracking-normal"><Gift className="text-gold"/>Cadeaux PANU</h2>{wallet.data?.adapters.length===0?<p className="text-sm text-muted-foreground">Les recharges ne sont pas encore ouvertes : aucun moyen de paiement n’est validé.</p>:null}</section>
      <label className="flex items-center gap-2"><Search className="size-4 shrink-0 text-muted-foreground"/><Input aria-label="Rechercher un cadeau" placeholder="Rechercher un cadeau" value={search} maxLength={80} onChange={(e) => setSearch(e.target.value)}/></label>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Catégories de cadeaux">{filters.map((f) => <Button key={f.id} variant={filter===f.id?'secondary':'ghost'} size="sm" aria-pressed={filter===f.id} onClick={() => setFilter(f.id)}>{f.label}</Button>)}</div>
      {catalogue.isRefetchError ? <p role="alert" className="text-sm text-destructive">Actualisation impossible. Les prix affichés peuvent avoir changé.</p> : null}
      {gifts.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{gifts.map((g) => <Button key={g.id} variant="outline" aria-label={`Voir ${g.name}, ${g.price_coins} Coins`} onClick={() => setSelectedId(g.id)} className="relative flex h-auto min-h-64 flex-col justify-start gap-1 whitespace-normal rounded-lg bg-surface p-3 text-center">
        <div className="flex h-5 w-full items-center justify-center gap-1 text-[10px] text-accent">{g.popular ? 'Populaire' : giftCategoryLabel(g.category)}{g.animation !== 'none' || g.animation_path ? <Sparkles className="size-3"/> : null}</div>
        <GiftArtwork name={g.name} imageUrl={g.imageUrl}/><span className="min-h-10 text-sm font-semibold">{g.name}</span><span className="flex items-center gap-1 text-base font-bold text-gold"><Coins className="size-4"/>{BigInt(g.price_coins).toLocaleString('fr-FR')}</span><span className="text-[10px] text-muted-foreground">{g.available ? 'Au catalogue' : 'Indisponible'}</span>
      </Button>)}</div> : <p className="py-10 text-center text-sm text-muted-foreground">Aucun cadeau dans cette sélection.</p>}
      </TabsContent><TabsContent value="sent"><GiftHistory direction="sent"/></TabsContent><TabsContent value="received"><GiftHistory direction="received"/><GiftRevenueSummary/></TabsContent></Tabs>
    </div>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}><DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto"><DialogHeader><DialogTitle>{selected?.name ?? 'Cadeau PANU'}</DialogTitle><DialogDescription>{selected ? giftCategoryLabel(selected.category) : ''} · Illustration PANU</DialogDescription></DialogHeader>{selected ? <><div className="flex justify-center"><GiftArtwork name={selected.name} imageUrl={selected.imageUrl} animationUrl={selected.animationUrl} animation={selected.animation} animate/></div><p className="flex justify-center gap-2 text-xl font-bold text-gold"><Coins/>{BigInt(selected.price_coins).toLocaleString('fr-FR')} Coins</p><GiftComposer key={selected.id} giftId={selected.id} available={selected.available} onSent={()=>setSelectedId(null)}/><Button variant="outline" onClick={() => setSelectedId(null)}>Retour à la galerie</Button></> : null}</DialogContent></Dialog>
  </AppShell>;
}
