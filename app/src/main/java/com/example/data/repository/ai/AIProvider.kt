package com.example.data.repository.ai

/**
 * Catégories supportées par le studio créatif PANU
 */
enum class AICreativeCategory(val id: String, val label: String, val iconDescription: String) {
    SCRIPT("script", "Script", "Écriture de scripts pour TikTok, Reels, Publicités"),
    IMAGE("image", "Image", "Création et transformation d'affiches publicitaires"),
    VIDEO("video", "Vidéo", "Scénarisation et vidéo courte pour entreprises"),
    VOICE("voice", "Voix", "Synthèse vocale et voix off pour créateurs"),
    PUBLICATION("publication", "Publication", "Posts percutants pour réseaux sociaux")
}

/**
 * Couche abstraite découplée pour les moteurs et fournisseurs d'Intelligence Artificielle.
 * Permet de brancher ultérieurement n'importe quel provider (Provider A, Provider B, etc.)
 * sans modifier le frontend ni créer de dépendance rigide.
 */
interface AIProvider {
    val providerId: String
    val providerName: String
    val isConnected: Boolean

    suspend fun generateCreativeContent(
        category: AICreativeCategory,
        prompt: String,
        options: Map<String, Any> = emptyMap()
    ): Result<AIGeneratedResult>
}

data class AIGeneratedResult(
    val content: String,
    val mediaUrl: String? = null,
    val creditsUsed: Int = 1,
    val metadata: Map<String, String> = emptyMap()
)

/**
 * Implémentation de base V1 conforme à la règle :
 * "Ne simuler aucune génération IA. Si aucun fournisseur IA n'est encore connecté,
 * afficher clairement : 'Le moteur IA sera connecté prochainement.'"
 */
class DefaultPendingAIProvider : AIProvider {
    override val providerId: String = "pending"
    override val providerName: String = "PANU Engine (Prochainement)"
    override val isConnected: Boolean = false

    override suspend fun generateCreativeContent(
        category: AICreativeCategory,
        prompt: String,
        options: Map<String, Any>
    ): Result<AIGeneratedResult> {
        return Result.failure(
            IllegalStateException("Le moteur IA sera connecté prochainement. Aucune simulation artificielle n'est effectuée.")
        )
    }
}
