# Monétisation PANU — intégration sans refonte

## Résultat de l’inspection
- PANU utilise React, TanStack Start/Router, les composants et thèmes existants, et la base Lovable Cloud actuelle.
- `src/features/monetisation` et `src/features/wallet` sont des dossiers réservés, pas des services financiers opérationnels.
- Les paramètres proposent déjà **Paiements** et **Abonnements PANU**. Le tableau de bord créateur propose les statistiques réelles et une section « Revenus et cadeaux » non activée. L’administration contient également une rubrique Monétisation non activée.
- `user_credits` et `credit_transactions` concernent le Studio IA et les offres Free/Premium/Pro : ils ne seront ni convertis en Coins ni réutilisés comme portefeuille d’argent.
- Aucun connecteur de paiement accessible n’a été trouvé. Le code inspecté ne comporte pas de paiement opérationnel ; vérifier aussi les intégrations de paiement configurées avant toute activation.
- **Pays confirmé : République démocratique du Congo (RDC).** La vérification d’éligibilité indique que Stripe intégré n’est pas disponible pour ce pays et que ce projet n’est pas éligible à Paddle. Ne pas activer ces services ni Shopify : il faut examiner un prestataire externe acceptant une entreprise RDC et ce modèle de cadeaux/revenus créateurs, puis le connecter avec votre accord.
- **Lovable Cloud est en pause.** L’inspection du schéma en ligne a échoué. Les migrations conservées dans le projet permettent une analyse préliminaire, mais ne prouvent pas l’état actuel de la base.
- Les images inspireront uniquement la présentation du portefeuille, des outils de monétisation et des retraits. Leurs soldes, packs, tarifs, seuils et logos de prestataires ne sont pas des données PANU validées.

## Périmètre protégé
Aucun changement au logo, à l’accueil, aux profils, à l’authentification, aux onglets, à la navigation principale, aux polices ou aux couleurs globales. Aucun remplacement de données, aucune suppression et aucune deuxième application.

Seuls les liens nécessaires seront ajoutés dans les rubriques **Paiements** et **Revenus et cadeaux** déjà présentes. Les écrans de monétisation réutiliseront les composants et le thème existants. Les autres travaux en attente, notamment les éditeurs et le panel Live, restent hors de cette demande.

## 1. Confirmer les prérequis
Avant toute opération financière :
1. Reprendre Lovable Cloud, vérifier les tables/fonctions réellement présentes et les possibilités de sauvegarde ; inventorier les intégrations existantes. Ne créer que les éléments manquants.
2. Utiliser le pays d’enregistrement confirmé, la RDC, pour vérifier les services externes d’encaissement et de versement ; ne pas utiliser une entité dans un autre pays sans justification réelle.
3. Faire valider la monnaie, les packs et prix Coins, le catalogue de cadeaux, les commissions, le calcul des revenus, les tarifs et avantages des abonnements de fans, les budgets Boost, les conditions d’éligibilité et de retrait, ainsi que les règles de remboursement.
4. Vérifier séparément les capacités d’**encaissement** et de **versement aux créateurs**, les pays desservis, la vérification d’identité et les frais. Un service de paiement ordinaire ne garantit pas les retraits Mobile Money ni les versements multi-créateurs.
5. La vérification des paiements intégrés a été effectuée : indisponibles pour ce pays et ce modèle. Vérifier un prestataire externe et ses capacités contractuelles, présenter une recommandation adaptée et obtenir confirmation avant connexion. Ne pas inventer la disponibilité d’Airtel Money, Orange Money, Afrimoney, PayPal ou d’un virement.
6. Pour la version distribuée sur Google Play, vérifier les obligations de facturation des biens numériques. Google Play n’est pas un moyen de retrait créateur ; aucun achat externe ne sera ajouté à cette version sans vérification de sa conformité.

Les règles commerciales non fournies resteront non configurées : aucun faux tarif, catalogue actif ou revenu annoncé. Aucun paiement réel ni achat de crédits Cloud sans accord.

## 2. Pages dédiées et accès
Créer les pages protégées sous `/monetisation` :
- **Vue d’ensemble** : portefeuille Coins, revenus disponibles, revenus en attente et accès aux outils.
- **Portefeuille et PANU Coins** : packs validés, achat, résultat vérifié, mouvements.
- **Cadeaux virtuels** : catalogue réel, coût Coins et historique envoyés/reçus.
- **Espace créateur** : réutilisation des statistiques existantes et revenus provenant exclusivement d’opérations confirmées.
- **Abonnements de fans** : offre créateur, avantages validés, souscriptions, renouvellement et résiliation ; distincts des offres PANU Free/Premium/Pro et des abonnements sociaux gratuits.
- **Boost** : sélection d’une publication existante appartenant à l’utilisateur, budget, durée, statut et résultats réels.
- **Retraits** : montant disponible, moyens effectivement pris en charge, vérification et suivi.
- **Conditions de monétisation** : conditions PANU approuvées et preuve d’acceptation versionnée.
- **Historique des transactions** : filtres, détails, statut, date, frais et références consultables sans secrets.

Chaque action mène à une page ou opération réelle. Une indisponibilité est affichée explicitement ; un échec de chargement ne devient jamais un faux solde zéro. Un solde nul n’est affiché qu’après lecture réussie d’un portefeuille réel.

## 3. Stockage financier et sécurité
### Détails techniques
- Ajouter uniquement les structures absentes : comptes Coins et revenus, écritures comptables, commandes d’achat, catalogue/packs, cadeaux, offres et abonnements de fans, campagnes Boost, demandes de retrait et événements prestataires.
- Coins en entiers ; monnaie en unités mineures avec code de devise. Ne jamais additionner des devises différentes.
- Journal comptable append-only, références uniques et écritures équilibrées. Les soldes sont dérivés ou maintenus atomiquement à partir du journal, jamais modifiables depuis le navigateur.
- Transactions SQL et verrouillage pour empêcher double dépense, cadeau dupliqué et retrait concurrent. Les remboursements utilisent des écritures compensatoires.
- RLS et GRANT explicites ; lecture propre à chaque compte, aucune écriture financière directe par l’application cliente. Fonctions privilégiées à droits restreints, identité et permissions vérifiées côté serveur.
- Réutiliser les rôles fondateur/personnel existants pour toute gestion autorisée, sans créer de nouveaux privilèges ni modifier les comptes.
- Fonctions serveur `*.functions.ts` avec les contrôles de session existants ; helpers `*.server.ts`. Clés privées uniquement côté serveur. Retours de paiement et webhooks sous `/api/public/`, avec vérification du prestataire et déduplication des événements.
- Chaque nouvelle page a ses propres métadonnées et reste dans le routage TanStack existant.

## 4. Parcours financiers réels
**Acheter des Coins** : commande persistée → paiement hébergé → vérification serveur du montant, de la devise et de la commande → crédit unique. Le retour du navigateur seul ne prouve jamais le paiement. Réconcilier les événements manqués et traiter remboursements/litiges.

**Envoyer un cadeau** : contrôler le destinataire, la visibilité du contenu, l’éligibilité et le solde → débiter les Coins et enregistrer les droits de revenus atomiquement → actualiser l’historique et la notification réelle. Aucun visiteur ne peut dépenser le portefeuille d’un membre. La lecture et les interactions publiques gratuites restent inchangées.

**Abonnements de fans** : vérifier la souscription et chaque renouvellement, appliquer les droits jusqu’à l’échéance payée, résilier également auprès du prestataire. Aucun accès exclusif payé ne sera promis sans mécanisme d’accès effectivement connecté.

**Boost** : créer et financer une campagne ne suffit pas à livrer une promotion. Le module doit disposer d’un placement sponsorisé identifiable et mesurer impressions et clics réels. Tout raccord nécessaire à l’affichage des publications sera soumis à validation séparée pour respecter l’interdiction de modifier l’accueil. Tant que la diffusion n’est pas opérationnelle, ne pas encaisser de campagne ni la déclarer active.

**Retrait** : vérifier les conditions et le bénéficiaire → réserver les revenus disponibles → demander le versement avec identifiant idempotent → confirmer son résultat réel. Un versement incertain reste en attente de rapprochement, sans nouvel envoi ni restitution automatique susceptible de payer deux fois.

Les raccords cadeaux aux publications ou aux directs seront minimaux et soumis au périmètre validé ; le transport vidéo, le panel et les interactions existantes ne seront pas réécrits.

## 5. Livraison et validation par étapes
1. **Portefeuille et pages sur données réelles** : vérifier permissions, affichage, état vide et erreurs. Aucun mouvement financier tant que les services ne sont pas connectés.
2. **Achats Coins** : environnement de test du prestataire, puis paiement réel uniquement avec accord. Tester refus, annulation, webhook répété, prix falsifié et remboursement.
3. **Cadeaux et revenus** : deux comptes réels, cadeau enregistré, débits/crédits relus dans l’interface, solde insuffisant et envois simultanés.
4. **Abonnements et retraits** : renouvellement, résiliation, échec, restrictions d’identité et versement confirmé selon les capacités du prestataire.
5. **Boost** : uniquement après validation du placement et contrôle de sa diffusion réelle.

À chaque étape : tests ciblés des règles financières et d’accès, contrôle des erreurs de compilation, parcours navigateur mobile/ordinateur, puis vérification de non-régression des fonctions concernées. Les essais sur téléphone physique et les transactions réellement encaissées ou versées seront distingués des tests du prestataire.

## Critères de livraison
- Aucun changement aux zones protégées ; aucune donnée fictive.
- Aucun paiement, cadeau, revenu ou retrait déclaré réussi sans preuve serveur.
- Chaque fonctionnalité activée est vérifiée de bout en bout avec relecture des données dans l’interface.
- Rapport des fichiers modifiés, tests effectués, services configurés et limites restantes.

**Prochaine étape après approbation :** confirmer les règles commerciales et rétablir l’accès Cloud, puis construire le portefeuille sécurisé et les pages dédiées. L’achat des crédits Cloud, les tarifs, les services de paiement/versement et les conditions légales restent des décisions à valider, pas des éléments inventés.