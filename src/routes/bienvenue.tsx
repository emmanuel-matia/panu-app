import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { useEffect } from "react";

import mosaique from "@/assets/bienvenue-mosaique.jpg";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useAuth } from "@/hooks/useAuth";
import { WELCOME_CREDITS } from "@/lib/credits";
import { DISCOVER_KEY } from "@/lib/discover";

export const Route = createFileRoute("/bienvenue")({
  head: () => ({
    meta: [
      { title: "Bienvenue sur PANU — Créer. Partager. Gagner." },
      {
        name: "description",
        content: `Rejoignez PANU, la plateforme africaine pour créer, partager et monétiser. ${WELCOME_CREDITS} crédits IA offerts à l'inscription.`,
      },
      { property: "og:title", content: "Bienvenue sur PANU" },
      {
        property: "og:description",
        content: "La plateforme qui transforme votre talent en revenus. Créez, partagez et gagnez.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BienvenuePage,
});

function BienvenuePage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  function discover() {
    window.localStorage.setItem(DISCOVER_KEY, "1");
    void navigate({ to: "/" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="relative mx-auto w-full max-w-md">
        <div className="relative h-[46dvh] min-h-[18rem] overflow-hidden">
          <img
            src={mosaique}
            alt="Mosaïque de créations africaines : portraits, musique, nature, villes et animation"
            width={1024}
            height={1152}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background" />
        </div>

        <div className="relative -mt-16 space-y-5 px-6 pb-8">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-brand font-display text-3xl font-bold text-primary-foreground shadow-glow">
              P
            </span>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground">PANU</h1>
            <p className="mt-2 text-lg font-semibold">
              <span className="text-foreground">Créer. </span>
              <span className="text-accent">Partager. </span>
              <span className="text-gold">Gagner.</span>
            </p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              La plateforme qui transforme votre talent en revenus.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-gold/50 bg-gold/10 px-4 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold text-gold-foreground">
              <Gift className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gold">{WELCOME_CREDITS} crédits offerts</p>
              <p className="text-xs text-muted-foreground">pour tester le Studio IA dès l'inscription</p>
            </div>
          </div>

          <div className="space-y-3">
            <GoogleButton />
            <Link
              to="/inscription"
              className="flex h-12 w-full items-center justify-center rounded-full bg-brand text-sm font-semibold text-primary-foreground shadow-glow"
            >
              S'inscrire avec e-mail
            </Link>
            <Link
              to="/connexion"
              className="flex h-12 w-full items-center justify-center rounded-full border border-electric text-sm font-semibold text-foreground"
            >
              Se connecter
            </Link>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={discover}
              className="flex h-12 w-full items-center justify-center rounded-full border border-border text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Découvrir d'abord
            </button>
          </div>

          <p className="text-center text-[0.6875rem] leading-relaxed text-muted-foreground">
            En continuant, vous acceptez nos{" "}
            <Link to="/conditions" className="font-semibold text-accent underline">
              Conditions d'utilisation
            </Link>{" "}
            et notre{" "}
            <Link to="/confidentialite" className="font-semibold text-accent underline">
              Politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
