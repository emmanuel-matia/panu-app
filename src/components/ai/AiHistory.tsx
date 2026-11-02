import { useQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";

import { timeAgo } from "@/components/video/time";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { AiResultActions } from "./AiResultActions";

type Item = {
  id: string;
  kind: string;
  prompt: string;
  createdAt: string;
  text: string | null;
  url: string | null;
  mime: string | null;
};

const KIND_LABEL: Record<string, string> = { image: "Image", music: "Musique", voice: "Voix", text: "Texte" };

/** Historique privé des créations IA réussies de l'utilisateur. */
export function AiHistory() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["ai-history", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase
        .from("ai_creations")
        .select("id, kind, prompt, media_path, mime_type, text_result, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return Promise.all(
        (data ?? []).map(async (r) => {
          let url: string | null = null;
          if (r.media_path) {
            const bucket = r.kind === "image" ? "ai-images" : "ai-audio";
            const signed = await supabase.storage.from(bucket).createSignedUrl(r.media_path, 60 * 60);
            url = signed.data?.signedUrl ?? null;
          }
          return {
            id: r.id,
            kind: r.kind,
            prompt: r.prompt,
            createdAt: r.created_at,
            text: r.text_result,
            url,
            mime: r.mime_type,
          };
        }),
      );
    },
  });

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <History className="size-4 text-accent" /> Mes créations
      </h2>
      {query.isPending ? (
        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
      ) : query.isError ? (
        <p className="text-xs text-muted-foreground">Historique indisponible.</p>
      ) : query.data.length === 0 ? (
        <p className="text-xs text-muted-foreground">Vos créations réussies apparaîtront ici.</p>
      ) : (
        <ul className="space-y-4">
          {query.data.map((item) => (
            <li key={item.id} className="space-y-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{KIND_LABEL[item.kind] ?? item.kind}</span> ·{" "}
                {timeAgo(item.createdAt)}
              </p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{item.prompt}</p>
              {item.kind === "text" && item.text ? (
                <p className="line-clamp-6 text-sm whitespace-pre-wrap text-foreground">{item.text}</p>
              ) : null}
              {item.kind === "image" && item.url ? (
                <img src={item.url} alt={item.prompt} loading="lazy" className="max-h-64 rounded-xl border border-border object-contain" />
              ) : null}
              {(item.kind === "music" || item.kind === "voice") && item.url ? (
                <audio controls src={item.url} className="w-full" preload="none" />
              ) : null}
              {item.url && item.mime && item.kind !== "text" ? (
                <AiResultActions
                  url={item.url}
                  mime={item.mime}
                  kind={item.kind === "image" ? "image" : "audio"}
                  prompt={item.prompt}
                  downloadName={`panu-${item.kind}`}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
