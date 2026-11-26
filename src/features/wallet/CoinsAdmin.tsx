import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Coins, Pencil, Plus, Save, Search, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStepUp } from "@/components/security/StepUp";
import { getAdminCoins, saveCoinsConfig } from "@/lib/coins.functions";
import { configSchema, decimalAmount, formatCoinPrice } from "@/lib/coins-rules";
import type { AdminCoinsData } from "@/lib/coins-data";
import { isStepUpRequiredError } from "@/lib/passkey-rules";
import { CoinField, CoinOrderList, CoinSelect } from "./CoinControls";

type FormKind = "pack" | "price" | "channel";
const emptyForm = { id: "", name: "", coins: "", bonus: "0", popular: false, active: false, pack_id: "", country: "CD", currency: "", amount: "", exponent: "2", google_product_id: "", provider: "", channel: "mobile_money", enabled: false };
type Form = typeof emptyForm;

export function CoinsAdmin() {
  const fetch = useServerFn(getAdminCoins);
  const save = useServerFn(saveCoinsConfig);
  const q = useQuery({ queryKey: ["admin", "coins"], queryFn: () => fetch() });
  const cache = useQueryClient();
  const stepUp = useStepUp();
  const [editing, setEditing] = useState<FormKind | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const mutation = useMutation({ mutationFn: (input: Parameters<typeof save>[0]) => save(input), onSuccess: () => {
    setEditing(null); void cache.invalidateQueries({ queryKey: ["admin", "coins"] }); void cache.invalidateQueries({ queryKey: ["panu-coins"] }); toast.success("Configuration enregistrée");
  }, onError: (error, variables) => {
    if (isStepUpRequiredError(error.message)) stepUp.request(() => mutation.mutate(variables)); else toast.error(error.message);
  } });
  const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm((old) => ({ ...old, [key]: value }));
  function submit() {
    if (!editing) return;
    const id = form.id ? { id: form.id } : {};
    const input = configSchema.safeParse(editing === "pack" ? { kind: "pack", data: { ...id, name: form.name, coins: form.coins, bonus: form.bonus, popular: form.popular, active: form.active } } : editing === "price" ? { kind: "price", data: { ...id, pack_id: form.pack_id, country: form.country.toUpperCase(), currency: form.currency.toUpperCase(), amount: form.amount, exponent: form.exponent, google_product_id: form.google_product_id, active: form.active } } : { kind: "channel", data: { ...id, name: form.name, provider: form.provider, channel: form.channel, country: form.country.toUpperCase(), currency: form.currency.toUpperCase(), enabled: form.enabled } });
    if (!input.success) { toast.error(input.error.errors[0]?.message ?? "Configuration invalide"); return; }
    mutation.mutate({ data: input.data });
  }
  function openPack(p: AdminCoinsData["packs"][number]) { setForm({ ...emptyForm, ...p }); setEditing("pack"); }
  function openPrice(p: AdminCoinsData["prices"][number]) { setForm({ ...emptyForm, ...p, exponent: String(p.exponent), amount: decimalAmount(p.amount_minor, p.exponent), google_product_id: p.google_product_id ?? "" }); setEditing("price"); }
  function openChannel(p: AdminCoinsData["channels"][number]) { setForm({ ...emptyForm, ...p }); setEditing("channel"); }
  if (q.isPending) return <p className="py-10 text-center text-sm text-muted-foreground">Chargement de PANU Coins…</p>;
  if (q.isError || !q.data) return <p role="alert" className="py-6 text-sm text-destructive">Configuration financière inaccessible : {q.error?.message}</p>;
  const data = q.data;
  const orders = data.orders.filter((o) => (filter === "all" || o.status === filter) && `${o.id} ${o.user_id ?? ""} ${o.external_reference ?? ""} ${o.provider} ${o.country} ${o.currency}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-5">
    {stepUp.dialog}
    <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold tracking-normal"><Coins className="text-gold" />PANU Coins</h2><Button asChild variant="outline" size="sm"><Link to="/coins">Portefeuille</Link></Button></div>
    <p className="text-xs leading-relaxed text-muted-foreground">Les moyens ne deviennent opérationnels qu’après connexion et validation indépendante du prestataire. Aucun crédit manuel n’est proposé.</p>
    <Tabs defaultValue="packs" className="space-y-4"><TabsList className="grid w-full grid-cols-4"><TabsTrigger value="packs">Packs</TabsTrigger><TabsTrigger value="prices">Prix</TabsTrigger><TabsTrigger value="channels">Moyens</TabsTrigger><TabsTrigger value="orders">Achats</TabsTrigger></TabsList>
      <TabsContent value="packs" className="space-y-3"><Button variant="outline" size="sm" onClick={() => { setForm(emptyForm); setEditing("pack"); }}><Plus />Ajouter un pack</Button>{!data.packs.length ? <p className="py-6 text-sm text-muted-foreground">Aucun pack configuré.</p> : <ul className="divide-y divide-border">{data.packs.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.coins} Coins · bonus {p.bonus} · {p.active ? "Actif" : "Désactivé"}{p.popular ? " · Populaire" : ""}</p></div><Button variant="ghost" size="icon" title="Modifier le pack" aria-label={`Modifier ${p.name}`} onClick={() => openPack(p)}><Pencil /></Button></li>)}</ul>}</TabsContent>
      <TabsContent value="prices" className="space-y-3"><Button variant="outline" size="sm" disabled={!data.packs.length} onClick={() => { setForm({ ...emptyForm, pack_id: data.packs[0]?.id ?? "" }); setEditing("price"); }}><Plus />Ajouter un prix</Button>{!data.prices.length ? <p className="py-6 text-sm text-muted-foreground">Aucun prix configuré. Ajoutez d’abord un pack.</p> : <ul className="divide-y divide-border">{data.prices.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{data.packs.find((pack) => pack.id === p.pack_id)?.name}</p><p className="text-xs text-muted-foreground">{formatCoinPrice(p.amount_minor, p.exponent, p.currency)} · {p.country} · {p.active ? "Actif" : "Désactivé"}</p></div><Button variant="ghost" size="icon" title="Modifier le prix" aria-label={`Modifier le prix ${p.country} ${p.currency}`} onClick={() => openPrice(p)}><Pencil /></Button></li>)}</ul>}</TabsContent>
      <TabsContent value="channels" className="space-y-3"><Button variant="outline" size="sm" onClick={() => { setForm(emptyForm); setEditing("channel"); }}><Plus />Configurer un moyen</Button>{!data.channels.length ? <p className="py-6 text-sm text-muted-foreground">Aucun prestataire configuré.</p> : <ul className="divide-y divide-border">{data.channels.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.provider} · {p.country} · {p.currency}</p><p className="text-xs text-muted-foreground">{p.verified_at ? "Intégration vérifiée" : "Intégration non vérifiée"} · {p.enabled ? "Activation demandée" : "Désactivé"}</p></div><Button variant="ghost" size="icon" title="Modifier le moyen" aria-label={`Modifier ${p.name}`} onClick={() => openChannel(p)}><Pencil /></Button></li>)}</ul>}</TabsContent>
      <TabsContent value="orders" className="space-y-3"><CoinField label="Rechercher une référence, un compte, un pays ou un prestataire"><div className="flex items-center gap-2"><Search className="size-4 text-muted-foreground" /><Input value={search} maxLength={160} onChange={(e) => setSearch(e.target.value)} /></div></CoinField><CoinSelect label="Statut" value={filter} onChange={setFilter} options={[{ value: "all", label: "Tous" }, { value: "pending", label: "En attente" }, { value: "processing", label: "En cours" }, { value: "succeeded", label: "Confirmés" }, { value: "cancelled", label: "Annulés" }, { value: "failed", label: "Échecs" }, { value: "refunded", label: "Remboursés" }]} /><CoinOrderList orders={orders} /><p className="text-xs text-muted-foreground">Les 200 achats les plus récents sont consultables ici.</p></TabsContent>
    </Tabs>
    {editing ? <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4 border-t border-border pt-5" aria-label="Configuration Coins"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold tracking-normal">{form.id ? "Modifier" : "Ajouter"} {editing === "pack" ? "un pack" : editing === "price" ? "un prix" : "un moyen de paiement"}</h3><Button type="button" variant="ghost" size="icon" title="Fermer" aria-label="Fermer le formulaire" onClick={() => setEditing(null)}><X /></Button></div>
      {editing !== "price" ? <CoinField label="Nom"><Input required maxLength={80} value={form.name} onChange={(e) => update("name", e.target.value)} /></CoinField> : null}
      {editing === "pack" ? <><div className="grid grid-cols-2 gap-3"><CoinField label="Quantité de Coins"><Input required type="number" min="1" max="1000000000" value={form.coins} onChange={(e) => update("coins", e.target.value)} /></CoinField><CoinField label="Bonus"><Input type="number" min="0" max="1000000000" required value={form.bonus} onChange={(e) => update("bonus", e.target.value)} /></CoinField></div><label className="flex items-center gap-2 text-sm"><Checkbox checked={form.popular} onCheckedChange={(v) => update("popular", v === true)} />Pack populaire</label></> : <>
        {editing === "price" ? <CoinSelect label="Pack" value={form.pack_id} onChange={(v) => update("pack_id", v)} options={data.packs.map((p) => ({ value: p.id, label: p.name }))} /> : <><CoinField label="Code prestataire"><Input required disabled={Boolean(form.id)} maxLength={40} value={form.provider} onChange={(e) => update("provider", e.target.value)} /></CoinField>{!form.id ? <CoinSelect label="Type de paiement" value={form.channel} onChange={(v) => update("channel", v)} options={[{ value: "mobile_money", label: "Mobile Money" }, { value: "google_play", label: "Google Play" }, { value: "card", label: "Carte bancaire" }, { value: "bank_transfer", label: "Virement bancaire" }]} /> : null}</>}
        <div className="grid grid-cols-2 gap-3"><CoinField label="Pays (code ISO)"><Input required maxLength={2} disabled={editing === "channel" && Boolean(form.id)} value={form.country} onChange={(e) => update("country", e.target.value.toUpperCase())} /></CoinField><CoinField label="Devise (code ISO)"><Input required maxLength={3} disabled={editing === "channel" && Boolean(form.id)} value={form.currency} onChange={(e) => update("currency", e.target.value.toUpperCase())} /></CoinField></div>
        {editing === "price" ? <><div className="grid grid-cols-2 gap-3"><CoinField label="Prix"><Input required inputMode="decimal" value={form.amount} onChange={(e) => update("amount", e.target.value.replace(",", "."))} maxLength={17} /></CoinField><CoinSelect label="Décimales de la devise" value={form.exponent} onChange={(v) => update("exponent", v)} options={[0, 1, 2, 3].map((v) => ({ value: String(v), label: String(v) }))} /></div><CoinField label="Identifiant produit Google Play (facultatif)"><Input maxLength={100} value={form.google_product_id} onChange={(e) => update("google_product_id", e.target.value)} /></CoinField></> : null}
      </>}
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={editing === "channel" ? form.enabled : form.active} onCheckedChange={(v) => update(editing === "channel" ? "enabled" : "active", v === true)} />{editing === "channel" ? "Demander l’activation après validation du prestataire" : "Actif"}</label>
      <Button type="submit" disabled={mutation.isPending}><Save />{mutation.isPending ? "Enregistrement…" : "Enregistrer"}</Button><p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4" />Confirmation de sécurité requise. Chaque modification est journalisée.</p>
    </form> : null}
  </div>;
}