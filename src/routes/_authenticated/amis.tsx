import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Contact, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { FollowToggle } from "@/components/profile/FollowToggle";
import { PersonRow, useSignedAvatars } from "@/components/profile/PersonRow";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { normalizeContactNumbers } from "@/lib/prefs";

export const Route = createFileRoute("/_authenticated/amis")({
  head: () => ({
    meta: [
      { title: "Retrouver mes amis — PANU" },
      { name: "description", content: "Trouvez dans votre répertoire les personnes déjà inscrites sur PANU." },
      { property: "og:title", content: "Retrouver mes amis — PANU" },
      { property: "og:description", content: "Synchronisation facultative et sécurisée de vos contacts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FriendsPage,
});

type ContactPicker = {
  select: (props: string[], opts?: { multiple?: boolean }) => Promise<{ tel?: string[] }[]>;
};

function FriendsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [discoverable, setDiscoverable] = useState(false);
  const picker =
    typeof navigator !== "undefined" && "contacts" in navigator
      ? ((navigator as unknown as { contacts: ContactPicker }).contacts)
      : null;

  const myPhone = useQuery({
    queryKey: ["my-phone", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("phone_lookup").select("phone, discoverable").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const savePhone = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("set_my_phone", { _phone: phone, _discoverable: discoverable });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Numéro enregistré");
      setPhone("");
      void queryClient.invalidateQueries({ queryKey: ["my-phone"] });
    },
    onError: () => toast.error("Numéro invalide (8 à 15 chiffres, « + » autorisé)."),
  });

  const matches = useMutation({
    mutationFn: async () => {
      if (!picker) throw new Error("unsupported");
      const chosen = await picker.select(["tel"], { multiple: true });
      const numbers = normalizeContactNumbers(chosen.flatMap((c) => c.tel ?? []));
      if (numbers.length === 0) return { people: [], scanned: 0 };
      const { data, error } = await supabase.rpc("match_contacts", { _numbers: numbers });
      if (error) throw error;
      return { people: data ?? [], scanned: numbers.length };
    },
    onError: (e) => {
      if (e instanceof Error && e.name === "AbortError") return;
      toast.error("Impossible de lire les contacts choisis.");
    },
  });

  const people = matches.data?.people ?? [];
  const avatars = useSignedAvatars(people);

  return (
    <AppShell
      title="Retrouver mes amis"
      headerAction={
        <Link to="/personnes" search={{ onglet: "decouvrir" }} aria-label="Retour" className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
      }
    >
      <div className="space-y-4 px-4 py-4">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 text-accent" /> Pourquoi cette autorisation ?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pour savoir lesquels de vos contacts utilisent déjà PANU. Vous choisissez les contacts partagés, seuls leurs numéros sont comparés, ils ne sont pas conservés, et aucun numéro n'est jamais affiché. Cette étape est facultative.
          </p>
          {picker ? (
            <button type="button" onClick={() => matches.mutate()} disabled={matches.isPending} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-primary-foreground">
              <Contact className="size-4" /> {matches.isPending ? "Recherche…" : "Choisir des contacts"}
            </button>
          ) : (
            <p className="mt-3 rounded-xl border border-border p-3 text-xs text-muted-foreground">
              Votre navigateur ne permet pas d'accéder au répertoire (disponible sur Chrome pour Android). Vous pouvez inviter vos amis avec votre lien, ou chercher un nom dans la communauté.
            </p>
          )}
          <Link to="/inviter" className="mt-3 inline-block text-sm font-medium text-accent underline">
            Inviter ceux qui ne sont pas encore inscrits
          </Link>
        </section>

        {matches.data ? (
          <section className="overflow-hidden rounded-2xl border border-border bg-surface">
            <h2 className="px-4 pt-4 text-sm font-semibold text-foreground">
              {people.length} ami(s) trouvé(s) sur {matches.data.scanned} numéro(s)
            </h2>
            {people.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Aucun contact choisi n'est encore visible sur PANU. Invitez-les !</p>
            ) : (
              <ul className="divide-y divide-border">
                {people.map((p) => (
                  <PersonRow key={p.id} person={p} avatarUrl={p.avatar_url ? (avatars[p.avatar_url] ?? null) : null} action={<FollowToggle profileId={p.id} initial={p.i_follow} />} />
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Mon numéro</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Privé : jamais affiché. Si vous l'autorisez, vos contacts qui vous ont dans leur répertoire pourront vous retrouver.
          </p>
          {myPhone.data ? (
            <p className="mt-2 text-sm text-foreground">
              Enregistré : •••{myPhone.data.phone.slice(-3)} — {myPhone.data.discoverable ? "retrouvable par mes contacts" : "non retrouvable"}
            </p>
          ) : null}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="+243 8x xxx xxxx" aria-label="Numéro de téléphone" className="mt-3 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" />
          <label className="mt-3 flex items-center gap-2 text-sm text-surface-foreground">
            <input type="checkbox" checked={discoverable} onChange={(e) => setDiscoverable(e.target.checked)} />
            Autoriser mes contacts à me retrouver avec ce numéro
          </label>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={!phone || savePhone.isPending} onClick={() => savePhone.mutate()} className="h-10 rounded-full bg-brand px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              Enregistrer
            </button>
            {myPhone.data ? (
              <button
                type="button"
                onClick={async () => {
                  const { error } = await supabase.rpc("clear_my_phone");
                  if (error) toast.error("Suppression impossible.");
                  else {
                    toast.success("Numéro supprimé");
                    void queryClient.invalidateQueries({ queryKey: ["my-phone"] });
                  }
                }}
                className="h-10 rounded-full border border-border px-5 text-sm font-semibold text-muted-foreground"
              >
                Supprimer
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
