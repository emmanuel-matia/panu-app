import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Send, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { listComments, type PostComment } from "@/lib/posts.functions";
import { COMMENT_MAX, validateComment } from "@/lib/media-rules";

import { timeAgo } from "./time";

/** Panneau des commentaires d'une publication (lecture publique, écriture si connecté). */
export function CommentsSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const query = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => listComments({ data: { postId } }),
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      void navigate({ to: "/connexion" });
      return;
    }
    const problem = validateComment(body);
    if (problem) {
      setError(problem);
      return;
    }
    setSending(true);
    setError(null);
    const { error: insertError } = await supabase.from("post_comments").insert({
      post_id: postId,
      author_id: user.id,
      body: body.trim(),
      parent_id: replyTo?.id ?? null,
    });
    setSending(false);
    if (insertError) {
      setError("Le commentaire n'a pas pu être envoyé. Réessayez.");
      return;
    }
    setBody("");
    setReplyTo(null);
    await refresh();
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase.from("post_comments").delete().eq("id", id);
    if (deleteError) {
      setError("Suppression impossible.");
      return;
    }
    await refresh();
  }

  const comments = query.data ?? [];
  const roots = comments.filter((c) => !c.parentId);
  const replies = (id: string) => comments.filter((c) => c.parentId === id);

  function Item({ comment, nested = false }: { comment: PostComment; nested?: boolean }) {
    return (
      <li className={nested ? "ml-10" : ""}>
        <div className="flex gap-2.5">
          <Link to="/@{$username}" params={{ username: comment.authorUsername }} className="shrink-0">
            <ProfileAvatar url={comment.authorAvatarUrl} alt={`Avatar de ${comment.authorDisplayName}`} size="xs" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{comment.authorDisplayName}</span> ·{" "}
              {timeAgo(comment.createdAt)}
            </p>
            <p className="text-sm break-words whitespace-pre-line text-foreground">{comment.body}</p>
            <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
              {!nested ? (
                <button type="button" onClick={() => setReplyTo(comment)} className="font-semibold">
                  Répondre
                </button>
              ) : null}
              {comment.canDelete ? (
                <button
                  type="button"
                  onClick={() => void handleDelete(comment.id)}
                  className="flex items-center gap-1 hover:text-destructive"
                >
                  <Trash2 className="size-3" /> Supprimer
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Commentaires"
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex max-h-[75dvh] w-full max-w-2xl flex-col rounded-t-3xl border border-border bg-card"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Commentaires{query.data ? ` (${comments.length})` : ""}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-muted-foreground">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {query.isPending ? (
            <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
          ) : query.isError ? (
            <p className="text-center text-sm text-muted-foreground">{query.error.message}</p>
          ) : roots.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun commentaire. Lancez la discussion !</p>
          ) : (
            <ul className="space-y-4">
              {roots.map((c) => (
                <div key={c.id} className="space-y-3">
                  <Item comment={c} />
                  {replies(c.id).map((r) => (
                    <Item key={r.id} comment={r} nested />
                  ))}
                </div>
              ))}
            </ul>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-1 border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {replyTo ? (
            <p className="flex items-center justify-between text-xs text-muted-foreground">
              Réponse à {replyTo.authorDisplayName}
              <button type="button" onClick={() => setReplyTo(null)} className="font-semibold">
                Annuler
              </button>
            </p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex items-center gap-2">
            <input
              value={body}
              maxLength={COMMENT_MAX}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => {
                if (!user) void navigate({ to: "/connexion" });
              }}
              placeholder={user ? "Ajouter un commentaire…" : "Connectez-vous pour commenter"}
              className="h-10 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={sending}
              aria-label="Envoyer"
              className="flex size-10 items-center justify-center rounded-full bg-brand text-primary-foreground disabled:opacity-50"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
