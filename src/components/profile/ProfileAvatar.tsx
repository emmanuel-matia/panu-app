import { useQuery } from "@tanstack/react-query";
import { UserCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** Résout le chemin de stockage de l'avatar en URL temporaire signée. */
export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar-url", path],
    enabled: Boolean(path),
    staleTime: 30 * 60_000,
    queryFn: async () => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function ProfileAvatar({
  url,
  alt,
  size = "lg",
}: {
  url: string | null | undefined;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    xs: "size-8",
    sm: "size-10",
    md: "size-16",
    lg: "size-20",
    xl: "size-24",
  } as const;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-muted",
        sizes[size],
      )}
    >
      {url ? (
        <img src={url} alt={alt} className="size-full object-cover" />
      ) : (
        <UserCircle2 className="size-1/2 text-muted-foreground" strokeWidth={1.5} />
      )}
    </div>
  );
}
