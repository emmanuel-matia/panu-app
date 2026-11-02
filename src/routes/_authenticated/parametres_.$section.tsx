import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { SECTION_COMPONENTS } from "@/components/settings/registry";
import { findSection, GROUP_LABEL } from "@/lib/settings-config";

export const Route = createFileRoute("/_authenticated/parametres_/$section")({
  loader: ({ params }) => {
    const section = findSection(params.section);
    if (!section || !SECTION_COMPONENTS[section.id]) throw notFound();
    return { title: section.title, description: section.description };
  },
  head: ({ loaderData }) => {
    const title = `${loaderData?.title ?? "Paramètres"} — PANU`;
    const description = loaderData?.description ?? "Réglages de votre compte PANU.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: SectionPage,
  notFoundComponent: () => (
    <AppShell title="Paramètre introuvable">
      <div className="px-4 py-10 text-center">
        <Link to="/parametres" className="text-sm font-medium text-accent underline">Retour aux paramètres</Link>
      </div>
    </AppShell>
  ),
});

function SectionPage() {
  const { section: id } = Route.useParams();
  const section = findSection(id)!;
  const Body = SECTION_COMPONENTS[section.id]!;
  return (
    <AppShell
      title={section.title}
      subtitle={GROUP_LABEL[section.group]}
      headerAction={
        <Link to="/parametres" aria-label="Retour aux paramètres" className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
      }
    >
      <div className="space-y-4 px-4 py-4">
        <Body />
      </div>
    </AppShell>
  );
}
