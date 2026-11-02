import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Download, Loader2, Send } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { publishAiCreation } from "@/lib/publish-media";

/** Actions sous une création IA : télécharger et publier sur PANU. */
export function AiResultActions({
  url,
  mime,
  kind,
  prompt,
  downloadName,
}: {
  url: string;
  mime: string;
  kind: "image" | "audio";
  prompt: string;
  downloadName: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [postId, setPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    if (!user) return;
    setState("busy");
    setError(null);
    try {
      const id = await publishAiCreation({
        userId: user.id,
        url,
        mime,
        kind,
        title: title || prompt.slice(0, 80),
        caption: prompt,
      });
      setPostId(id);
      setState("done");
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (e) {
      setState("idle");
      setError(e instanceof Error ? e.message : "Publication impossible.");
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-center text-xs text-muted-foreground">Enregistrée dans votre historique (privé).</p>
      <a
        href={`${url}${url.includes("?") ? "&" : "?"}download=${downloadName}`}
        className="flex items-center justify-center gap-2 text-sm font-medium text-accent"
      >
        <Download className="size-4" /> Télécharger
      </a>
      {state === "done" && postId ? (
        <p className="flex items-center justify-center gap-2 text-sm text-foreground">
          <CheckCircle2 className="size-4 text-accent" /> Publiée !{" "}
          <Link to="/p/$postId" params={{ postId }} className="font-semibold text-accent underline">
            Voir la publication
          </Link>
        </p>
      ) : (
        <div className="flex gap-2">
          <input
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la publication"
            className="h-10 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          <button
            type="button"
            disabled={state === "busy"}
            onClick={() => void handlePublish()}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {state === "busy" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Publier
          </button>
        </div>
      )}
      {error ? <p className="text-center text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
