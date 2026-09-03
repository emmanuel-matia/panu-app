# PANU — Étape 1 : architecture du projet

## Point bloquant d'environnement (à lire en premier)

Cet environnement Lovable impose **TanStack Router / TanStack Start** comme routeur.
`react-router-dom` n'est pas supporté ici : l'installer casse le build (SSR, génération
de l'arbre de routes, prévisualisation). Ce n'est pas un choix esthétique, c'est une
contrainte de la plateforme.

Conséquence pratique : **le résultat visé reste identique** (routes par URL, layout
partagé, navigation par onglets, routes protégées). Seule la syntaxe change :

| Besoin | React Router DOM | Ici (TanStack Router) |
|---|---|---|
| Déclarer une page | `<Route path="/explorer">` | fichier `src/routes/explorer.tsx` |
| Lien | `<Link to>` | `<Link to>` (identique) |
| Navigation | `useNavigate()` | `useNavigate()` (identique) |
| Layout | `<Outlet />` | `<Outlet />` (identique) |
| Route protégée | wrapper `<RequireAuth>` | dossier `_authenticated/` |

Le reste de ta stack est respecté : React, TypeScript, Vite, Tailwind CSS, Supabase.

Si tu refuses cette contrainte, je ne peux pas garantir une application fonctionnelle
dans Lovable — il faudrait exporter le code et le faire tourner ailleurs.

## Structure de dossiers proposée

```text
src/
  routes/                 # une page = un fichier (URL = chemin du fichier)
    __root.tsx            # shell global (métadonnées, providers)
    _app/                 # layout principal : barre de navigation basse
      route.tsx
      index.tsx           # Accueil            /
      explorer.tsx        # Explorer           /explorer
      creer.tsx           # Créer              /creer
      messages.tsx        # Messages           /messages
      notifications.tsx   # Notifications      /notifications
      profil.tsx          # Profil             /profil
      parametres.tsx      # Paramètres         /parametres
    connexion.tsx         # /connexion
    inscription.tsx       # /inscription
  components/
    layout/               # AppShell, BottomNav, TopBar, PageHeader
    ui/                   # composants shadcn existants
    common/               # EmptyState (état vide réutilisable)
  features/               # emplacements réservés, vides pour l'instant
    studio/ live/ play/ academy/ shop/ wallet/
    creator/ monetisation/ link/ distribution/
  lib/                    # utilitaires
  hooks/                  # hooks partagés
  types/                  # types TypeScript partagés
  styles.css              # design system (tokens de couleur, typographie)
```

Chaque dossier de `features/` contiendra plus tard ses composants, ses hooks et ses
appels données ; il reste vide (avec un README d'une ligne) tant que la fonctionnalité
n'est pas demandée.

## Fichiers créés à cette étape

- `src/styles.css` — design system PANU repris de la maquette : fond bleu nuit,
  accents violet/bleu électrique, or pour les éléments « fondateur », coins arrondis.
- `src/components/layout/BottomNav.tsx` — Accueil, Explorer, bouton **+** central,
  Messages, Profil.
- `src/components/layout/PageHeader.tsx` — titre de page + actions.
- `src/components/common/EmptyState.tsx` — icône, titre, texte, bouton d'action.
- `src/routes/_app/route.tsx` — layout avec `<Outlet />` + barre de navigation.
- Les 7 pages de `_app/` + `connexion.tsx` + `inscription.tsx`.
- `src/features/*/README.md` — 10 dossiers réservés.
- Métadonnées SEO (titre, description) propres à chaque page.

Toutes les pages affichent un **état vide honnête** (« Aucun contenu pour le moment »),
exactement comme sur ta maquette. Aucune donnée fictive, aucun faux utilisateur,
aucune fausse publication, aucune fausse statistique.

## Dépendances

Déjà présentes : React 19, TypeScript, Vite 7, Tailwind CSS v4, TanStack Router,
TanStack Query, shadcn/ui, lucide-react.

À ajouter : **rien** pour cette étape. Supabase sera activé via Lovable Cloud
(base de données + authentification, sans compte externe) à l'étape suivante,
quand on branchera Connexion / Inscription.

## Hors périmètre de cette étape

Aucune logique métier : pas d'upload, pas de flux, pas de live, pas de paiement,
pas de messagerie. Uniquement la coquille navigable.
