import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { z } from "zod";

import {
  AdminsPanel,
  AuditPanel,
  MonetizationPanel,
  OverviewPanel,
  PlansPanel,
  ReportsPanel,
  UsersPanel,
} from "@/components/admin/AdminPanels";
import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { useStaffRole } from "@/hooks/useStaffRole";
import { tabsForRole, type AdminTab } from "@/lib/admin-rules";

const TAB_LABEL: Record<AdminTab, string> = {
  apercu: "Aperçu",
  utilisateurs: "Utilisateurs",
  signalements: "Signalements",
  administrateurs: "Administrateurs",
  abonnements: "Abonnements",
  journal: "Journal",
  monetisation: "Monétisation",
};

const searchSchema = z.object({
  onglet: z
    .enum(["apercu", "utilisateurs", "signalements", "administrateurs", "abonnements", "journal", "monetisation"])
    .optional(),
});

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Administration — PANU" },
      { name: "description", content: "Espace d'administration de PANU réservé à l'équipe." },
      { property: "og:title", content: "Administration — PANU" },
      { property: "og:description", content: "Espace réservé à l'équipe PANU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const role = useStaffRole();
  const search = Route.useSearch();

  if (role.isPending) {
    return (
      <AppShell title="Administration">
        <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }
  if (!role.data) {
    return (
      <AppShell title="Administration">
        <EmptyState icon={ShieldAlert} title="Accès réservé" description="Cet espace est réservé au fondateur et aux administrateurs de PANU." />
      </AppShell>
    );
  }
  const tabs = tabsForRole(role.data);
  const current: AdminTab = search.onglet && tabs.includes(search.onglet) ? search.onglet : "apercu";

  return (
    <AppShell
      title={role.data === "founder" ? "Espace fondateur" : "Tableau de bord administrateur"}
      subtitle={role.data === "founder" ? "Super administrateur" : "Modération et assistance"}
    >
      <div className="space-y-4 px-4 py-4">
        <nav aria-label="Rubriques d'administration" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {tabs.map((t) => (
            <Link
              key={t}
              to="/admin"
              search={{ onglet: t }}
              aria-current={current === t ? "page" : undefined}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${current === t ? "border-transparent bg-brand text-primary-foreground" : "border-border bg-surface text-surface-foreground"}`}
            >
              {TAB_LABEL[t]}
            </Link>
          ))}
        </nav>
        {current === "apercu" ? <OverviewPanel role={role.data} /> : null}
        {current === "utilisateurs" ? <UsersPanel role={role.data} /> : null}
        {current === "signalements" ? <ReportsPanel /> : null}
        {current === "administrateurs" ? <AdminsPanel /> : null}
        {current === "abonnements" ? <PlansPanel /> : null}
        {current === "journal" ? <AuditPanel /> : null}
        {current === "monetisation" ? <MonetizationPanel /> : null}
      </div>
    </AppShell>
  );
}
