# PANU Cadeaux — rapport de l’étape 2

## Résultat

L’étape financière est développée dans le PANU existant. La galerie propose maintenant la recherche d’un destinataire, la vérification serveur du prix/solde, le message facultatif et la confirmation lorsqu’un solde suffisant est disponible. Deux onglets affichent les cadeaux envoyés et reçus. Le tableau de bord créateur lit le registre réel des revenus cadeaux ; Monétisation affiche les opérations accessibles au fondateur.

**Ce n’est pas une déclaration de mise en service complète.** Aucun prestataire n’est validé, aucun Coin acheté n’est disponible et aucun envoi financé n’a pu être exécuté. Aucun Coin, preuve, cadeau, notification ou revenu fictif n’a été injecté pour contourner ce blocage. Les intégrations des boutons profils/publications et des animations Live constituent l’étape 3, non exécutée dans cette livraison.

## Envoi sécurisé développé

- Destination déterminée depuis le profil, l’auteur d’une publication ou l’hôte réel d’un Live ; elle est relue côté serveur.
- Compte actif, confidentialité, blocages et droits sur le contenu contrôlés. Auto-cadeaux refusés. Live terminé, absent ou en pause refusé pour l’envoi.
- Cadeau actif et disponible ; prix exact relu dans la transaction. Un prix différent de celui confirmé provoque un refus, jamais un débit silencieux au nouveau prix.
- Même verrou de portefeuille que PANU Coins. Solde dérivé du journal, vérifié côté serveur. Aucun montant financier fourni par le navigateur n’est utilisé comme autorité.
- Envoi, affectation du net encaissé, revenu, débit et notification dans une opération atomique : erreur = aucun envoi ni débit partiel.
- Référence idempotente par expéditeur. Une répétition réussie doit renvoyer le même envoi sans deuxième débit ; une référence réutilisée pour une autre destination, un autre cadeau/prix/message est refusée.
- Limite anti-abus serveur de 20 envois par minute. Aucun remboursement de cadeau activé côté navigateur.
- Les opérations et revenus sont immuables et n’ont aucun droit de modification/suppression côté navigateur.

## Revenus : règle réellement implémentée

**50 % créateur / 50 % PANU sur le net encaissé après les frais réels**, selon la configuration enregistrée au moment de l’envoi.

Chaque dépense est affectée aux achats prouvés dans l’ordre chronologique FIFO. Le net réel d’un achat est réparti sur tous les Coins de son lot, bonus compris. Les arrondis cumulés en unités monétaires mineures conservent exactement le net du lot ; la part créateur est arrondie vers le bas à l’unité mineure et le reliquat appartient à PANU. Aucun taux uniforme Coins/USD n’est créé.

Une vérification monétaire nette n’est acceptée que côté service, après un achat confirmé et une preuve compatible. Le brut doit égaler frais + net. Le prestataire doit relire indépendamment ces montants : ils ne sont ni déduits d’un pourcentage configurable ni acceptés d’un navigateur.

**Si les frais ou le net ne sont pas vérifiés, l’envoi échoue sans débit.** Une extension des adaptateurs Coins permet désormais de relire le règlement net avant son enregistrement, mais le registre de prestataires reste vide : aucune intégration ou preuve réelle n’est inventée.

Les revenus restent **en attente, non retirables**. Le tableau de bord présente les montants séparés par devise ; aucun mélange USD/autres devises. Conditions d’éligibilité, disponibilité et prestataire de versement à valider avant de permettre des retraits.

## Systèmes réutilisés

- `coin_ledger`, son verrou et `coin_debit_gift` : portefeuille PANU Coins unique.
- `coin_orders` et `coin_receipts` : provenance des achats prouvés.
- `notifications`, `list_notifications`, compteur non lu et marquage lu : aucun deuxième système de notifications.
- Profils, blocages, confidentialité, publications et Live : autorisation de la destination réelle.
- Tableau de bord créateur, administration Monétisation, rôles fondateur, confirmation renforcée et audit.
- Galerie et 18 illustrations/prix de l’étape 1 conservés.

## Données ajoutées

- `gift_sends` : expéditeur, destinataire, cadeau, message, contexte, prix figé, référence et répartition appliquée.
- `gift_earnings` : registre de revenus manquant auparavant, relié à l’envoi et au lot d’achat vérifié ; net, parts, devise et statut en attente.
- `coin_net_verifications` : vérification indépendante des frais/net d’une preuve d’achat. Ce n’est pas un portefeuille.
- Lien `gift_send_id` dans les notifications existantes, type cadeau et contexte détaillé des 100 notifications récentes.

Fonctions ajoutées : `gift_find_recipient`, `gift_quote`, `gift_send`, `gift_history`, `gift_revenue_summary`, `gift_notification_context`, résolution interne de destination, réception privée et `coin_record_net_verification` réservé au service.

## Historiques et notifications

- Historiques envoyés/reçus paginés par 30 opérations, avec cadeau, personne, message, date, référence, Coins dépensés et lien contenu/Live.
- Revenus reçus et parts PANU pour le fondateur dans les opérations admin ; filtrage de la page courante par compte, cadeau ou référence.
- Le destinataire reçoit une notification cadeau dans sa boîte existante, avec nom et avatar de l’expéditeur, cadeau/message et lien de contexte. Le profil reste accessible via la ligne de notification.
- Événement privé sans montant/message transmis : seulement un signal de mise à jour aux deux comptes concernés. Rafraîchissement des notifications, historiques et soldes ; toast lorsque la page est ouverte et les notifications cadeaux autorisées.
- Reconnexion : relire les données sans rejouer les anciens toasts. Abonnement retiré à la sortie et une seule connexion par identité. Caches des historiques/revenus/devis cadeau séparés par compte.

Cette réception est développée et sa confidentialité testée ; **aucune notification de cadeau réellement envoyé n’a été observée**, faute d’envoi financé.

## Tests exécutés et résultats

**100 tests automatiques réussis** : 26 catalogue/règles cadeaux, 11 règles financières nouvelles, 27 Coins, 22 profils, 9 Live et 5 administration. Dernier signal de compilation automatique observé : **build OK**.

Tests navigateur avec un véritable compte membre de test et un profil créé par le parcours de création de profil existant, sans Coin :

- 18 cadeaux chargés.
- Recherche du profil fondateur actuel `@emma`, destinataire et avatar relus par le serveur.
- Devis Petit cœur : 5 Coins, solde 0, message facultatif ; « Solde Coins insuffisant », aucune confirmation permettant un débit ; lien recharge fonctionnel.
- Deux appels simultanés avec la même référence : deux refus pour solde insuffisant, zéro débit.
- Prix manipulé à 1 Coin : refus « Le prix a changé ».
- Auto-cadeau : refus.
- Destinataire absent et Live absent/non actif : refus.
- Blocage temporaire entre comptes : refus « Destinataire indisponible » ; blocage de test retiré ensuite.
- Historique envoyé/reçu vide relu dans la base et affiché dans l’interface.
- Tableau de bord : 0 cadeau et aucun revenu enregistré, sans chiffre inventé.
- Membre ordinaire : historique admin refusé, preuve nette refusée, lecture directe des envois et écritures directes des revenus/preuves refusées.
- Canal privé du compte testé : rejoint ; canal privé du fondateur depuis ce compte : refusé.
- Interface mobile simulée 390 × 844 : devis lisible, aucun dépassement horizontal ; captures vérifiées.
- Parcours final galerie → devis/refus → historiques → tableau de bord → notifications : aucune erreur JavaScript observée après préparation du profil de test.

Une première préparation du compte de test a exposé son absence de profil ; aucun contournement n’a été ajouté à l’authentification. Le profil de test a été créé par la fonction existante, puis le parcours répété sans erreur. Le fondateur a actuellement le nom `@emma` dans la base, différent de l’ancien nom utilisé dans les précédents rapports ; aucune modification du profil fondateur n’a été effectuée.

## Non vérifié — ne pas confondre développement et validation financière

- Envoi réussi, débit réel, réception, notification cadeau, revenu monétaire et relecture après un vrai achat.
- Idempotence après un envoi réussi, concurrence avec solde financé et rollback provoqué après affectation du revenu.
- Preuve nette réellement récupérée auprès d’un prestataire et rapprochement des frais.
- Catalogue désactivé/changement de prix concurrents pendant un envoi financé.
- Réception/animation durant un vrai Live, téléphones physiques et reconnexion pendant diffusion.
- Retraits et remboursements : non activés.

## Conditions restantes et prochaine étape

Les recharges restent exclusivement PANU Coins. M-Pesa, Orange Money, Airtel Money, Afrimoney, Visa/cartes, virement et Google Play nécessitent leurs intégrations/identifiants marchands et tests validés. Google Play exige toujours l’accès serveur Google, les produits Play Console, le parcours d’achat Android et Pub/Sub ; l’accès proposé précédemment avait été refusé.

Un **vrai achat vérifié, ses frais/net confirmés et deux comptes de test approvisionnés légalement** sont indispensables pour vérifier le circuit financier positif. Aucun crédit artificiel ne sera utilisé.

Après validation de l’étape 2 : boutons cadeaux ciblés profils/publications/vidéos, galerie en contexte et intégration Live avec animations non bloquantes, puis tests multi-comptes. Aucun changement de l’accueil, du logo ou de la navigation principale.

Les changements ne sont pas publiés automatiquement et le lancement complet n’est pas annoncé.