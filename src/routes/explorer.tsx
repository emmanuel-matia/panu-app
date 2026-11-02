import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

/** Ancienne adresse « Explorer » : redirigée vers « Découvrir » (les liens existants continuent de fonctionner). */
export const Route = createFileRoute("/explorer")({
  validateSearch: z.object({
    q: z.string().max(80).optional(),
    categorie: z.string().max(30).optional(),
    filtre: z.enum(["tout", "utilisateurs", "videos", "hashtags"]).optional(),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/decouvrir", search, replace: true, statusCode: 301 });
  },
});
