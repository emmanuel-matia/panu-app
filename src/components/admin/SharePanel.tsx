import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getShareSettings, type ShareSettings } from "@/lib/share-settings.functions";

const IMG_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Réglages des cartes de partage (titre, description, logo, image par défaut, compteurs). */
export function SharePanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["share-settings"], queryFn: () => getShareSettings() });
  const [form, setForm] = useState<ShareSettings | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [v, setV] = useState(0);

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  if (!form) return <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;

  async function upload(file: File, kind: string): Promise<string> {
    if (!user) throw new Error("Session expirée.");
    if (!IMG_TYPES.includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Image JPG, PNG ou WebP : 5 Mo maximum.");
    const path = `${user.id}/share-${kind}-${Date.now()}.${file.type.split("/")[1]}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (error) throw new Error("Envoi de l'image impossible.");
    return path;
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    setMsg(null);
    try {
      const logoPath = logo ? await upload(logo, "logo") : form.logoPath;
      const imagePath = image ? await upload(image, "default") : form.defaultImagePath;
      const { error } = await supabase.rpc("admin_update_share_settings", {
        _data: {
          site_name: form.siteName.trim(),
          default_title: form.defaultTitle.trim(),
          default_description: form.defaultDescription.trim(),
          default_image_path: imagePath ?? "",
          logo_path: logoPath ?? "",
          show_stats: form.showStats,
          twitter_handle: form.twitterHandle?.trim() ?? "",
        },
      });
      if (error) throw new Error(error.message.includes("invalides") ? "Vérifiez les longueurs des champs." : "Enregistrement refusé.");
      setLogo(null);
      setImage(null);
      setV((n) => n + 1);
      await qc.invalidateQueries({ queryKey: ["share-settings"] });
      setMsg({ ok: true, text: "Paramètres enregistrés. Ils s'appliquent aux nouveaux partages après publication du site." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 w-full rounded-md border border-input bg-background p-3 text-sm";
  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cartes affichées sur WhatsApp, Facebook, Messenger et X. Chaque publication, profil et direct garde sa propre image ; l'image par défaut ne sert que lorsqu'un contenu n'en a aucune.
      </p>
      <label className="block text-sm">Nom du site
        <input className={field} maxLength={40} value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
      </label>
      <label className="block text-sm">Titre par défaut
        <input className={field} maxLength={100} value={form.defaultTitle} onChange={(e) => setForm({ ...form, defaultTitle: e.target.value })} />
      </label>
      <label className="block text-sm">Description par défaut
        <textarea className={field} rows={3} maxLength={300} value={form.defaultDescription} onChange={(e) => setForm({ ...form, defaultDescription: e.target.value })} />
      </label>
      <label className="block text-sm">Compte X (ex. @panu)
        <input className={field} maxLength={30} value={form.twitterHandle ?? ""} onChange={(e) => setForm({ ...form, twitterHandle: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.showStats} onChange={(e) => setForm({ ...form, showStats: e.target.checked })} />
        Afficher les vues et J'aime réels dans la description des publications
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 text-sm">
          <span className="font-medium">Logo PANU</span>
          {form.logoPath ? <img src={`/api/public/og/site/logo?v=${v}`} alt="Logo actuel" className="h-16 rounded-md border border-border bg-muted object-contain p-1" /> : <p className="text-muted-foreground">Aucun logo défini.</p>}
          <input type="file" accept={IMG_TYPES.join(",")} onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
        </div>
        <div className="space-y-2 text-sm">
          <span className="font-medium">Image de partage par défaut (1200×630)</span>
          {form.defaultImagePath ? <img src={`/api/public/og/site/default?v=${v}`} alt="Image par défaut actuelle" className="aspect-[1200/630] w-full rounded-md border border-border object-cover" /> : <p className="text-muted-foreground">Aucune image définie.</p>}
          <input type="file" accept={IMG_TYPES.join(",")} onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <Button onClick={() => void save()} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Save />}Enregistrer</Button>
      {msg ? <p role="status" className={msg.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{msg.text}</p> : null}
    </section>
  );
}
