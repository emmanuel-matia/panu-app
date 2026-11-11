import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

const CONTACT = "matia@gmail.com";
const TITLE = "Supprimer son compte PANU";
const DESC = "Comment supprimer votre compte PANU depuis l'application ou en envoyant une demande, même sans pouvoir vous connecter.";

export const Route = createFileRoute("/suppression-compte")({
  head: () => ({
    meta: [
      { title: `${TITLE} — PANU` },
      { name: "description", content: DESC },
      { property: "og:title", content: `${TITLE} — PANU` },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const ready = email.includes("@");
  const body = `Bonjour,\n\nJe demande la suppression de mon compte PANU.\n\nNom d'utilisateur : @${username.replace(/^@/, "")}\nE-mail du compte : ${email}\n\nMerci.`;
  const mailto = `mailto:${CONTACT}?subject=${encodeURIComponent("Demande de suppression de compte PANU")}&body=${encodeURIComponent(body)}`;

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8 text-foreground">
      <h1 className="text-2xl font-bold">{TITLE}</h1>
      <p className="text-sm text-muted-foreground">Éditeur : ETS GREEN MATIA — application PANU (site.panu.app).</p>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold">1. Depuis l'application (immédiat)</h2>
        <p className="text-sm">Connectez-vous, puis ouvrez Paramètres → Compte → « Supprimer mon compte », tapez SUPPRIMER et confirmez. La suppression est immédiate et définitive. Si une erreur s'affiche, utilisez l'option 2.</p>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold">2. Sans pouvoir vous connecter</h2>
        <p className="text-sm">Remplissez ces champs : votre messagerie ouvrira une demande déjà rédigée à envoyer à {CONTACT}. Envoyez-la depuis l'adresse e-mail du compte, pour que nous puissions vérifier qu'il vous appartient. La demande est traitée à la main par l'équipe PANU ; rien n'est supprimé tant qu'elle n'a pas été vérifiée.</p>
        <label className="block text-sm">Nom d'utilisateur PANU
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@votrenom" className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" />
        </label>
        <label className="block text-sm">E-mail du compte
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" />
        </label>
        <a href={ready ? mailto : undefined} aria-disabled={!ready} className={`flex h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ${ready ? "" : "pointer-events-none opacity-50"}`}>
          Préparer ma demande par e-mail
        </a>
        <p className="text-xs text-muted-foreground">Si le bouton ne s'ouvre pas, écrivez directement à {CONTACT} avec l'objet « Demande de suppression de compte PANU ».</p>
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold">Ce qui est supprimé</h2>
        <p className="text-sm">Profil, photo et couverture, publications, vidéos, stories, commentaires, J'aime, enregistrements, abonnements, créations IA, crédits, paramètres, clés d'accès (passkeys), consentements, notifications et fichiers déposés.</p>
        <h2 className="pt-2 font-semibold">Ce qui peut être conservé</h2>
        <p className="text-sm">Les signalements faits par d'autres utilisateurs à propos du compte restent pour la modération, sans lien vers le compte supprimé.</p>
      </section>

      <p className="text-sm">Voir aussi la <Link to="/confidentialite" className="text-accent underline">politique de confidentialité</Link>.</p>
    </main>
  );
}
