import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PublicationComposer } from "@/components/create/PublicationComposer";
export const Route = createFileRoute("/_authenticated/creer_/publication")({
  validateSearch: (search: Record<string, unknown>): { type: "photos" | "texte"; draft?: string } => ({ type: search["type"] === "texte" ? "texte" : "photos", ...(typeof search["draft"] === "string" ? { draft: search["draft"] } : {}) }),
  head: () => ({ meta: [{ title: "Nouvelle publication — PANU" }, { name: "description", content: "Publiez vos photos et vos textes personnels sur PANU." }, { property: "og:title", content: "Nouvelle publication — PANU" }, { property: "og:description", content: "Créez une publication photo ou textuelle sur PANU." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PublicationPage,
});
function PublicationPage() {
  const { type, draft } = Route.useSearch();
  return <AppShell title={type === "texte" ? "Publication textuelle" : "Photos"} headerAction={<Link to="/creer" aria-label="Retour à Créer"><ArrowLeft className="size-5" /></Link>}><PublicationComposer key={`${type}-${draft ?? "new"}`} kind={type} {...(draft ? { draftId: draft } : {})} /></AppShell>;
}