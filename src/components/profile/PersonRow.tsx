import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { signAvatars } from "@/lib/people.functions";

export type Person = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_founder?: boolean;
};

/** URLs signées des avatars d'une liste de personnes (une seule requête). */
export function useSignedAvatars(people: Person[]) {
  const sign = useServerFn(signAvatars);
  const paths = people.map((p) => p.avatar_url).filter((p): p is string => Boolean(p));
  const key = [...new Set(paths)].sort();
  const query = useQuery({
    queryKey: ["signed-avatars", key],
    enabled: key.length > 0,
    staleTime: 30 * 60_000,
    queryFn: () => sign({ data: { paths: key } }),
  });
  return query.data ?? {};
}

export function PersonRow({
  person,
  avatarUrl,
  subtitle,
  action,
}: {
  person: Person;
  avatarUrl: string | null | undefined;
  subtitle?: string | undefined;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Link to="/@{$username}" params={{ username: person.username }} className="flex min-w-0 flex-1 items-center gap-3">
        <ProfileAvatar url={avatarUrl} alt={`Avatar de ${person.display_name}`} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">
            {person.display_name}
            {person.is_founder ? (
              <span className="ml-2 rounded-full bg-gold px-2 py-0.5 align-middle text-[0.625rem] font-bold text-gold-foreground">
                Fondateur
              </span>
            ) : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            @{person.username}
            {subtitle ? ` · ${subtitle}` : ""}
          </span>
        </span>
      </Link>
      {action}
    </li>
  );
}
