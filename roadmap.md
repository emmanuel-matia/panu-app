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

## Studio vidéo (terminé, en attente de validation)
- [x] Import depuis le téléphone, aperçu, lecture/pause, titre, légende
- [x] Découpage début/fin, volume, texte sur la vidéo
- [x] Création par IA (génération réelle)
- [x] Publication (stockage + base), fil d'accueil et profils
- [ ] Validation utilisateur

## Accueil façon maquette (terminé, en attente de validation)
- [x] En-tête (recherche, notifications, messages, profil), onglets, publications immersives
- [x] Navigation : Accueil, Explorer, +, Studio IA, Profil

## Fonctionnalités réelles avant publication (en cours)
- [ ] Base : J'aime, commentaires (+ réponses), vues, partages, stories 24 h, audio, image, remix, créations IA
- [ ] Onglets Abonnements + Tendances (classement réel)
- [ ] J'aime, Commenter, Partager (lien /p/id), Remixe sur les publications
- [ ] Image / Design + Audio (import, couverture, lecteur)
- [ ] Stories (import, texte/emojis, vues, liste des personnes ayant vu, expiration 24 h)
- [ ] Studio IA : vidéo, image, musique, voix, scénarios (Gemini) avec aperçu, téléchargement, enregistrement, publication
- [x] Champ texte du Studio IA → génération Gemini affichée dans la zone de résultat (fonction serveur, pas d'Edge Function)
- [ ] Tests réels + bilan

## Étape en cours — vérification des clés + premières corrections
- [x] Clés vérifiées : Gemini OK, FAL_API_KEY OK, ELEVENLABS_API_KEY refusée (identifiant au lieu de la clé), OPENAI_API_KEY refusée
- [x] Base : rester sur Lovable Cloud (choix utilisateur)
- [x] Fil : une seule vidéo joue à la fois, lecture auto, arrêt du son au défilement
- [x] Modifier titre/légende de ses publications (suppression déjà en place)
- [x] Profil : nom d'utilisateur modifiable, photo de couverture
- [x] Images IA enregistrées dans l'espace privé + historique (ai_creations)

## Nouvelle mission (reçue le 2 nov., à faire par priorités)
- [ ] P1 Écran A (accueil visiteur : logo, visuel africain, slogan, Google, e-mail, connexion, « Découvrir d'abord », CGU) + Écran B (réseau social), routes distinctes — maquette à recevoir (non visible dans la conversation)
- [ ] P1 Crédits de bienvenue configurables (attribués une seule fois)
- [ ] P2 Connexion Google réelle + redirection vers l'écran principal
- [x] P3 Profil : couverture, abonnés/abonnements, onglets Publications/Vidéos/Photos/Stories/Enregistrés (vérifiés sur mobile)
- [ ] P3 Profil : catégorie, liens, stats de vues
- [x] Studio IA branché : Texte (Gemini), Voix + Musique (ElevenLabs), Image (Fal.ai → Gemini → Stability → Cloudflare), Vidéo (Fal.ai → PixVerse), avec états réels
- [ ] Vidéo IA : bloquée tant que les soldes Fal.ai et PixVerse sont vides (à recharger par l'utilisateur)
- [x] P3 Paramètres réels : infos, mot de passe, confidentialité, notifications, langue, déconnexion, suppression du compte
- [ ] P4 Stories (photo/vidéo, légende, plein écran, enchaînement, vues, durée, suppression, réactions)
- [ ] P4 Studio IA complet (image, retouche/arrière-plan, vidéo, photo→vidéo, musique, voix, texte conversationnel, hashtags) + historique + publication
- [ ] P4 Tendances (vidéos, hashtags, créateurs, catégories) sur données réelles
- [ ] P4 Pages Afrique, Business, Marketplace, LIVE, Formations, Recherche
- [ ] P5 Publications texte/photo/vidéo, hashtags, J'aime, commentaires, partage, enregistrer
- [ ] P5 Abonnements Free/Premium/Pro avec paiement réel (prestataire à choisir)
- [ ] P5 Navigation : Accueil, Explorer, Créer (menu Publication/Photo/Vidéo/Story/Live/Studio IA), Live, Profil
- [ ] P6 Tables restantes (notifications, messages, marketplace, lives, abonnements, statistiques) dans la base actuelle
- [ ] P7 Tests réels complets + préparation du lancement


## Paramètres réels (terminé, en attente de validation)
- [x] Informations du compte, mot de passe, confidentialité (remix par défaut), notifications, langue, aide/légal
- [x] Suppression définitive du compte (fichiers + compte), déconnexion
- [ ] Validation utilisateur

## Étapes suivantes (à valider avant de commencer)
- [ ] Modules avancés : Studio, Live, Play, Academy, Shop, Wallet, Creator,
      Monétisation, Link, Distribution

## Règles imposées par l'utilisateur
- Routage : TanStack Router uniquement. Jamais React Router DOM.
- Aucune donnée fictive, aucun faux utilisateur, aucune fausse statistique.
- Ne pas modifier l'architecture de routage sans validation.
- S'arrêter après chaque étape et attendre validation.

## Maquettes officielles A + B (terminé, en attente de validation)
- [x] Écran de bienvenue /bienvenue (Google, e-mail, connexion, découvrir, 60 crédits)
- [x] Crédits réels : 60 offerts une fois, débit par génération, remboursement si échec
- [x] Accueil : stories réelles, raccourcis, publications immersives, barre Studio IA, nav LIVE
- [x] J'aime, commentaires + réponses, enregistrer, partager (/p/id), remixer, vues
- [x] Studio IA : texte (publication, hashtags, scénario), image, musique, voix, vidéo, historique, publier
- [x] Explorer : recherche + catégories réelles
- [ ] LIVE, Marketplace, Formations (pages vides honnêtes pour l'instant)
- [ ] Photo parlante (Sync) — à faire
- [ ] Validation utilisateur

## Mission Profil + Paramètres et confidentialité + communauté (reçue le 2 nov.)
- [x] Base : champs profil, préférences, visibilité, blocages, fondateur, parrainage, téléphone privé, notifications, temps d'utilisation, stats créateur
- [x] Fondateur @emmanuelmatia150 désigné (admin), abonnement auto + comptes existants abonnés une fois
- [x] Profil complet (site, ville/pays, réseaux, compteurs, 6 boutons, onglets)
- [x] Tableau de bord créateur (périodes, vraies stats)
- [x] Menu Paramètres et confidentialité (recherche + toutes rubriques)
- [x] Abonnés / abonnements, blocage, retrouver mes amis (contacts), invitations + parrainage
- [x] Notifications in-app réelles
- [x] Tests réels + rapport (voir réponse du 2 nov.)
- [ ] Compte administrateur distinct du fondateur — attend l'adresse e-mail du compte admin
- [ ] Espace d'administration fondateur (gestion utilisateurs, abonnements, monétisation) — étape suivante
- [ ] Paiements / monétisation réels — attend l'accord et le choix d'un prestataire

## Espace d'administration (testé, en attente de validation)
- [x] Fondateur (super admin) distinct de l'administrateur quotidien, rôles attribués par identifiant utilisateur côté base
- [x] Tableau de bord admin : aperçu, utilisateurs, signalements ; fondateur : administrateurs, abonnements (offre seulement), journal, monétisation (vide, aucun paiement branché)
- [x] Bouton « Signaler » sur les publications des autres membres
- [ ] Assistance aux utilisateurs (messagerie de support) : non développée
- [ ] Suspension de compte par la modération : non développée

