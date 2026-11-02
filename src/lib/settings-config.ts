/** Rubriques du menu « Paramètres et confidentialité » : une seule liste pour le menu, la recherche et les pages. */
export type SettingsGroup =
  | "compte"
  | "abonnements"
  | "outils"
  | "preferences"
  | "audience"
  | "paiements"
  | "activite"
  | "standards";

export type SettingsSection = {
  id: string;
  group: SettingsGroup;
  title: string;
  description: string;
  /** Mots-clés pour la recherche. */
  keywords: string;
  /** Rubrique qui ouvre une page existante au lieu de la page générique. */
  to?: "/conditions" | "/confidentialite" | "/cookies" | "/regles-communaute" | "/conditions-abonnement" | "/politique-ia" | "/tableau-de-bord" | "/personnes" | "/inviter";
};

export const GROUP_LABEL: Record<SettingsGroup, string> = {
  compte: "Votre compte",
  abonnements: "Abonnements",
  outils: "Outils et ressources",
  preferences: "Préférences",
  audience: "Audience et visibilité",
  paiements: "Paiements",
  activite: "Votre activité",
  standards: "Standards de la communauté et mentions légales",
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "compte", group: "compte", title: "Votre compte", description: "Informations personnelles, mot de passe, sécurité, données", keywords: "nom prénom e-mail téléphone naissance mot de passe sécurité appareils télécharger données désactiver supprimer" },

  { id: "abonnements", group: "abonnements", title: "Abonnements PANU", description: "Offre actuelle, crédits, historique", keywords: "free premium pro offre crédits renouvellement résiliation historique" },

  { id: "assistance-confidentialite", group: "outils", title: "Assistance confidentialité", description: "Vos données, autorisations et demandes", keywords: "données personnelles autorisations visibilité demandes confidentialité" },
  { id: "centre-familial", group: "outils", title: "Centre familial", description: "Supervision et sécurité", keywords: "famille parental contrôle enfants supervision" },
  { id: "audience-par-defaut", group: "outils", title: "Paramètres d'audience par défaut", description: "Qui voit et commente vos nouvelles publications", keywords: "audience publications stories commenter partager défaut visibilité" },

  { id: "contenu", group: "preferences", title: "Préférences en matière de contenu", description: "Types de contenus, recommandations, catégories masquées", keywords: "contenu recommandations masquer catégories sensible tendances vidéos images audio" },
  { id: "reactions", group: "preferences", title: "Préférences des réactions", description: "Compteurs de J'aime", keywords: "réactions compteurs j'aime" },
  { id: "notifications", group: "preferences", title: "Notifications", description: "Choisir ce dont vous êtes informé", keywords: "notifications abonnés j'aime commentaires partages messages stories lives invitations paiements push e-mail" },
  { id: "accessibilite", group: "preferences", title: "Accessibilité", description: "Taille du texte, contraste, animations", keywords: "accessibilité texte taille contraste sous-titres animations" },
  { id: "barre-onglets", group: "preferences", title: "Barre d'onglets", description: "Raccourcis de navigation", keywords: "barre onglets navigation raccourcis" },
  { id: "langue", group: "preferences", title: "Langue et région", description: "Langue, région, format de date et d'heure", keywords: "langue région date heure format français anglais" },
  { id: "multimedia", group: "preferences", title: "Contenu multimédia", description: "Lecture automatique, qualité, économie de données", keywords: "vidéo lecture automatique wifi son qualité import téléchargements données mobiles" },
  { id: "temps", group: "preferences", title: "Temps passé sur PANU", description: "Votre temps d'utilisation et rappels", keywords: "temps passé rappel pause durée utilisation statistiques" },
  { id: "navigateur", group: "preferences", title: "Navigateur", description: "Ouverture des liens", keywords: "navigateur liens externe historique" },
  { id: "mode-sombre", group: "preferences", title: "Mode sombre", description: "Clair, sombre ou automatique", keywords: "mode sombre clair thème automatique apparence" },
  { id: "tableaux-de-bord", group: "preferences", title: "Tableaux de bord", description: "Statistiques personnelles et créateur", keywords: "tableau de bord statistiques créateur monétisation", to: "/tableau-de-bord" },
  { id: "galerie", group: "preferences", title: "Suggestions de partage depuis la galerie", description: "Suggestions et autorisations de galerie", keywords: "galerie suggestions partage photos" },
  { id: "publicites", group: "preferences", title: "Publicités sur le contenu que vous créez", description: "Préférences publicitaires", keywords: "publicités monétisation annonces" },
  { id: "acces-anticipe", group: "preferences", title: "Accès anticipé aux fonctionnalités", description: "Tester les nouveautés", keywords: "accès anticipé bêta expérimental" },

  { id: "verrouillage", group: "audience", title: "Verrouillage du profil", description: "Réserver votre profil à vos abonnés", keywords: "verrouiller profil privé public abonnés" },
  { id: "infos-profil", group: "audience", title: "Informations du profil", description: "Ce qui est visible publiquement", keywords: "biographie localisation site web informations visibles" },
  { id: "mode-pro", group: "audience", title: "Mode professionnel", description: "Profil professionnel et outils créateur", keywords: "professionnel créateur statistiques outils" },
  { id: "trouver", group: "audience", title: "Comment les autres peuvent vous trouver", description: "Recherche, téléphone, messages, suggestions", keywords: "recherche trouver contacter numéro téléphone messages invitations suggestions" },
  { id: "publications", group: "audience", title: "Publications", description: "Visibilité, commentaires, mentions, partages", keywords: "publications commentaires mentions identifications partages supprimer" },
  { id: "stories", group: "audience", title: "Stories", description: "Visibilité, réponses, archives", keywords: "stories réponses partages archives masquer" },
  { id: "pages", group: "audience", title: "Pages", description: "Pages que vous gérez", keywords: "pages administrateurs" },
  { id: "reels", group: "audience", title: "Reels", description: "Visibilité, commentaires, remix", keywords: "reels remix commentaires partage" },
  { id: "avatars", group: "audience", title: "Avatars", description: "Avatar et affichage", keywords: "avatar" },
  { id: "followers", group: "audience", title: "Followers et contenu public", description: "Qui peut vous suivre, vos abonnés", keywords: "followers abonnés suivre public commentaires mentions" },
  { id: "identification", group: "audience", title: "Profil et identification", description: "Mentions et identifications", keywords: "identification tag mention approuver" },
  { id: "blocage", group: "audience", title: "Blocage", description: "Comptes bloqués", keywords: "bloquer débloquer comptes bloqués" },
  { id: "statut-en-ligne", group: "audience", title: "Statut en ligne", description: "Afficher ou masquer votre présence", keywords: "statut en ligne dernière activité disponibilité" },

  { id: "paiements", group: "paiements", title: "Paiements", description: "Publicités et règlements", keywords: "paiements factures retraits revenus cadeaux règlements moyens de paiement" },

  { id: "historique", group: "activite", title: "Historique d'activité", description: "Vos publications, commentaires, réactions, abonnements", keywords: "historique activité publications commentaires réactions recherches abonnements invitations" },
  { id: "autorisations-appareil", group: "activite", title: "Autorisations de l'appareil", description: "Caméra, micro, notifications, localisation, contacts", keywords: "autorisations caméra microphone photos notifications localisation contacts" },
  { id: "applications", group: "activite", title: "Applications et sites Web", description: "Connexions externes", keywords: "applications sites web connexions révoquer google" },
  { id: "integrations-pro", group: "activite", title: "Intégrations professionnelles", description: "Services connectés", keywords: "intégrations professionnelles services connectés" },
  { id: "gerer-infos", group: "activite", title: "Comment gérer vos informations", description: "Quelles données, pourquoi, comment les gérer", keywords: "données informations télécharger supprimer utilisation" },
  { id: "whatsapp", group: "activite", title: "WhatsApp", description: "Partage facultatif vers WhatsApp", keywords: "whatsapp partager invitation profil" },

  { id: "conditions", group: "standards", title: "Conditions de service", description: "Conditions générales d'utilisation (CGU)", keywords: "conditions service cgu règles utilisation responsabilités compte propriété", to: "/conditions" },
  { id: "politique-confidentialite", group: "standards", title: "Politique de confidentialité", description: "Données collectées et vos droits", keywords: "confidentialité données conservation droits", to: "/confidentialite" },
  { id: "cookies", group: "standards", title: "Politique d'utilisation des cookies", description: "Cookies et technologies similaires", keywords: "cookies consentement stockage préférences navigateur", to: "/cookies" },
  { id: "regles-communaute", group: "standards", title: "Règles communautaires", description: "Contenus interdits, signalement, sanctions", keywords: "communauté modération contenus interdits signalement sanctions contestation mineurs", to: "/regles-communaute" },
  { id: "conditions-abonnement", group: "standards", title: "Conditions d'abonnement et de paiement", description: "Free, Premium, Pro, paiements, monétisation", keywords: "abonnement paiement prix facturation remboursement cadeaux monétisation free premium pro", to: "/conditions-abonnement" },
  { id: "politique-ia", group: "standards", title: "Politique d'utilisation de l'IA", description: "Règles du Studio IA", keywords: "intelligence artificielle ia studio génération images voix responsabilité", to: "/politique-ia" },
];

/** Normalise pour la recherche : minuscules, sans accents. */
export function foldText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Rubriques correspondant à une recherche (tous les mots doivent apparaître). */
export function searchSections(query: string, sections: SettingsSection[] = SETTINGS_SECTIONS): SettingsSection[] {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return sections;
  return sections.filter((s) => {
    const hay = foldText(`${s.title} ${s.description} ${s.keywords}`);
    return words.every((w) => hay.includes(w));
  });
}

export function findSection(id: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((s) => s.id === id);
}
