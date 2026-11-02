import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { copyText, nativeShare } from "@/lib/invite";
import { cn } from "@/lib/utils";

export function profileUrl(username: string): string {
  return `${window.location.origin}/@${username}`;
}

/** Partage le lien du profil (menu de partage du téléphone, sinon copie du lien). */
export function ShareProfileButton({
  username,
  displayName,
  className,
  label = "Partager le profil",
}: {
  username: string;
  displayName: string;
  className?: string;
  label?: string;
}) {
  async function share() {
    const url = profileUrl(username);
    if (await nativeShare({ title: `${displayName} sur PANU`, text: `Retrouve ${displayName} sur PANU`, url })) return;
    if (await copyText(url)) toast.success("Lien du profil copié");
    else toast.error("Impossible de copier le lien.");
  }
  return (
    <button
      type="button"
      onClick={() => void share()}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-surface-foreground hover:bg-muted",
        className,
      )}
    >
      <Share2 className="size-4" strokeWidth={1.75} />
      {label}
    </button>
  );
}
