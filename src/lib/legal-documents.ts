/**
 * Documents juridiques officiels de PANU, transmis par l'éditeur (ETS GREEN MATIA).
 * Texte reproduit tel quel : ne pas reformuler ni compléter sans un nouveau texte de l'éditeur.
 */

export const LEGAL_PUBLISHER = {
  name: "ETS GREEN MATIA",
  manager: "Emmanuel MATIA MBUNDU",
  rccm: "CD/MJM/RCCM/25-A-01657",
  address:
    "Kanda 3, Quartier Tshiya, Commune de Dibindi, Ville de Mbuji-Mayi, Province du Kasaï-Oriental, République démocratique du Congo.",
  email: "matia@gmail.com",
  effectiveDate: "[À compléter après validation]",
  version: "1.0 – Projet de documents juridiques",
} as const;

/** Un bloc : paragraphe, liste à puces (`ul`) ou liste numérotée (`ol`). */
export type LegalBlock = string | { ul: string[] } | { ol: string[] };
export type LegalArticle = { title: string; blocks: LegalBlock[] };
export type LegalDocumentId = "cgu" | "confidentialite" | "cookies" | "communaute" | "abonnements" | "ia";
export type LegalDocument = {
  id: LegalDocumentId;
  number: number;
  title: string;
  shortTitle: string;
  path: "/conditions" | "/confidentialite" | "/cookies" | "/regles-communaute" | "/conditions-abonnement" | "/politique-ia";
  description: string;
  articles: LegalArticle[];
  /** Le texte reçu s'arrête avant la fin du document. */
  incomplete?: boolean;
};

const CGU: LegalDocument = {
  id: "cgu",
  number: 1,
  title: "Conditions générales d'utilisation (CGU)",
  shortTitle: "Conditions d'utilisation",
  path: "/conditions",
  description: "Les conditions générales d'utilisation de PANU, éditée par ETS GREEN MATIA.",
  articles: [
    {
      title: "Article 1 – Présentation de PANU",
      blocks: [
        "PANU est une plateforme numérique et sociale exploitée par ETS GREEN MATIA, établissement officiellement enregistré en République démocratique du Congo.",
        "PANU a pour objectif de favoriser la création de contenu, la communication, le partage de connaissances, l'entrepreneuriat, la créativité et les échanges entre les utilisateurs, particulièrement sur le continent africain.",
        "La plateforme propose notamment :",
        {
          ul: [
            "La publication de photos, vidéos et contenus écrits.",
            "Les profils personnels et professionnels.",
            "Les vidéos courtes et les stories.",
            "Les diffusions en direct.",
            "La messagerie et les interactions entre utilisateurs.",
            "Les outils de création et de modification assistés par intelligence artificielle.",
            "Les abonnements et fonctionnalités Premium et Pro.",
            "Les cadeaux virtuels et autres fonctionnalités de monétisation, lorsqu'elles sont activées.",
          ],
        },
      ],
    },
    {
      title: "Article 2 – Acceptation des conditions",
      blocks: [
        "Toute personne qui crée un compte ou utilise PANU accepte les présentes conditions générales.",
        "L'utilisateur doit consulter les conditions avant de créer son compte. Toute modification importante sera portée à sa connaissance.",
      ],
    },
    {
      title: "Article 3 – Création de compte",
      blocks: [
        "L'utilisateur s'engage à fournir des informations exactes et à jour.",
        "Il est responsable de la confidentialité de ses identifiants et des activités réalisées depuis son compte.",
        "Il est interdit :",
        {
          ul: [
            "De créer un compte dans le but d'usurper l'identité d'une autre personne.",
            "D'utiliser de fausses informations dans un but frauduleux.",
            "De créer plusieurs comptes pour contourner une sanction.",
            "D'utiliser PANU pour des activités illégales.",
          ],
        },
      ],
    },
    {
      title: "Article 4 – Responsabilité des publications",
      blocks: [
        "Chaque utilisateur reste responsable des contenus qu'il publie, transmet ou partage.",
        "L'utilisateur doit disposer des droits nécessaires pour publier ses photos, vidéos, musiques, textes et autres créations.",
        "Il ne doit pas publier de contenu portant atteinte aux droits d'autrui, à la vie privée, à la propriété intellectuelle ou à la dignité humaine.",
      ],
    },
    {
      title: "Article 5 – Utilisation des fonctionnalités",
      blocks: [
        "Les fonctionnalités de PANU peuvent évoluer.",
        "Certaines fonctions peuvent être gratuites, payantes, limitées ou temporairement indisponibles.",
        "Les fonctionnalités qui ne sont pas encore activées ne doivent pas être considérées comme des services disponibles.",
      ],
    },
    {
      title: "Article 6 – Suspension et fermeture de compte",
      blocks: [
        "ETS GREEN MATIA peut prendre des mesures proportionnées en cas de violation des présentes conditions, notamment :",
        {
          ul: [
            "Avertissement.",
            "Suppression ou restriction d'un contenu.",
            "Suspension temporaire.",
            "Désactivation de certaines fonctionnalités.",
            "Fermeture du compte dans les cas graves.",
          ],
        },
        "Lorsque cela est approprié, l'utilisateur sera informé du motif de la mesure et pourra demander un réexamen.",
      ],
    },
    {
      title: "Article 7 – Propriété intellectuelle",
      blocks: [
        "La marque PANU, son identité visuelle, son interface, ses éléments graphiques et ses éléments logiciels sont protégés conformément aux règles applicables.",
        "Les utilisateurs conservent leurs droits sur leurs propres créations.",
        "En publiant un contenu sur PANU, l'utilisateur accorde à la plateforme une autorisation non exclusive, mondiale et limitée à la durée nécessaire à l'exploitation du service, pour héberger, afficher, reproduire techniquement et distribuer ce contenu dans le cadre des fonctionnalités choisies par l'utilisateur.",
        "Cette autorisation ne constitue pas un transfert de propriété du contenu.",
      ],
    },
    {
      title: "Article 8 – Disponibilité du service",
      blocks: [
        "ETS GREEN MATIA s'efforce d'assurer le bon fonctionnement de PANU.",
        "Des interruptions peuvent survenir en raison de la maintenance, de problèmes techniques, de défaillances de prestataires ou d'événements indépendants de sa volonté.",
      ],
    },
    {
      title: "Article 9 – Modification des conditions",
      blocks: [
        "Les présentes conditions peuvent être modifiées pour tenir compte de l'évolution de PANU, des fonctionnalités et de la législation.",
        "La version actualisée sera accessible dans l'application.",
      ],
    },
    {
      title: "Article 10 – Droit applicable",
      blocks: [
        "Les présentes conditions sont régies par le droit applicable en République démocratique du Congo, notamment le Code du numérique, sous réserve des règles impératives applicables dans les autres pays où PANU sera proposé.",
      ],
    },
  ],
};

const CONFIDENTIALITE: LegalDocument = {
  id: "confidentialite",
  number: 2,
  title: "Politique de confidentialité et de protection des données",
  shortTitle: "Politique de confidentialité",
  path: "/confidentialite",
  description: "Comment ETS GREEN MATIA traite et protège les données personnelles des utilisateurs de PANU.",
  articles: [
    {
      title: "Article 1 – Engagement de confidentialité",
      blocks: [
        "ETS GREEN MATIA accorde une importance particulière à la protection des données personnelles des utilisateurs de PANU.",
        "La présente politique explique les catégories de données susceptibles d'être collectées, les raisons de leur utilisation et les droits des utilisateurs.",
      ],
    },
    {
      title: "Article 2 – Données susceptibles d'être collectées",
      blocks: [
        "Selon les fonctionnalités utilisées, PANU peut traiter :",
        "A. Informations de compte",
        {
          ul: [
            "Nom et prénom.",
            "Nom d'utilisateur.",
            "Adresse e-mail.",
            "Numéro de téléphone, lorsqu'il est fourni.",
            "Photo de profil et photo de couverture.",
          ],
        },
        "B. Informations de profil",
        {
          ul: [
            "Biographie.",
            "Ville et pays.",
            "Liens vers les réseaux sociaux.",
            "Informations professionnelles renseignées volontairement.",
          ],
        },
        "C. Contenus",
        {
          ul: [
            "Photos.",
            "Vidéos.",
            "Stories.",
            "Publications.",
            "Messages et commentaires.",
            "Contenus transmis au Studio IA.",
          ],
        },
        "D. Informations techniques",
        {
          ul: [
            "Type d'appareil.",
            "Système d'exploitation.",
            "Adresse IP, selon les traitements techniques.",
            "Journaux de connexion.",
            "Informations relatives aux erreurs et à la sécurité.",
          ],
        },
        "E. Informations commerciales",
        {
          ul: [
            "Type d'abonnement.",
            "Historique des transactions.",
            "Informations relatives aux cadeaux virtuels et à la monétisation, lorsque ces fonctionnalités sont activées.",
          ],
        },
        "Les informations bancaires complètes ne doivent pas être conservées par PANU si elles sont directement traitées par un prestataire de paiement.",
      ],
    },
    {
      title: "Article 3 – Finalités du traitement",
      blocks: [
        "Les données sont utilisées pour :",
        {
          ul: [
            "Créer et gérer les comptes.",
            "Permettre les publications et interactions.",
            "Faire fonctionner la messagerie et les lives.",
            "Personnaliser l'expérience utilisateur.",
            "Assurer la sécurité des comptes.",
            "Prévenir les fraudes et les abus.",
            "Fournir les fonctionnalités d'intelligence artificielle.",
            "Gérer les abonnements et les paiements.",
            "Répondre aux demandes d'assistance.",
            "Améliorer les performances et la qualité de PANU.",
          ],
        },
      ],
    },
    {
      title: "Article 4 – Intelligence artificielle et prestataires techniques",
      blocks: [
        "Certaines fonctionnalités de PANU peuvent utiliser des services externes d'intelligence artificielle, notamment des fournisseurs de génération d'images, de vidéos, de voix et de traitement du langage.",
        "Selon la fonctionnalité utilisée, certains contenus ou certaines informations peuvent être transmis à ces prestataires pour exécuter la demande de l'utilisateur.",
        "Les prestataires concernés peuvent notamment inclure des services comme OpenAI, Google Gemini, fal.ai et ElevenLabs, selon les intégrations effectivement activées.",
        "ETS GREEN MATIA doit encadrer ces traitements par des mesures contractuelles et techniques appropriées.",
        "Les données personnelles ne doivent pas être transmises à un prestataire pour une finalité incompatible avec celle annoncée à l'utilisateur.",
      ],
    },
    {
      title: "Article 5 – Partage des données",
      blocks: [
        "Les données peuvent être communiquées :",
        {
          ul: [
            "Aux prestataires techniques nécessaires au fonctionnement de PANU.",
            "Aux prestataires de paiement, lorsque l'utilisateur réalise une transaction.",
            "Aux autorités compétentes lorsque la loi l'exige.",
            "Aux personnes concernées par une interaction, selon les paramètres de confidentialité choisis par l'utilisateur.",
          ],
        },
        "ETS GREEN MATIA ne vend pas les données personnelles des utilisateurs à des tiers à des fins commerciales.",
      ],
    },
    {
      title: "Article 6 – Hébergement et transferts internationaux",
      blocks: [
        "Les données peuvent être hébergées ou traitées par des prestataires techniques situés dans différents pays.",
        "Ces traitements et transferts doivent respecter les exigences légales applicables en matière de protection des données personnelles, notamment les règles congolaises relatives à la localisation et au transfert des données.",
        "Les prestataires et lieux d'hébergement effectivement utilisés devront être identifiés avant publication définitive de cette politique.",
      ],
    },
    {
      title: "Article 7 – Durée de conservation",
      blocks: [
        "Les données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées.",
        "Les durées exactes doivent être définies selon les catégories de données :",
        {
          ul: [
            "Données de compte : pendant la durée d'activité du compte et la période nécessaire à sa fermeture.",
            "Contenus publiés : jusqu'à leur suppression par l'utilisateur ou leur retrait légitime.",
            "Journaux de sécurité : pendant une durée proportionnée aux besoins de sécurité.",
            "Données de transaction : pendant les délais légaux de conservation applicables.",
          ],
        },
      ],
    },
    {
      title: "Article 8 – Droits des utilisateurs",
      blocks: [
        "Sous réserve des conditions prévues par la loi, les utilisateurs peuvent demander :",
        {
          ul: [
            "L'accès à leurs données.",
            "La rectification de leurs informations.",
            "La suppression des données lorsque cela est légalement possible.",
            "L'opposition à certains traitements.",
            "La limitation de certains traitements.",
            "Des informations sur l'utilisation de leurs données.",
          ],
        },
        "Les demandes peuvent être adressées à :",
        "matia@gmail.com",
      ],
    },
    {
      title: "Article 9 – Sécurité",
      blocks: [
        "ETS GREEN MATIA met en œuvre des mesures techniques et organisationnelles destinées à protéger les informations contre les accès non autorisés, les pertes, les modifications et les divulgations illicites.",
      ],
    },
    {
      title: "Article 10 – Contact",
      blocks: [
        "Pour toute question relative à la confidentialité :",
        "ETS GREEN MATIA",
        "Emmanuel MATIA MBUNDU",
        "E-mail : matia@gmail.com",
        "Mbuji-Mayi, Kasaï-Oriental, RDC.",
      ],
    },
  ],
};

const COOKIES: LegalDocument = {
  id: "cookies",
  number: 3,
  title: "Politique relative aux cookies et technologies similaires",
  shortTitle: "Politique cookies",
  path: "/cookies",
  description: "Les cookies et technologies similaires utilisés par PANU et la gestion de vos préférences.",
  articles: [
    {
      title: "Article 1 – Définition",
      blocks: [
        "Les cookies et technologies similaires sont des mécanismes permettant de mémoriser certaines informations relatives à la navigation et à l'utilisation d'un service numérique.",
      ],
    },
    {
      title: "Article 2 – Utilisation sur PANU",
      blocks: [
        "PANU peut utiliser ces technologies pour :",
        {
          ul: [
            "Maintenir la session de connexion.",
            "Sécuriser les comptes.",
            "Mémoriser certaines préférences.",
            "Améliorer les performances.",
            "Comprendre l'utilisation générale de la plateforme.",
          ],
        },
      ],
    },
    {
      title: "Article 3 – Catégories",
      blocks: [
        "Cookies essentiels : nécessaires à la sécurité, à l'authentification et au fonctionnement du service.",
        "Cookies de préférence : permettent de mémoriser certains paramètres.",
        "Cookies analytiques : permettent d'étudier les performances et l'utilisation de PANU, lorsqu'ils sont activés.",
        "Cookies publicitaires : peuvent être utilisés pour mesurer ou personnaliser la publicité, uniquement si cette fonctionnalité est mise en place et conformément aux règles applicables.",
      ],
    },
    {
      title: "Article 4 – Consentement",
      blocks: [
        "Lorsque la loi l'exige, PANU demande le consentement de l'utilisateur avant d'utiliser les cookies non essentiels.",
        "L'utilisateur doit pouvoir modifier ses préférences et retirer son consentement.",
      ],
    },
    {
      title: "Article 5 – Gestion",
      blocks: [
        "L'utilisateur peut également gérer certains cookies depuis les paramètres de son navigateur.",
        "La désactivation de certains cookies essentiels peut empêcher le fonctionnement normal de certaines fonctionnalités.",
      ],
    },
    { title: "Article 6 – Contact", blocks: ["Pour toute question :", "matia@gmail.com"] },
  ],
};

const COMMUNAUTE: LegalDocument = {
  id: "communaute",
  number: 4,
  title: "Règles communautaires et politique de modération",
  shortTitle: "Règles communautaires",
  path: "/regles-communaute",
  description: "Les règles de la communauté PANU, les contenus interdits, le signalement et les sanctions.",
  articles: [
    {
      title: "Article 1 – Notre vision",
      blocks: [
        "PANU souhaite créer un environnement numérique respectueux, créatif, sécurisé et favorable à l'expression des talents, notamment africains.",
        "Chaque utilisateur doit contribuer à maintenir une communauté saine.",
      ],
    },
    {
      title: "Article 2 – Contenus interdits",
      blocks: [
        "Il est interdit de publier ou de diffuser :",
        {
          ol: [
            "Des contenus faisant la promotion de la violence ou du terrorisme.",
            "Des menaces et appels à la haine.",
            "Du harcèlement et de l'intimidation.",
            "Des contenus sexuels illégaux ou des contenus exploitant des mineurs.",
            "Des images ou vidéos intimes diffusées sans autorisation.",
            "Des escroqueries et tentatives de fraude.",
            "Des usurpations d'identité.",
            "Des contenus portant atteinte aux droits d'auteur.",
            "Des informations personnelles d'autrui publiées sans autorisation.",
            "Des contenus manifestement illégaux ou dangereux.",
          ],
        },
        "La désinformation frauduleuse et les manipulations visant à porter préjudice à autrui peuvent également faire l'objet de mesures de modération.",
      ],
    },
    {
      title: "Article 3 – Respect des utilisateurs",
      blocks: [
        "Les utilisateurs doivent respecter les autres membres, indépendamment de leur origine, nationalité, situation sociale ou opinion.",
        "Les insultes répétées, menaces, discriminations et comportements abusifs peuvent entraîner des sanctions.",
      ],
    },
    {
      title: "Article 4 – Protection des mineurs",
      blocks: [
        "Les contenus dangereux ou inappropriés pour les mineurs sont interdits.",
        "Les mesures d'âge, de contrôle parental et de protection des mineurs doivent être appliquées selon les exigences légales et les fonctionnalités effectivement disponibles sur PANU.",
      ],
    },
    {
      title: "Article 5 – Signalement",
      blocks: [
        "Chaque utilisateur doit pouvoir signaler un contenu, un profil, un commentaire ou un comportement abusif.",
        "Le signalement doit permettre de préciser le motif de la plainte.",
        "Les signalements sont examinés selon leur gravité et les moyens de modération disponibles.",
      ],
    },
    {
      title: "Article 6 – Sanctions",
      blocks: [
        "Selon la gravité de la violation, PANU peut :",
        {
          ul: [
            "Retirer le contenu.",
            "Limiter sa visibilité.",
            "Suspendre certaines fonctions.",
            "Envoyer un avertissement.",
            "Suspendre temporairement le compte.",
            "Fermer définitivement le compte dans les cas graves.",
          ],
        },
      ],
    },
    {
      title: "Article 7 – Contestation",
      blocks: [
        "L'utilisateur concerné peut demander le réexamen d'une décision de modération par le canal d'assistance disponible.",
      ],
    },
    {
      title: "Article 8 – Responsabilité des créateurs",
      blocks: [
        "Les créateurs restent responsables des contenus qu'ils publient et des droits qu'ils détiennent sur ces contenus.",
        "Les créateurs ne doivent pas utiliser PANU pour escroquer les autres utilisateurs ou leur proposer des activités illégales.",
      ],
    },
    { title: "Article 9 – Contact", blocks: ["Pour signaler un abus ou demander une assistance :", "matia@gmail.com"] },
  ],
};

const ABONNEMENTS: LegalDocument = {
  id: "abonnements",
  number: 5,
  title: "Conditions d'abonnement, de paiement et de monétisation",
  shortTitle: "Conditions d'abonnement",
  path: "/conditions-abonnement",
  description: "Les conditions des formules Free, Premium et Pro, des paiements et de la monétisation sur PANU.",
  articles: [
    {
      title: "Article 1 – Présentation",
      blocks: [
        "PANU peut proposer plusieurs niveaux d'accès aux fonctionnalités :",
        { ul: ["Free.", "Premium.", "Pro."] },
        "Les fonctionnalités disponibles dans chaque formule sont présentées dans l'application avant toute souscription.",
      ],
    },
    {
      title: "Article 2 – Formule Free",
      blocks: [
        "La formule Free permet d'accéder aux fonctionnalités gratuites de PANU, dans les limites éventuellement indiquées dans l'application.",
      ],
    },
    {
      title: "Article 3 – Formule Premium",
      blocks: [
        "La formule Premium peut donner accès à des fonctionnalités supplémentaires, notamment certaines capacités avancées de création, de publication ou d'utilisation du Studio IA.",
        "Les avantages exacts sont affichés avant l'achat.",
      ],
    },
    {
      title: "Article 4 – Formule Pro",
      blocks: [
        "La formule Pro peut proposer des outils supplémentaires destinés aux créateurs, entrepreneurs et utilisateurs ayant des besoins avancés.",
        "Les avantages exacts doivent être détaillés dans l'application.",
      ],
    },
    {
      title: "Article 5 – Prix et facturation",
      blocks: [
        "Avant chaque souscription, PANU doit afficher clairement :",
        {
          ul: [
            "Le prix.",
            "La devise.",
            "La durée de l'abonnement.",
            "La fréquence de facturation.",
            "Les éventuelles taxes.",
            "Les conditions de renouvellement.",
            "Les modalités de résiliation.",
          ],
        },
        "Aucun montant ne doit être prélevé sans autorisation valable de l'utilisateur.",
      ],
    },
    {
      title: "Article 6 – Renouvellement et résiliation",
      blocks: [
        "Lorsque les abonnements sont renouvelés automatiquement, cette information doit être clairement affichée avant l'achat.",
        "L'utilisateur doit pouvoir connaître les étapes de résiliation et la date de fin de son accès payant.",
      ],
    },
    {
      title: "Article 7 – Remboursements",
      blocks: [
        "Les demandes de remboursement sont examinées conformément aux conditions du prestataire de paiement, aux règles de la boutique d'applications concernée et aux dispositions légales applicables.",
        "Les droits impératifs des consommateurs restent applicables.",
      ],
    },
    {
      title: "Article 8 – Cadeaux virtuels et revenus des créateurs",
      blocks: [
        "Si PANU active un système de cadeaux virtuels ou de rémunération des créateurs, l'application doit présenter les règles correspondantes.",
        "Ces règles doivent préciser :",
        {
          ul: [
            "Le prix des crédits ou cadeaux.",
            "La valeur attribuée aux créateurs.",
            "Les commissions éventuelles.",
            "Les seuils de retrait.",
            "Les méthodes de paiement disponibles.",
            "Les délais de traitement.",
            "Les conditions de vérification d'identité, si nécessaires.",
          ],
        },
        "Les cadeaux virtuels ne doivent pas être présentés comme de l'argent retirable lorsqu'ils ne le sont pas.",
      ],
    },
    {
      title: "Article 9 – Sécurité des paiements",
      blocks: [
        "Les paiements sont traités par les prestataires de paiement effectivement intégrés à PANU.",
        "Les informations bancaires sensibles doivent être protégées et ne doivent pas être exposées dans l'application.",
      ],
    },
    {
      title: "Article 10 – Assistance",
      blocks: [
        "Toute question concernant un abonnement, un paiement ou une transaction peut être adressée à :",
        "matia@gmail.com",
      ],
    },
  ],
};

const IA: LegalDocument = {
  id: "ia",
  number: 6,
  title: "Politique d'utilisation de l'intelligence artificielle",
  shortTitle: "Politique IA",
  path: "/politique-ia",
  description: "Les règles d'utilisation du Studio IA de PANU et la responsabilité des utilisateurs.",
  incomplete: true,
  articles: [
    {
      title: "Article 1 – Présentation du Studio IA",
      blocks: [
        "Le Studio IA de PANU propose ou pourra proposer des outils permettant de créer, transformer et améliorer des contenus à l'aide de technologies d'intelligence artificielle.",
        "Ces outils peuvent notamment concerner :",
        {
          ul: [
            "La génération d'images.",
            "La génération de vidéos.",
            "La création de sons et de voix.",
            "L'assistance à la rédaction.",
            "L'analyse de photos.",
            "L'assistance conversationnelle.",
            "La modification et l'amélioration de contenus.",
          ],
        },
      ],
    },
    {
      title: "Article 2 – Responsabilité de l'utilisateur",
      blocks: [
        "L'utilisateur reste responsable de ses demandes et de l'utilisation des résultats générés par l'intelligence artificielle.",
        "Il s'engage à ne pas demander la création de contenus destinés à :",
        {
          ul: [
            "Usurper l'identité d'une personne.",
            "Fabriquer des preuves ou documents frauduleux.",
            "Harceler ou menacer une personne.",
            "Exploiter sexuellement des mineurs.",
            "Diffuser des images intimes sans consentement.",
            "Faciliter une activité criminelle.",
            "Porter atteinte aux droits d'autrui.",
          ],
        },
      ],
    },
    {
      title: "Article 3 – Contenus générés",
      blocks: [
        "Les contenus générés par IA peuvent comporter des erreurs, des imperfections ou des informations inexactes.",
        "Ils ne constituent pas nécessairement des informations vérifiées.",
        "L'utilisateur doit vérifier les résultats avant leur publication ou leur utilisation professionnelle.",
      ],
    },
    {
      title: "Article 4 – Protection des images et des voix",
      blocks: [
        "Il est interdit d'utiliser les outils IA pour reproduire la voix, l'image ou l'identité d'une personne d'une manière trompeuse, abusive ou non autorisée.",
        "L'utilisateur doit disposer des autorisations nécessaires lorsqu'il utilise l'image ou la voix d'une autre personne.",
      ],
    },
    {
      title: "Article 5 – Traitement des demandes IA",
      blocks: [
        "Certaines demandes peuvent être transmises à des fournisseurs externes afin de générer les résultats demandés.",
        "Les informations relatives aux prestataires et aux transferts de données sont présentées dans la politique de confidentialité.",
        "Les utilisateurs doivent éviter de transmettre des informations sensibles qui ne sont pas nécessaires à leur demande.",
      ],
    },
    {
      title: "Article 6 – Disponibilité et limites",
      blocks: [
        "Les outils d'intelligence artificielle peuvent connaître des limitations techniques, des restrictions d'utilisation ou des interruptions.",
        "Les résultats générés ne sont pas garantis comme étant uniques, exacts ou exempts de droits appartenant à des tiers.",
      ],
    },
    {
      title: "Article 7 – Utilisation commerciale",
      blocks: [
        "L'utilisation commerciale des contenus générés dépend des conditions des fournisseurs technologiques concernés et des droits applicables.",
        "PANU ne garantit pas automatiquement que chaque contenu généré puisse être utilisé commercialement sans restriction.",
      ],
    },
    {
      title: "Article 8 – Modération IA",
      blocks: [
        "PANU peut appliquer des mécanismes de contrôle afin de détecter et limiter les demandes ou contenus contraires aux règles de la plateforme.",
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [CGU, CONFIDENTIALITE, COOKIES, COMMUNAUTE, ABONNEMENTS, IA];

export function legalDocument(id: LegalDocumentId): LegalDocument {
  return LEGAL_DOCUMENTS.find((d) => d.id === id)!;
}
