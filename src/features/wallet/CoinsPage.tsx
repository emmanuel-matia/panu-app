import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Coins, Gift, History, Loader2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCoins, setDefaultCoinMethod, startCoinPurchase, verifyCoinPurchase } from "@/lib/coins.functions";
import { canUseChannel, formatCoinPrice, PAYMENT_CANDIDATES } from "@/lib/coins-rules";
import { CoinOrderList, CoinSelect, PaymentIcon } from "./CoinControls";

export function CoinsPage() {
  const fetchCoins = useServerFn(getCoins);
  const startPurchase = useServerFn(startCoinPurchase);
  const verifyPurchase = useServerFn(verifyCoinPurchase);
  const setDefault = useServerFn(setDefaultCoinMethod);
  const cache = useQueryClient();
  const q = useQuery({ queryKey: ["panu-coins"], queryFn: () => fetchCoins(), refetchOnWindowFocus: true });
  const [country, setCountry] = useState("CD");
  const [currency, setCurrency] = useState("");
  const [priceId, setPriceId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [playStore, setPlayStore] = useState(false);
  const request = useRef<{ key: string; id: string } | null>(null);
  useEffect(() => {
    // TWA referrers are a UX hint only; integrations must also enforce Play policy in their distribution configuration.
    setPlayStore(document.referrer.startsWith("android-app://"));
  }, []);
  const data = q.data;
  const currencies = [...new Set(data?.catalogue.packs.filter((p) => p.country === country).map((p) => p.currency) ?? [])];
  const chosenCurrency = currencies.includes(currency) ? currency : (currencies[0] ?? "");
  const packs = data?.catalogue.packs.filter((p) => p.country === country && p.currency === chosenCurrency) ?? [];
  const selected = packs.find((p) => p.id === priceId);
  const channels = data?.catalogue.channels.filter((c) => c.country === country && c.currency === chosenCurrency) ?? [];
  const available = channels.filter((c) => canUseChannel(c, country, chosenCurrency, data?.adapters ?? [], playStore));
  const countries = [...new Set(["CD", ...(data?.catalogue.packs.map((p) => p.country) ?? []), ...(data?.catalogue.channels.map((c) => c.country) ?? [])])];
  const purchase = useMutation({ mutationFn: async () => {
    if (!selected || !available.some((c) => c.id === channelId)) throw new Error("Sélectionnez un pack et un moyen de paiement disponible");
    const key = `${selected.id}:${channelId}`;
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    const current = request.current;
    if (!current) throw new Error("Référence d’achat indisponible");
    return startPurchase({ data: { priceId: selected.id, channelId, requestId: current.id } });
  }, onSuccess: (result) => {
    void cache.invalidateQueries({ queryKey: ["panu-coins"] });
    if (result.url) window.location.assign(result.url);
    else toast.info("Consultez le statut de cet achat dans votre historique");
  }, onError: (error) => toast.error(error.message) });
  const verify = useMutation({ mutationFn: (orderId: string) => verifyPurchase({ data: { orderId } }), onSuccess: () => { void cache.invalidateQueries({ queryKey: ["panu-coins"] }); toast.info("Statut du paiement vérifié"); }, onError: (e) => toast.error(e.message) });
  const defaultMethod = useMutation({ mutationFn: (id: string) => setDefault({ data: { id } }), onSuccess: () => { void cache.invalidateQueries({ queryKey: ["panu-coins"] }); }, onError: (e) => toast.error(e.message) });

  return <AppShell title="PANU Coins" subtitle="Votre portefeuille" headerAction={<Button variant="ghost" size="icon" title="Actualiser le portefeuille" aria-label="Actualiser le portefeuille" onClick={() => void q.refetch()} disabled={q.isFetching}><RefreshCw className={q.isFetching ? "animate-spin" : ""} /></Button>}>
    <div className="space-y-6 px-4 py-5">
      <Button asChild variant="link" className="h-auto p-0"><Link to="/parametres/$section" params={{ section: "paiements" }}><ArrowLeft />Paiements</Link></Button>
      {q.isPending ? <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-accent" aria-label="Chargement du portefeuille" /></div> : q.isError || !data ? <div role="alert" className="space-y-3 py-8"><p className="text-destructive">Le portefeuille n’a pas pu être chargé. Aucun solde ne peut être confirmé.</p><Button variant="outline" onClick={() => void q.refetch()}><RefreshCw />Réessayer</Button></div> : <>
        <section className="border-b border-border pb-6" aria-label="Solde Coins">
          <div className="flex items-center gap-3"><div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10"><Coins className="size-7 text-gold" /></div><div><p className="text-sm text-muted-foreground">Solde disponible</p><p className="font-display text-3xl font-bold tracking-normal">{BigInt(data.wallet.balance).toLocaleString("fr-FR")} <span className="text-lg font-medium text-gold">Coins</span></p></div></div>
          <p className="mt-4 text-xs text-muted-foreground">Les PANU Coins sont distincts des crédits du Studio IA et des revenus créateurs.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/cadeaux"><Gift />Galerie PANU Cadeaux</Link></Button>
        </section>
        <Tabs defaultValue="recharge" className="space-y-5"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="recharge"><Plus className="mr-1 size-4" />Recharger</TabsTrigger><TabsTrigger value="historique"><History className="mr-1 size-4" />Historique</TabsTrigger><TabsTrigger value="comptes">Comptes</TabsTrigger></TabsList>
          <TabsContent value="recharge" className="space-y-6">
            <div className="grid grid-cols-2 gap-3"><CoinSelect label="Pays" value={country} onChange={(v) => { setCountry(v); setPriceId(""); setChannelId(""); }} options={countries.map((value) => ({ value, label: new Intl.DisplayNames(["fr"], { type: "region" }).of(value) ?? value }))} /><CoinSelect label="Devise" value={chosenCurrency} onChange={(v) => { setCurrency(v); setPriceId(""); setChannelId(""); }} options={currencies.map((v) => ({ value: v, label: v }))} /></div>
            <section aria-labelledby="packs-title"><h2 id="packs-title" className="mb-3 text-lg font-semibold tracking-normal">Packs PANU Coins</h2>
              {!packs.length ? <p className="border-y border-border py-8 text-center text-sm text-muted-foreground">Aucun pack n’est encore proposé dans ce marché.<br />Les tarifs sont en cours de configuration.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{packs.map((p) => <Button key={p.id} variant="outline" aria-pressed={priceId === p.id} onClick={() => { setPriceId(p.id); request.current = null; }} className={`relative flex h-36 flex-col gap-1 whitespace-normal rounded-[8px] px-2 text-center ${p.id === priceId ? "border-gold bg-gold/10" : "bg-surface"}`}>
                {p.popular ? <span className="text-[10px] font-semibold uppercase text-accent">Populaire</span> : null}<Coins className="text-gold" /><span className="text-xl font-bold">{BigInt(p.coins).toLocaleString("fr-FR")}</span>{BigInt(p.bonus) > 0n ? <span className="text-xs text-gold">+ {p.bonus} bonus</span> : null}<span className="text-xs text-muted-foreground">{formatCoinPrice(p.amount_minor, p.exponent, p.currency)}</span>
              </Button>)}</div>}
            </section>
            <section aria-labelledby="methods-title"><h2 id="methods-title" className="mb-3 text-lg font-semibold tracking-normal">Moyens de paiement</h2>
              <div className="divide-y divide-border">{channels.length ? channels.map((c) => {
                const usable = available.some((a) => a.id === c.id);
                return <Button key={c.id} variant="ghost" disabled={!usable} aria-pressed={channelId === c.id} onClick={() => setChannelId(c.id)} className="flex h-auto min-h-16 w-full justify-start whitespace-normal px-0 py-3 text-left disabled:opacity-70"><PaymentIcon channel={c.channel} /><span className="min-w-0 flex-1"><span className="block font-semibold">{c.name}</span><span className="text-xs text-muted-foreground">{usable ? `${c.country} · ${c.currency}` : "Non opérationnel · intégration à valider"}</span></span>{channelId === c.id ? <Check className="text-gold" /> : null}</Button>;
              }) : PAYMENT_CANDIDATES.filter((c) => country === "CD" || c.channel !== "mobile_money").map((c) => <div key={c.name} className="flex min-h-16 items-center gap-3 py-3"><PaymentIcon channel={c.channel} /><div><p className="text-sm font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">Non opérationnel · intégration requise</p></div></div>)}</div>
              {playStore ? <p className="mt-3 text-xs text-muted-foreground">Les achats numériques de cette version Android doivent passer par Google Play.</p> : null}
            </section>
            <div className="sticky bottom-24 z-10 space-y-2 border-t border-border bg-background py-3"><Button size="lg" className="w-full" disabled={!selected || !available.some((c) => c.id === channelId) || purchase.isPending} onClick={() => purchase.mutate()}><Plus />{purchase.isPending ? "Préparation…" : selected ? `Recharger · ${formatCoinPrice(selected.amount_minor, selected.exponent, selected.currency)}` : "Recharger"}</Button><p className="text-center text-xs text-muted-foreground">{available.length ? "Crédit après confirmation du paiement uniquement." : "Les achats ne sont pas encore ouverts."}</p></div>
          </TabsContent>
          <TabsContent value="historique" className="space-y-5"><h2 className="text-lg font-semibold tracking-normal">Achats et recharges</h2><CoinOrderList orders={data.wallet.orders} onVerify={(id) => verify.mutate(id)} busy={verify.isPending} /><h2 className="border-t border-border pt-5 text-lg font-semibold tracking-normal">Mouvements de Coins</h2>{data.wallet.ledger.length ? <ul className="divide-y divide-border">{data.wallet.ledger.map((entry) => <li key={entry.id} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-medium">{{ purchase: "Achat", bonus: "Bonus", gift: "Cadeau envoyé", refund: "Remboursement" }[entry.kind] ?? entry.kind}</p><p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString("fr-FR")}</p><p className="break-all text-xs text-muted-foreground">{entry.reference}</p></div><p className={BigInt(entry.amount) > 0n ? "shrink-0 font-semibold text-gold" : "shrink-0 font-semibold"}>{BigInt(entry.amount) > 0n ? "+" : ""}{BigInt(entry.amount).toLocaleString("fr-FR")}</p></li>)}</ul> : <p className="py-6 text-center text-sm text-muted-foreground">Aucun mouvement de Coins enregistré.</p>}<p className="text-xs text-muted-foreground">Les 100 opérations les plus récentes sont affichées.</p></TabsContent>
          <TabsContent value="comptes" className="space-y-4"><h2 className="text-lg font-semibold tracking-normal">Mes comptes de paiement</h2>{data.wallet.methods.length ? <ul className="divide-y divide-border">{data.wallet.methods.map((m) => <li key={m.id} className="flex items-center justify-between gap-3 py-4"><div><p className="text-sm font-semibold">{m.label}</p><p className="text-xs text-muted-foreground">{m.account_identifier} · {m.currency}</p><p className="text-xs text-muted-foreground">{m.is_default ? "Compte par défaut" : m.status === "active" ? "Actif" : "Non actif"}</p></div>{m.status === "active" && !m.is_default ? <Button variant="outline" size="sm" disabled={defaultMethod.isPending} onClick={() => defaultMethod.mutate(m.id)}>Par défaut</Button> : null}</li>)}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">Aucun compte de paiement enregistré.</p>}<p className="text-xs text-muted-foreground">L’ajout d’un compte sera disponible avec un prestataire connecté. PANU ne conserve ni numéro complet de carte ni code de sécurité.</p></TabsContent>
        </Tabs>
        <section className="space-y-3 border-t border-border pt-5"><h2 className="flex items-center gap-2 text-sm font-semibold tracking-normal"><ShieldCheck className="size-4 text-accent" />Règles d’utilisation</h2><ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground"><li>Un paiement en attente, refusé ou annulé n’ajoute aucun Coin.</li><li>Les achats confirmés sont crédités une seule fois et conservés dans l’historique.</li><li>Une capture d’écran ou une déclaration de virement ne constitue pas une confirmation bancaire.</li><li>Les cadeaux ne sont pas encore ouverts. Les Coins ne constituent pas un solde de revenus à retirer.</li></ul></section>
      </>}
    </div>
  </AppShell>;
}