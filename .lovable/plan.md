# PANU Android — plan par étapes

Le travail se fait étape par étape. Je m'arrête après chaque étape et j'attends votre validation, comme d'habitude.

## Choix de l'application Android
PANU tourne sur un serveur (connexion, Studio IA, Live, partage). On ne peut donc pas l'emballer comme un simple site hors ligne. La solution retenue est une **application Android officielle de type « Trusted Web Activity »**, le format recommandé par Google pour une application web :
- elle s'installe depuis Play Store, avec l'icône PANU, l'écran de démarrage et le plein écran, sans barre d'adresse ;
- elle s'ouvre directement sur panu.site, donc chaque mise à jour du site arrive dans l'application sans nouvelle version Play Store ;
- elle pèse moins de 2 Mo à installer ;
- aucune clé secrète n'est incluse dans le fichier : tout reste sur le serveur ;
- elle fonctionne à partir d'Android 7 (2016), soit environ 97 % des téléphones actifs : TECNO, Infinix, Samsung, Xiaomi, OPPO, Vivo, Pixel, Motorola, Nokia. Il faut Chrome ou un navigateur compatible, présent par défaut sur presque tous ces téléphones. Huawei sans les services Google : l'application s'ouvre dans le navigateur installé.

Capacitor a été écarté : il demanderait de séparer l'application de son serveur, donc de la reconstruire en partie.

## Étape 1 — Économie de données (priorité absolue)
- Nouvelle section Paramètres → « Économie de données », avec trois choix : Économie maximale, Équilibrée, Qualité élevée. Le choix est conservé sur le compte.
- **Maximale** : pas de lecture automatique (miniature + bouton Lire), aucun préchargement vidéo, images réduites, avatars légers. Option « Vidéos et envois lourds seulement en Wi-Fi ».
- **Équilibrée** (par défaut) : lecture automatique sans son. Seules les premières secondes de la vidéo visible sont chargées, jamais celles des suivantes.
- Bascule automatique en Économie maximale quand le téléphone signale une connexion lente (2G/3G) ou l'économiseur de données Android.
- Photos : compression et conversion en WebP sur le téléphone avant l'envoi (souvent 5 à 10 fois plus léger).
- Vidéos : à l'envoi, compression sur le téléphone quand c'est possible (720p au maximum). Les miniatures sont générées automatiquement (déjà en place).
- Fil : chargement par pages de 10 publications au lieu de tout d'un coup ; images chargées seulement à l'approche de l'écran ; moins de rafraîchissements automatiques en arrière-plan.
- Message clair « Hors ligne » ou « Connexion faible » sur les actions qui demandent Internet.

## Étape 2 — Application installable (PWA)
- Manifeste PANU : nom, icônes Android de toutes tailles, couleur bleu nuit, écran de démarrage.
- Cache des fichiers statiques de l'application (ils ne sont plus retéléchargés à chaque visite) et page « Hors ligne ».
- Liens profonds : les liens panu.site/p/…, /@…, /story/… et /live/… s'ouvrent directement dans l'application.
- Bouton retour Android : il suit l'historique de PANU.

## Étape 3 — Paquet Play Store
- Nom du paquet permanent proposé : **site.panu.app** (il ne pourra plus jamais changer).
- Création du projet Android (Android 7 minimum, cible Android 15 / SDK 35, comme l'exige Google Play), version 1.0.0 (code 1).
- Fichier de liaison du domaine sur panu.site pour que l'application s'affiche sans barre d'adresse.
- Génération du fichier .aab, à condition que les outils Android puissent fonctionner dans mon environnement. Sinon, je fournis le projet complet avec une commande unique à lancer.
- **Signature** : je recommande la « signature par Google Play ». Je génère une clé d'envoi que vous devez conserver précieusement ; Google garde la clé de production.

## Étape 4 — Fiche Play Store et conformité
- Descriptions courte et longue en français, captures d'écran réelles de PANU, icône 512 px, bannière 1024×500.
- Politique de confidentialité : https://panu.site/confidentialite (déjà en ligne).
- Brouillon des déclarations « Sécurité des données », des autorisations (caméra, micro, photos, notifications) et du questionnaire de classification du contenu.
- Points de règlement Google Play : signalement et blocage (déjà présents), modération IA avec examen humain et signalement des contenus IA. Achats numériques : Google impose sa facturation pour les abonnements dans l'application. Aucun paiement n'est activé sans votre accord.
- Guide pas à pas : test interne, puis publication.

## Ce qui demande une action ou un accord de votre part
- **Compte Google Play Console** (25 $ une fois). Vous seul pouvez le créer, téléverser le fichier et publier.
- **Qualités vidéo 144p à 1080p** : il faut un service de transcodage payant (par exemple Cloudflare Stream, environ 5 $ par 1 000 minutes stockées). Il ne sera pas activé sans votre accord. En attendant, la compression au moment de l'envoi et la lecture limitée économisent déjà beaucoup.
- **Tests sur de vrais téléphones** (petite RAM, milieu de gamme, récent, 2G/3G) : je peux simuler des écrans et des réseaux lents et mesurer les mégas consommés. Les vrais appareils devront être testés par vous lors du test interne.
- **Messages privés, portefeuille et abonnements payants** : ils n'existent pas encore dans PANU. Ils ne seront pas inventés et resteront à construire plus tard.

## Détails techniques
- Préférence `data_mode` dans `user_settings.prefs` (prefs.ts), section dans `settings-config.ts` et le registre, règles pures dans `data-saver-rules.ts` avec tests.
- `preload="none"` en mode maximal ; `metadata` sur la carte active seulement ; `navigator.connection.effectiveType` / `saveData`.
- Compression : canvas → `image/webp`, avec repli sur JPEG. Vidéo : MediaRecorder si le navigateur le permet, sinon envoi d'origine.
- Pagination par curseur sur `list_posts` (migration non destructive, avec paramètres optionnels).
- Service worker limité aux fichiers statiques (jamais les appels serveur ni les médias privés signés).
- `/.well-known/assetlinks.json` servi par une route publique ; Bubblewrap pour générer le projet Android.
