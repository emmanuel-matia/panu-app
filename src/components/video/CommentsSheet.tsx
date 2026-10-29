import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { listComments } from "@/lib/posts.functions";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Panneau de commentaires d'une publication (lecture + écriture + suppression). */
export function CommentsSheet({
  postId,
  onClose,
}: {
  postId: string;
  commentsCount?: number;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => listComments({ data: { postId } }),
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["comments", postId] }),
      queryClient.invalidateQueries({ queryKey: ["posts"] }),
    ]);
  }

  const addComment = useMutation({
    mutationFn: async (body: string) => {
      if (!user) throw new Error("Connectez-vous pour commenter.");
      const { error } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, author_id: user.id, body });
      if (error) throw new Error("Impossible d'envoyer votre commentaire.");
    },
    onSuccess: async () => {
      setDraft("");
      setActionError(null);
      await refresh();
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const removeComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
      if (error) throw new Error("Suppression impossible.");
    },
    onSuccess: refresh,
    onError: (error: Error) => setActionError(error.message),
  });

  function submit() {
    const body = draft.trim();
    if (body.length === 0) return;
    if (body.length > 1000) {
      setActionError("Votre commentaire est trop long (1000 caractères maximum).");
      return;
    }
    addComment.mutate(body);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Commentaires"
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Commentaires{query.data?.length ? ` · ${query.data.length}` : ""}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les commentaires"
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {query.isPending ? (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Chargement…
            </p>
          ) : query.isError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">{query.error.message}</p>
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="mt-3 text-sm font-semibold text-electric"
              >
                Réessayer
              </button>
            </div>
          ) : query.data.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucun commentaire pour le moment. Soyez la première personne à réagir.
            </p>
          ) : (
            <ul className="space-y-4">
              {query.data.map((comment) => (
                <li
                  key={comment.id}
                  className={comment.parentId ? "ml-8 border-l border-border pl-3" : undefined}
                >
                  <div className="flex items-start gap-2.5">
                    <Link
                      to="/@{$username}"
                      params={{ username: comment.authorUsername }}
                      className="shrink-0"
                    >
                      <ProfileAvatar
                        url={comment.authorAvatarUrl}
                        alt={`Avatar de ${comment.authorDisplayName}`}
                        size="sm"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {comment.authorDisplayName}
                        </span>{" "}
                        · {dateFormat.format(new Date(comment.createdAt))}
                      </p>
                      <p className="mt-0.5 text-sm whitespace-pre-line text-foreground">
                        {comment.body}
                      </p>
                    </div>
                    {comment.canDelete ? (
                      <button
                        type="button"
                        onClick={() => removeComment.mutate(comment.id)}
                        disabled={removeComment.isPending}
                        aria-label="Supprimer ce commentaire"
                        className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-4 py-3">
          {actionError ? <p className="mb-2 text-xs text-destructive">{actionError}</p> : null}
          {user ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={1000}
                placeholder="Ajouter un commentaire…"
                aria-label="Ajouter un commentaire"
                className="h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={addComment.isPending || draft.trim().length === 0}
                aria-label="Envoyer le commentaire"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-electric text-electric-foreground disabled:opacity-50"
              >
                {addComment.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" strokeWidth={2} />
                )}
              </button>
            </form>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/connexion" className="font-semibold text-electric">
                Connectez-vous
              </Link>{" "}
              pour commenter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
