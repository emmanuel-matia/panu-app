import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, PencilLine, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  categoryLabel,
  engineLabel,
  parseFields,
  parseSettings,
  slugify,
  TEMPLATE_CATEGORIES,
  TEMPLATE_KINDS,
  validateTemplateDraft,
  type FieldType,
  type TemplateCategory,
  type TemplateField,
  type TemplateInput,
  type TemplateKind,
  type TemplateSettings,
} from "@/lib/templates-rules";
import { AI_CREDIT_COSTS } from "@/lib/credits";

const card = "rounded-2xl border border-border bg-surface p-4";
const input =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const btn =
  "inline-flex h-9 items-center justify-center gap-1 rounded-full border border-border px-3 text-xs font-semibold text-surface-foreground hover:bg-muted disabled:opacity-50";

type AdminTemplate = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  kind: string;
  input_kind: string;
  prompt_template: string;
  fields: unknown;
  settings: unknown;
  credit_cost: number;
  cover_url: string | null;
  is_published: boolean;
  uses_total: number;
  uses_7d: number;
  uses_30d: number;
  users_count: number;
};

type Draft = {
  id: string | null;
  slug: string;
  title: string;
  description: string;
  category: TemplateCategory;
  subcategory: string;
  kind: TemplateKind;
  inputKind: TemplateInput;
  promptTemplate: string;
  fields: (TemplateField & { optionsText: string })[];
  settings: TemplateSettings;
  creditCost: number;
  coverUrl: string;
};

const DEFAULT_SETTINGS: Record<TemplateKind, TemplateSettings> = {
  image: { format: "portrait" },
  video: { aspect: "9:16", duration: 5 },
  music: { seconds: 30, vocals: "choice", lyrics: true, clip: true },
};

function emptyDraft(): Draft {
  return {
    id: null,
    slug: "",
    title: "",
    description: "",
    category: "video",
    subcategory: "",
    kind: "video",
    inputKind: "none",
    promptTemplate: "",
    fields: [],
    settings: DEFAULT_SETTINGS.video,
    creditCost: AI_CREDIT_COSTS.video,
    coverUrl: "",
  };
}

function toDraft(t: AdminTemplate): Draft {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    description: t.description,
    category: (TEMPLATE_CATEGORIES.some((c) => c.id === t.category) ? t.category : "video") as TemplateCategory,
    subcategory: t.subcategory,
    kind: t.kind as TemplateKind,
    inputKind: t.input_kind as TemplateInput,
    promptTemplate: t.prompt_template,
    fields: parseFields(t.fields).map((f) => ({ ...f, optionsText: (f.options ?? []).join(" | ") })),
    settings: parseSettings(t.settings),
    creditCost: t.credit_cost,
    coverUrl: t.cover_url ?? "",
  };
}

function cleanFields(fields: Draft["fields"]): TemplateField[] {
  return fields.map(({ optionsText, ...f }) => {
    const options = optionsText.split("|").map((o) => o.trim()).filter(Boolean);
    const base: TemplateField = { id: f.id, label: f.label.trim(), type: f.type, required: f.required };
    if (f.placeholder) base.placeholder = f.placeholder;
    if (f.type === "select") base.options = options;
    return base;
  });
}

/** Modèles IA : ajout, modification, publication, coût et statistiques réelles (équipe uniquement). */
export function TemplatesPanel() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const list = useQuery({
    queryKey: ["admin-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_templates");
      if (error) throw error;
      return (data ?? []) as AdminTemplate[];
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
    void queryClient.invalidateQueries({ queryKey: ["templates"] });
  };

  const publish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.rpc("admin_set_template_published", { _id: id, _published: published });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.published ? "Modèle publié" : "Modèle désactivé");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Action impossible"),
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const fields = cleanFields(d.fields);
      const problem = validateTemplateDraft({ ...d, fields });
      if (problem) throw new Error(problem);
      if (fields.some((f) => f.type === "select" && !f.options?.length)) throw new Error("Chaque liste de choix doit avoir des options.");
      const { error } = await supabase.rpc("admin_save_template", {
        _id: d.id as string,
        _data: {
          slug: d.slug,
          title: d.title.trim(),
          description: d.description.trim(),
          category: d.category,
          subcategory: d.subcategory.trim(),
          kind: d.kind,
          input_kind: d.inputKind,
          prompt_template: d.promptTemplate.trim(),
          fields,
          settings: d.settings,
          credit_cost: d.creditCost,
          cover_url: d.coverUrl.trim(),
        },
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.id ? "Modèle mis à jour" : "Modèle créé (non publié : publiez-le quand il est prêt)");
      setDraft(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Enregistrement impossible"),
  });

  if (draft) return <TemplateEditor draft={draft} onChange={setDraft} onCancel={() => setDraft(null)} onSave={() => save.mutate(draft)} saving={save.isPending} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Utilisations comptées uniquement pour les créations réussies.</p>
        <button type="button" className={btn} onClick={() => setDraft(emptyDraft())}>
          <Plus className="size-3.5" /> Nouveau
        </button>
      </div>
      {list.isPending ? (
        <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : list.isError ? (
        <p className="text-sm text-destructive">Liste indisponible : {list.error instanceof Error ? list.error.message : ""}</p>
      ) : (
        <ul className="space-y-2">
          {list.data.map((t) => (
            <li key={t.id} className={card}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {t.title}{" "}
                    <span className={t.is_published ? "text-accent" : "text-muted-foreground"}>· {t.is_published ? "publié" : "désactivé"}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {categoryLabel(t.category)} · {t.subcategory} · {t.credit_cost} crédit{t.credit_cost > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-xs text-surface-foreground">
                    {Number(t.uses_total)} utilisation{Number(t.uses_total) > 1 ? "s" : ""} · 7 j : {Number(t.uses_7d)} · 30 j : {Number(t.uses_30d)} ·{" "}
                    {Number(t.users_count)} créateur{Number(t.users_count) > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" className={btn} aria-label={`Modifier ${t.title}`} onClick={() => setDraft(toDraft(t))}>
                    <PencilLine className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className={btn}
                    disabled={publish.isPending}
                    aria-label={t.is_published ? `Désactiver ${t.title}` : `Publier ${t.title}`}
                    onClick={() => publish.mutate({ id: t.id, published: !t.is_published })}
                  >
                    {t.is_published ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>
              {t.is_published ? (
                <Link to="/modeles/$slug" params={{ slug: t.slug }} className="mt-2 inline-block text-xs font-semibold text-electric">
                  Voir la page
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplateEditor({
  draft,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => onChange({ ...draft, [key]: value });
  const setField = (i: number, patch: Partial<Draft["fields"][number]>) =>
    set("fields", draft.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <div className={`${card} space-y-3`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{draft.id ? "Modifier le modèle" : "Nouveau modèle"}</p>
        <button type="button" onClick={onCancel} aria-label="Fermer" className="text-muted-foreground"><X className="size-5" /></button>
      </div>
      <label className="block text-xs text-muted-foreground">
        Titre
        <input
          className={`${input} mt-1`}
          value={draft.title}
          maxLength={80}
          onChange={(e) => onChange({ ...draft, title: e.target.value, ...(draft.id ? {} : { slug: slugify(e.target.value) }) })}
        />
      </label>
      <label className="block text-xs text-muted-foreground">
        Identifiant (adresse de la page){draft.id ? " — non modifiable" : ""}
        <input className={`${input} mt-1`} value={draft.slug} disabled={Boolean(draft.id)} onChange={(e) => set("slug", slugify(e.target.value))} />
      </label>
      <label className="block text-xs text-muted-foreground">
        Description
        <textarea className={`${input} mt-1 resize-none`} rows={2} maxLength={400} value={draft.description} onChange={(e) => set("description", e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-muted-foreground">
          Catégorie
          <select className={`${input} mt-1`} value={draft.category} onChange={(e) => set("category", e.target.value as TemplateCategory)}>
            {TEMPLATE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="block text-xs text-muted-foreground">
          Sous-type
          <input className={`${input} mt-1`} value={draft.subcategory} maxLength={40} onChange={(e) => set("subcategory", e.target.value)} />
        </label>
        <label className="block text-xs text-muted-foreground">
          Résultat
          <select
            className={`${input} mt-1`}
            value={draft.kind}
            onChange={(e) => {
              const kind = e.target.value as TemplateKind;
              onChange({ ...draft, kind, settings: DEFAULT_SETTINGS[kind], creditCost: AI_CREDIT_COSTS[kind], inputKind: kind === "music" ? "none" : draft.inputKind });
            }}
          >
            {TEMPLATE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </label>
        <label className="block text-xs text-muted-foreground">
          Média à importer
          <select className={`${input} mt-1`} value={draft.inputKind} disabled={draft.kind === "music"} onChange={(e) => set("inputKind", e.target.value as TemplateInput)}>
            <option value="none">Aucun (texte)</option>
            <option value="photo">Une photo</option>
          </select>
        </label>
        <label className="block text-xs text-muted-foreground">
          Coût (crédits)
          <input type="number" min={0} max={100} className={`${input} mt-1`} value={draft.creditCost} onChange={(e) => set("creditCost", Math.round(Number(e.target.value) || 0))} />
        </label>
        {draft.kind === "image" ? (
          <label className="block text-xs text-muted-foreground">
            Format
            <select className={`${input} mt-1`} value={draft.settings.format ?? "portrait"} onChange={(e) => set("settings", { format: e.target.value as "portrait" })}>
              <option value="portrait">Portrait</option>
              <option value="square">Carré</option>
              <option value="landscape">Paysage</option>
            </select>
          </label>
        ) : draft.kind === "video" ? (
          <label className="block text-xs text-muted-foreground">
            Format
            <select className={`${input} mt-1`} value={draft.settings.aspect ?? "9:16"} onChange={(e) => set("settings", { ...draft.settings, aspect: e.target.value as "9:16" })}>
              <option value="9:16">Vertical 9:16</option>
              <option value="16:9">Horizontal 16:9</option>
            </select>
          </label>
        ) : (
          <>
            <label className="block text-xs text-muted-foreground">
              Durée par défaut
              <select className={`${input} mt-1`} value={draft.settings.seconds ?? 30} onChange={(e) => set("settings", { ...draft.settings, seconds: Number(e.target.value) as 30 })}>
                <option value={15}>15 s</option>
                <option value={30}>30 s</option>
                <option value={60}>60 s</option>
              </select>
            </label>
            <label className="block text-xs text-muted-foreground">
              Voix
              <select className={`${input} mt-1`} value={draft.settings.vocals ?? "choice"} onChange={(e) => set("settings", { ...draft.settings, vocals: e.target.value as VocalsPolicy })}>
                <option value="choice">Au choix de l'utilisateur</option>
                <option value="sung">Toujours chantée</option>
                <option value="instrumental">Toujours instrumentale</option>
              </select>
            </label>
            <label className="col-span-2 flex items-center gap-2 text-xs text-surface-foreground">
              <input type="checkbox" checked={draft.settings.lyrics !== false} disabled={draft.settings.vocals === "instrumental"} onChange={(e) => set("settings", { ...draft.settings, lyrics: e.target.checked })} />
              Étape « Paroles » (écrites par l'utilisateur ou par l'IA)
            </label>
            <label className="col-span-2 flex items-center gap-2 text-xs text-surface-foreground">
              <input type="checkbox" checked={draft.settings.clip !== false} onChange={(e) => set("settings", { ...draft.settings, clip: e.target.checked })} />
              Clip vertical avec photos / vidéos et import d'un morceau personnel
            </label>
            <label className="col-span-2 block text-xs text-muted-foreground">
              Extrait de démonstration (lien https, facultatif)
              <input
                className={`${input} mt-1`}
                value={draft.settings.demo ?? ""}
                maxLength={500}
                placeholder="https://…/extrait.mp3"
                onChange={(e) => {
                  const { demo: _old, ...rest } = draft.settings;
                  set("settings", e.target.value.trim() ? { ...rest, demo: e.target.value.trim() } : rest);
                }}
              />
            </label>
          </>
        )}
      </div>
      <p className="text-[0.6875rem] text-muted-foreground">Moteur IA : {engineLabel(draft.kind, draft.inputKind)}</p>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Champs demandés à l'utilisateur</p>
        {draft.fields.map((f, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-border p-2.5">
            <div className="flex gap-2">
              <input
                className={input}
                placeholder="Libellé (ex. Ambiance)"
                value={f.label}
                onChange={(e) => setField(i, { label: e.target.value, id: slugify(e.target.value).replace(/-/g, "_").replace(/^[^a-z]+/, "").slice(0, 24) || f.id })}
              />
              <button type="button" aria-label="Retirer ce champ" className="shrink-0 text-muted-foreground" onClick={() => set("fields", draft.fields.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">{`{{${f.id}}}`}</code>
              <select className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground" value={f.type} onChange={(e) => setField(i, { type: e.target.value as FieldType })}>
                <option value="text">Texte court</option>
                <option value="textarea">Texte long</option>
                <option value="select">Liste de choix</option>
              </select>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} /> Obligatoire
              </label>
            </div>
            {f.type === "select" ? (
              <input className={input} placeholder="Options séparées par |" value={f.optionsText} onChange={(e) => setField(i, { optionsText: e.target.value })} />
            ) : (
              <input className={input} placeholder="Exemple affiché (facultatif)" value={f.placeholder ?? ""} onChange={(e) => setField(i, { placeholder: e.target.value })} />
            )}
          </div>
        ))}
        {draft.fields.length < 8 ? (
          <button
            type="button"
            className={btn}
            onClick={() => set("fields", [...draft.fields, { id: `champ_${draft.fields.length + 1}`, label: "", type: "text", required: true, optionsText: "" }])}
          >
            <Plus className="size-3.5" /> Ajouter un champ
          </button>
        ) : null}
      </div>

      <label className="block text-xs text-muted-foreground">
        Instructions envoyées à l'IA (utilisez les codes {"{{champ}}"} ci-dessus)
        <textarea className={`${input} mt-1 resize-none font-mono text-xs`} rows={5} maxLength={1500} value={draft.promptTemplate} onChange={(e) => set("promptTemplate", e.target.value)} />
      </label>
      <label className="block text-xs text-muted-foreground">
        Image de démonstration (lien https, facultatif)
        <input className={`${input} mt-1`} value={draft.coverUrl} placeholder="https://…" onChange={(e) => set("coverUrl", e.target.value)} />
      </label>
      <div className="flex gap-2">
        <button type="button" className={`${btn} flex-1`} onClick={onCancel}>Annuler</button>
        <button type="button" disabled={saving} onClick={onSave} className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-full bg-brand text-xs font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null} Enregistrer
        </button>
      </div>
    </div>
  );
}
