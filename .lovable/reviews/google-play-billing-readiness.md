# PANU Coins — préparation Google Play Billing

## État actuel
Les achats ne sont **pas activés**. Aucun paiement, commande ou Coin n’a été créé par cette préparation. Le portefeuille et les historiques financiers existants sont conservés. Les boutons cadeaux et animations LIVE sont différés selon la nouvelle priorité.

Google autorise l’inscription marchande en **RDC**, avec USD comme devise par défaut. Visa est un moyen de paiement proposé par Google selon le pays et le compte acheteur : PANU ne collecte pas les données de carte.

## À fournir ou valider
1. Profil marchand Google Payments validé et lié au compte Play Console de PANU.
2. Projet Android de l’application `site.panu.app` : version publiée avec Play Billing activé, signature Play et Digital Asset Links valides. Aucun projet Android n’est présent dans ce dépôt web.
3. Identifiants réels des dix produits consommables, tarifs/pays et état actif dans Play Console. Les associer aux packs existants via l’administration PANU ; ne pas inventer les identifiants.
4. Accès Google Play Developer API autorisé pour cette application, côté serveur, avec droits de lecture et consommation des commandes. Aucun accès Google ni identifiant de vérification n’est actuellement connecté.
5. Liaison vérifiable du compte et de la commande PANU au paiement Android. La TWA doit transmettre ces identifiants opaques ; un token fourni par le navigateur seul ne prouve pas son propriétaire.

## Préparation technique livrée
- Détection de la capacité Digital Goods réelle, distincte du simple referrer Android.
- Lecture des produits Play lorsqu’ils sont configurés ; aucun produit absent ou prestataire non validé n’est rendu achetable.
- Lecteur serveur de `purchases.productsv2`, non exposé et non enregistré comme prestataire.
- Contrôles testés des achats confirmés, de test, en attente, annulés, d’un autre compte/commande/produit, remboursés ou consommés. Ce lecteur ne constitue **pas** une preuve de montant encaissé.

## Activation financière restant à réaliser
- Créer la commande avec les termes immuables existants, puis ouvrir le paiement Android sous geste utilisateur.
- Relire Google côté serveur et vérifier produit, compte, commande, statut et absence de transaction de test. Rejeter les remises/prix/devises incompatibles tant que la tarification correspondante n’est pas prise en charge.
- Obtenir le montant réellement facturé et la devise depuis une source Google faisant autorité : **ProductPurchaseV2 ne les fournit pas**. Le prix du catalogue ou une valeur envoyée par Android ne remplace pas cette preuve.
- Créditer une seule fois via `coin_settle_verified`, jamais par écriture directe ni via les crédits IA. Conserver la référence unique et reprendre les paiements interrompus sans double crédit.
- Consommer/accuser réception seulement après crédit durable et traiter les achats en attente, reprises et notifications Google ; ne pas attribuer un token ancien à une nouvelle commande.
- Les cadeaux restent bloqués tant que les frais et le net réellement encaissé ne sont pas indépendamment rapprochés ; ne pas appliquer un pourcentage Google supposé.

## Essai réel attendu
Application installée depuis une piste Play autorisée, compte acheteur non configuré comme testeur de licence pour l’essai réellement facturé, carte Visa acceptée par Google et téléphone Android. Vérifier la facture Google, puis le solde serveur, le crédit unique et la référence dans l’historique PANU. Rejouer la confirmation et contrôler l’absence de double crédit. Aucun achat réel n’est lancé sans action explicite de l’utilisateur.

## Références officielles
- [Pays marchands Google Play](https://support.google.com/googleplay/android-developer/answer/9306917)
- [Play Billing dans une TWA](https://developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing)
- [Preuves ProductPurchaseV2](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.productsv2)