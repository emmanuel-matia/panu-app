# PANU — Roadmap

## Étape 1 — Architecture + coquille navigable (en cours)
- [x] Design system PANU (styles.css)
- [x] Layout principal + navigation basse
- [x] Pages : Accueil, Explorer, Créer, Messages, Notifications, Profil, Paramètres
- [x] Pages Connexion / Inscription (coquille visuelle, sans logique)
- [x] Dossiers réservés pour les modules avancés
- [ ] Validation utilisateur

## Étape 2 — Authentification réelle (terminée, en attente de validation)
- [x] Lovable Cloud activé
- [x] Table `profiles` + RLS
- [x] Inscription / connexion / déconnexion / session
- [x] Mot de passe oublié + réinitialisation
- [x] Routes privées protégées (`_authenticated`)
- [ ] Validation utilisateur

## Étape 3 — Profils (terminée, en attente de validation)
- [x] Page publique /@username (avatar, bio, date d'inscription)
- [x] Envoi de photo de profil (stockage privé, 5 Mo max)
- [x] Édition nom affiché + bio, réservée au propriétaire
- [x] Suivre / ne plus suivre + compteurs abonnés / abonnements sur /@username
- [ ] Validation utilisateur

## Étapes suivantes (à valider avant de commencer)
- [ ] Modules avancés : Studio, Live, Play, Academy, Shop, Wallet, Creator,
      Monétisation, Link, Distribution

## Règles imposées par l'utilisateur
- Routage : TanStack Router uniquement. Jamais React Router DOM.
- Aucune donnée fictive, aucun faux utilisateur, aucune fausse statistique.
- Ne pas modifier l'architecture de routage sans validation.
- S'arrêter après chaque étape et attendre validation.
