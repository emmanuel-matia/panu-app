import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ActionButton } from "@/components/common/ActionButton";
import { listDrafts, deleteDraft, type CreationDraft } from "@/lib/create-drafts";
export function CreationDrafts() {
  const { user } = useAuth(); const [rows, setRows] = useState<CreationDraft[]>([]); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!user) return; void listDrafts(user.id).then(setRows).catch((e: unknown) => setError(e instanceof Error ? e.message : "Brouillons indisponibles.")).finally(() => setLoading(false)); }, [user?.id]);
  return <section className="space-y-3 py-4"><h2 className="text-lg font-semibold">Brouillons</h2><p className="text-xs text-muted-foreground">Enregistrés sur cet appareil uniquement.</p>
    {error ? <p role="alert">{error}</p> : loading ? <p>Chargement…</p> : !rows.length ? <p className="text-sm text-muted-foreground">Aucun brouillon sur cet appareil.</p> : rows.map((row) => <div key={row.id} className="flex items-center gap-2 border-b border-border py-3">
      {row.kind === "video" ? <Link className="min-w-0 flex-1 truncate" to="/creer/video" search={{ draft: row.id }}>{row.title || "Vidéo sans titre"}</Link> : <Link className="min-w-0 flex-1 truncate" to="/creer/publication" search={{ type: row.kind, draft: row.id }}>{row.title || "Publication sans titre"}</Link>}
      <ActionButton variant="ghost" aria-label={`Supprimer le brouillon ${row.title}`} onClick={() => { if (!user) return; void deleteDraft(user.id, row.id).then(() => setRows(rows.filter((item) => item.id !== row.id))).catch((e: unknown) => setError(e instanceof Error ? e.message : "Suppression impossible.")); }}><Trash2 className="size-4" /></ActionButton>
    </div>)}
  </section>;
}