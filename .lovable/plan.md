# PANU Cadeaux virtuels — intégration réelle, sans reconstruire PANU

## Inspection terminée

Contrôle de la base réelle et du code effectué le 26 novembre 2026 :

- Le portefeuille unique PANU Coins existe. Son solde est calculé depuis le journal financier, distinct des crédits IA.
- Dix packs USD sont enregistrés. **Zéro achat, zéro preuve de paiement, zéro mouvement Coins et zéro Coin disponible** ont été constatés.
- **Aucun moyen de paiement n’est intégré et validé.** Le registre des prestataires est volontairement vide. Activer une configuration dans l’administration ne suffit pas à rendre un paiement opérationnel.
- Google Play reste bloqué : accès de vérification Google refusé précédemment, produits Play Console, achat côté Android et notifications Pub/Sub non configurés.
- Un débit sécurisé pour de futurs cadeaux existe, mais ni catalogue, ni envois, ni revenus, ni réception ne sont encore reliés à ce débit.
- Les notifications et leurs liens vers les profils/publications existent ; elles ne gèrent pas encore les informations d’un cadeau ou d’un Live.
- Les profils, publications photo/vidéo/audio et l’administration Monétisation seront réutilisés.
- Le tableau de bord créateur existe pour les statistiques. **Aucun registre de revenus monétaires n’existe** : sa rubrique « Revenus et cadeaux » est actuellement un texte d’indisponibilité.
- Le Live utilise la diffusion existante. Le studio possède une rubrique Cadeaux informative, sans envoi réel ; le lecteur spectateur n’a pas de galerie. **Aucun Live actif disponible lors de l’inspection** : fonctionnement audio/vidéo et cadeaux en direct non vérifiés aujourd’hui.

## Deux conditions indispensables au lancement

1. **Base monétaire à valider.** Le partage 50 % créateur / 50 % PANU est approuvé, mais il ne définit pas la valeur monétaire d’un cadeau. Les packs ont des prix unitaires différents : 100 Coins coûtent 1 USD, tandis que 600 Coins coûtent 5 USD. Aucun taux uniforme ne sera inventé. La question ouverte porte sur un partage du montant réellement payé pour les Coins dépensés, avant ou après les frais du prestataire.
2. **Un encaissement réellement intégré et vérifié.** Sans achat réel, aucun utilisateur ne peut actuellement approvisionner son portefeuille. Le développement du module peut avancer, mais un envoi débité et des revenus réels ne pourront pas être déclarés vérifiés ou prêts au lancement sans cette dépendance.

## Périmètre protégé

Aucune reconstruction et aucune suppression de données. Aucun changement de l’accueil, du logo, de la navigation principale, de l’authentification ou du thème. Seuls les boutons et vues nécessaires aux cadeaux seront ajoutés aux profils, publications, lecteur/studio Live, notifications, portefeuille et tableau de bord créateur. L’administration existante sera étendue dans Monétisation.

Le composant de publications est partagé avec le fil d’accueil : l’ajout d’un bouton cadeau sur toutes ses occurrences peut le faire apparaître dans le fil, sans changer la page d’accueil elle-même. Si la protection de l’accueil interdit aussi cet ajout, réserver le bouton à la page de publication et aux contenus des profils ; conserver la structure de l’accueil intacte dans tous les cas.

## Étape 1 — Catalogue réel et administration

Enregistrer les dix-huit cadeaux de lancement, sans données de démonstration :

| Catégorie | Cadeau | Prix Coins |
|---|---|---:|
| Accessible | Petit cœur | 5 |
| Accessible | Cœur rouge | 10 |
| Accessible | Rose | 20 |
| Accessible | Étoile | 25 |
| Accessible | Bisou | 30 |
| Accessible | Fleur | 50 |
| Populaire | Bouquet de roses | 100 |
| Populaire | Trophée | 150 |
| Populaire | Étoiles brillantes | 200 |
| Populaire | Cœur animé | 250 |
| Populaire | Surprise | 300 |
| Populaire | Cadeau mystère | 500 |
| Premium | Couronne | 1 000 |
| Premium | Diamant | 1 500 |
| Premium | Fusée | 2 000 |
| Premium | Lion | 3 000 |
| Premium | Palais | 5 000 |
| Premium | Super cadeau PANU | 10 000 |

Illustrations originales, chargement fiable, filtres simples/populaires/animés/premium/spéciaux, prix, disponibilité et ordre administrables. La mise en avant populaire sera éditoriale, jamais une statistique de vente inventée. Les animations avancées absentes seront indiquées dans le rapport ; chaque cadeau aura une illustration utilisable.

Gestion dans l’administration actuelle : ajout, modification, disponibilité, prix, catégories, visuels, animation et ordre. Réutiliser la protection financière réservée au fondateur, la confirmation de sécurité et l’audit. Préférer la désactivation ; un cadeau utilisé ne pourra jamais perdre son historique.

**Arrêt à la fin de cette étape pour validation, conformément au fonctionnement par étapes de PANU.**

## Étape 2 — Envoi et comptabilité sécurisés

- Galerie avec solde réel, destinataire, message facultatif et solde restant avant confirmation.
- Prix et disponibilité relus côté serveur ; prix modifié entre sélection et confirmation : nouvelle confirmation demandée, aucun débit silencieux au nouveau prix.
- Destinataire actif, droits sur le contenu, blocages/confidentialité, interdiction des auto-cadeaux et limites anti-abus vérifiés côté serveur.
- Une seule opération atomique : envoi, débit du portefeuille existant, provenance des Coins, répartition approuvée, écritures financières et notification ; tout échoue ensemble si une vérification échoue.
- Référence stable par confirmation : relancer la même demande ne crée ni deuxième envoi ni deuxième débit. Réutiliser une référence avec un autre cadeau, message ou destinataire est refusé.
- Conserver le prix, le nom, la répartition et la valeur de référence appliqués au moment de l’envoi, même si l’administration change ensuite le catalogue.
- Distinguer Coins et argent : aucun montant ne sera présenté comme retirable sans provenance, éligibilité et statut monétaire valides. La politique de disponibilité/retrait devra être définie avant de rendre des revenus disponibles ; les versements externes ne sont pas inclus dans une fausse promesse de fonctionnement.
- Historiques envoyés/reçus paginés, messages, contenus liés, références, statuts et revenus dans le tableau de bord créateur existant.

## Étape 3 — Profils, contenus, notifications et Live

- Bouton « Envoyer un cadeau » sur les profils autorisés et les pages de contenus compatibles ; destinataire déterminé depuis le profil ou l’auteur réel, jamais depuis une valeur libre du navigateur.
- Réutiliser les notifications : expéditeur et avatar, cadeau, message, date, profil et lien publication/Live. Les préférences et la confidentialité restent respectées.
- Sur un Live réellement actif et autorisé : galerie spectateur, débit identique au parcours normal, événement persistant, affichage du cadeau et de l’expéditeur pour le créateur et les spectateurs autorisés.
- Animations non bloquantes, file d’attente bornée, respect de la réduction des mouvements ; ouvrir la galerie ne coupe pas la vidéo, le micro, le son ou la diffusion.
- Réception immédiate par événements autorisés ; reconnexion sans rejouer tous les anciens cadeaux ni perdre l’historique.
- Visiteur : peut continuer à regarder ; l’envoi financier nécessite un compte possédant des Coins. Aucun accès au panel accordé par un cadeau.

## Étape 4 — Vérification et rapport de lancement

Tests automatiques de chaque prix et du partage approuvé, puis vérifications réelles :

- Galerie mobile/ordinateur, sélection, disponibilité, changement de prix et erreurs.
- Membre/visiteur/fondateur/admin, lecture des historiques limitée à leurs destinataires, écritures financières navigateur refusées.
- Solde insuffisant, auto-cadeau, compte bloqué/inactif, contenu privé, Live terminé, catalogue désactivé.
- Idempotence, double clic, demandes concurrentes, rollback complet, absence de solde négatif, absence de revenus doublés.
- Avec **deux comptes approvisionnés par un vrai achat vérifié** : envoyer, relire le solde débité, réception, notification, historique et revenus ; aucun faux crédit pour contourner le blocage.
- Pendant un vrai Live : réception hôte et spectateur, événement unique, lecture/son/diffusion non perturbés et reconnexion. Les essais sur deux téléphones physiques seront distingués des essais navigateur.

Rapport final : fonctionnalités réellement utilisables, catalogue/prix, systèmes réutilisés, ajouts, sécurité, résultats des tests effectivement exécutés, limitations, prestataires/configurations manquants et conditions de publication. Aucune déclaration « prêt au lancement » avant validation du parcours financier complet.

## Détails techniques

- Réutiliser `coin_ledger`, `coin_orders`, `coin_receipts`, `payment_methods`, `transactions`, `notifications`, `profiles`, `posts`, `live_streams`, les rôles et l’audit.
- Ajouter seulement les données manquantes : catalogue cadeaux, opérations cadeaux immuables, configuration de répartition et registre de revenus/provenance ; **pas de deuxième portefeuille Coins**.
- Ne pas inscrire des Coins dans une devise ISO fictive ni forcer les cadeaux dans les canaux bancaires existants : relier chaque opération au débit existant et à sa comptabilité monétaire distincte.
- Revenus basés sur les preuves d’achats et l’affectation des Coins effectivement consommés. Stratégie de provenance déterministe, gestion explicite des bonus et arrondis, sans conversion uniforme inventée. Aucune rétroactivité sur les transactions enregistrées.
- Changements de schéma additifs via l’outil de migration, droits explicites, RLS et fonctions sécurisées. Fonctions d’envoi authentifiées, prix calculé dans la transaction, verrou de portefeuille déjà utilisé, accès privilégié limité aux cas nécessaires.
- Notifications existantes étendues sans casser leur format actuel ; événements temps réel minimaux et autorisés, pas de diffusion publique de données financières.
- Recharges exclusivement via PANU Coins ; M-Pesa, Orange Money, Airtel Money, Afrimoney, Google Play, cartes et virements restent non opérationnels sans leurs intégrations validées. Google Pay sera proposé seulement par un prestataire et un pays qui le prennent réellement en charge.