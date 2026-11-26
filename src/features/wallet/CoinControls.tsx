import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, CreditCard, Smartphone, Landmark, ShoppingBag } from "lucide-react";
import type { CoinOrder } from "@/lib/coins-data";
import { formatCoinPrice, STATUS_LABELS } from "@/lib/coins-rules";

export function CoinSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <label className="grid min-w-0 gap-1.5 text-xs text-muted-foreground"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger className="w-full min-w-0 bg-surface text-foreground"><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></label>;
}
export function CoinField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-xs text-muted-foreground"><span>{label}</span>{children}</label>;
}
export function PaymentIcon({ channel }: { channel: string }) {
  const Icon = channel === "mobile_money" ? Smartphone : channel === "bank_transfer" ? Landmark : channel === "google_play" ? ShoppingBag : CreditCard;
  return <Icon className="size-5 shrink-0 text-accent" aria-hidden="true" />;
}
export function CoinOrderList({ orders, onVerify, busy }: { orders: CoinOrder[]; onVerify?: (id: string) => void; busy?: boolean }) {
  if (!orders.length) return <p className="py-8 text-center text-sm text-muted-foreground">Aucun achat enregistré.</p>;
  return <ul className="divide-y divide-border">{orders.map((order) => <li key={order.id} className="space-y-2 py-4">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{order.pack_name}</p><p className="text-sm text-muted-foreground">{BigInt(order.coins).toLocaleString("fr-FR")} Coins{BigInt(order.bonus) > 0n ? ` + ${order.bonus} bonus` : ""}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold">{formatCoinPrice(order.amount_minor, order.exponent, order.currency)}</p><p className={`text-xs ${order.status === "succeeded" ? "text-accent" : order.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>{STATUS_LABELS[order.status] ?? order.status}</p></div></div>
    <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("fr-FR")} · {order.provider} · {order.country}</p>
    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Référence de l’achat</summary><p className="break-all py-2">{order.external_reference ?? order.id}</p></details>
    {onVerify && ["pending", "processing"].includes(order.status) ? <Button variant="outline" size="sm" disabled={busy} onClick={() => onVerify(order.id)}><ArrowUpRight />Vérifier le paiement</Button> : null}
  </li>)}</ul>;
}