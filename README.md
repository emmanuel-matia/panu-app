# PANU — Studio Créatif Intelligent pour Créateurs Africains

> **"Imaginez. Créez. Publiez."**  
> *Le studio créatif intelligent pensé pour les créateurs, entrepreneurs et petites entreprises africaines.*

---

## 1. Présentation du Projet

PANU est une plateforme mobile-first de création de contenu assistée par intelligence artificielle conçue spécifiquement pour le continent africain :
- Interface soignée, moderne et sobre respectant l'identité créative africaine.
- Optimisée pour les connexions mobiles et la faible consommation de données.
- Socle réel de production sans dépendance propriétaire à Bolt, exportable directement sur GitHub et déployable sur Supabase.
- Zéro fausse donnée, zéro faux compteur : chaque élément affiché est ancré dans la base de données réelle.

---

## 2. Architecture Technique (V1)

- **Client Mobile & PWA** : Android (Kotlin & Jetpack Compose, Material 3, Coroutines, Flow, Room Database) & Architecture PWA
- **Backend & Base de données** : Supabase (PostgreSQL 15+, Supabase GoTrue Auth, PostgREST, Supabase Storage)
- **Sécurité** : Row Level Security (RLS) PostgreSQL strict, contrôle des rôles (`user`, `creator`, `business`, `founder`, `admin`) côté base de données uniquement
- **Persistance locale & Cache** : Room Database pour le mode hors-ligne et les brouillons
- **Réseau** : OkHttp, Moshi, Retrofit
- **Médiathèque** : Coil Compose & Android Photo Picker (zero-permission)
- **Gestion des Médias** : Buckets Supabase Storage (`avatars`, `post-media`, `generated-media`)
- **Architecture IA** : Abstraction modulaire (`AIProvider`) prête pour connecter de multiples moteurs IA (DeepSeek, Claude, GPT, Gemini, Llama) sans dépendance rigide.

---

## 3. Structure du Code

```text
├── .env.example                               # Modèle de variables d'environnement
├── README.md                                  # Documentation complète
├── supabase/
│   └── migrations/
│       └── 20260922000000_panu_initial_schema.sql  # Schéma SQL complet & RLS
├── public/
│   └── manifest.json                          # Configuration PWA
└── app/
    ├── src/main/
    │   ├── AndroidManifest.xml
    │   ├── java/com/example/
    │   │   ├── MainActivity.kt
    │   │   ├── PanuApplication.kt
    │   │   ├── data/
    │   │   │   ├── model/                     # UserProfile, Post, UserRole, SocialLinks...
    │   │   │   ├── local/                     # Room AppDatabase, DAOs, Session
    │   │   │   ├── remote/                    # Supabase REST client, Auth, Storage, Founder
    │   │   │   └── repository/                # Repositories & AIProvider abstraction
    │   │   └── ui/
    │   │       ├── theme/                     # Palette PANU (Terre cuite, Or, Obsidienne)
    │   │       ├── components/                # Composants réutilisables (Boutons, TopBar, Nav)
    │   │       ├── navigation/                # Routes et contrôleur de navigation
    │   │       └── screens/                   # Écrans (Auth, Profil, Public, Studio, Create, Founder)
    │   └── res/                               # Ressources visuelles, icônes adaptatives, chaînes
```

---

## 4. Déploiement du Backend Supabase

1. Créez un projet sur [Supabase](https://supabase.com).
2. Rendez-vous dans le **SQL Editor** de Supabase.
3. Copiez et exécutez le script situé dans `supabase/migrations/20260922000000_panu_initial_schema.sql`.
4. Ce script met en place :
   - Les tables `profiles`, `social_links`, `posts`, `media`, `ai_credits`, `ai_credit_transactions`, `ai_generations`.
   - Les rôles sécurisés via l'énumérateur `user_role` (`user`, `creator`, `business`, `founder`, `admin`).
   - Le trigger automatique `handle_new_user` qui crée le profil et le compte de crédits à chaque inscription.
   - Les buckets Supabase Storage (`avatars`, `post-media`, `generated-media`).
   - Toutes les politiques Row Level Security (RLS) protégeant les données.

### Attribution du Rôle Founder (Sécurisé)

Dans le SQL Editor de Supabase, pour attribuer le rôle `founder` à votre compte après inscription :
```sql
UPDATE public.profiles
SET role = 'founder'
WHERE email = 'votre_email@domaine.com';
```
*(Le rôle n'est jamais hardcodé dans le code source client).*

---

## 5. Configuration Client (.env)

Créez un fichier `.env` à la racine :
```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_cle_anon_publique
```

Dans l'application, vous pouvez également configurer directement ou tester l'URL et la clé Supabase depuis l'écran **Paramètres**.

---

## 6. Lancement et Compilation

### Prérequis
- Java 17 / 21
- Android Studio ou Gradle 8+

### Commandes
```bash
# Compilation du projet
gradle assembleDebug

# Lancement des tests unitaires
gradle testDebugUnitTest
```

---

## 7. Feuille de Route V1 — Statut Étape 1

- [x] Architecture modulaire & découplage de toute dépendance propriétaire
- [x] Design PANU (Identité créative africaine, palette terre cuite / or / obsidienne)
- [x] Migration SQL Supabase complète & Politiques RLS
- [x] Authentification Supabase (Inscription, Connexion, Mot de passe oublié, Déconnexion)
- [x] Profil Utilisateur complet (Photo de profil, Bio, Localisation, Catégorie, 7 Réseaux Sociaux)
- [x] Profil Public partageable (`/@username` avec créations réelles)
- [x] Système de Rôles sécurisé côté base de données
- [x] Espace Founder (`/founder`) avec métriques réelles (Utilisateurs, Publications, Rôles)
- [x] Studio IA PANU préparé avec abstraction `AIProvider` et message explicite d'attente
- [x] Système de Crédits préparé (Solde réel, transactions, 0 par défaut)
- [x] Création de Contenu (Brouillons, Publication, Photo picker moderne)
- [x] Exportabilité GitHub & Configuration PWA
