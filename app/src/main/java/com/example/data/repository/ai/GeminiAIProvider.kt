package com.example.data.repository.ai

import com.example.data.local.SessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class GeminiAIProvider(
    private val sessionManager: SessionManager
) : AIProvider {

    override val providerId: String = "gemini"
    override val providerName: String = "Google Gemini (PANU Creative Engine)"

    override val isConnected: Boolean
        get() = sessionManager.getGeminiApiKey().isNotBlank()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    override suspend fun generateCreativeContent(
        category: AICreativeCategory,
        prompt: String,
        options: Map<String, Any>
    ): Result<AIGeneratedResult> = withContext(Dispatchers.IO) {
        val apiKey = sessionManager.getGeminiApiKey()
        if (apiKey.isBlank()) {
            return@withContext Result.failure(
                IllegalStateException(
                    "Clé API Gemini non configurée.\n" +
                    "Veuillez renseigner votre clé API dans les Paramètres (section Configuration IA) ou via le panneau Secrets AI Studio."
                )
            )
        }

        val systemInstruction = when (category) {
            AICreativeCategory.SCRIPT ->
                "Tu es le moteur créatif d'intelligence artificielle de PANU, le studio conçu pour les créateurs africains et panafricains. " +
                "Rédige un script percutant, captivant et professionnel, adapté au format demandé (TikTok, Reel, pub ou YouTube Shorts). " +
                "Inclus : 1) Accroche (Hook 0-3s), 2) Développement/Histoire captivante, 3) Appel à l'action clair (CTA). " +
                "Adapte le ton aux réalités créatives et culturelles demandées."

            AICreativeCategory.IMAGE ->
                "Tu es le directeur artistique de PANU Studio Créatif. " +
                "À partir de la demande utilisateur, élabore une direction visuelle complète et un prompt ultra-détaillé pour affiche publicitaire ou art visuel. " +
                "Détaille : 1) Composition et cadrage, 2) Ambiance lumineuse et textures, 3) Palette de couleurs (tons chauds, or, terre, contrastes), " +
                "4) Typographie recommandée, 5) Description complète de la scène finale."

            AICreativeCategory.VIDEO ->
                "Tu es le réalisateur vidéo de PANU. " +
                "Conçois un storyboard complet scène par scène pour une vidéo courte : " +
                "[Scène 1 : 0-3s Accroche visuelle + Dialogue] " +
                "[Scène 2 : 3-10s Problématique / Contexte] " +
                "[Scène 3 : 10-25s Solution / Démonstration] " +
                "[Scène 4 : 25-30s Conclusion & Appel à l'action]. " +
                "Précise les plans de caméra, actions des acteurs et voix off."

            AICreativeCategory.VOICE ->
                "Tu es l'ingénieur du son et coach vocal de PANU. " +
                "Rédige le script vocal de narration avec annotations précises : " +
                "Indique les intonations (chaleureuse, solennelle, dynamique, complice), " +
                "les respirations et pauses avec [Pause 1s], et les effets sonores ou musiques avec [Ambiance sonore : ...]."

            AICreativeCategory.PUBLICATION ->
                "Tu es le copywriter éditorial de PANU. " +
                "Rédige un post percutant pour réseaux sociaux (LinkedIn, Instagram, Facebook ou X). " +
                "Structure le post avec une première ligne choc, des paragraphes aérés, des points clés et des hashtags pertinents."
        }

        val fullPrompt = "$systemInstruction\n\nDemande de l'utilisateur : $prompt"

        val requestJson = JSONObject().apply {
            val contentsArray = JSONArray().apply {
                val contentObj = JSONObject().apply {
                    val partsArray = JSONArray().apply {
                        val partObj = JSONObject().apply {
                            put("text", fullPrompt)
                        }
                        put(partObj)
                    }
                    put("parts", partsArray)
                }
                put(contentObj)
            }
            put("contents", contentsArray)

            val genConfig = JSONObject().apply {
                put("temperature", 0.7)
                put("maxOutputTokens", 2048)
            }
            put("generationConfig", genConfig)
        }

        // Use supported model per gemini-api skill: gemini-2.5-flash
        val model = "gemini-2.5-flash"
        val endpoint = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey"

        val request = Request.Builder()
            .url(endpoint)
            .post(requestJson.toString().toRequestBody(jsonMediaType))
            .build()

        try {
            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            if (!response.isSuccessful) {
                val errorDetails = try {
                    val errJson = JSONObject(responseBody)
                    val errObj = errJson.optJSONObject("error")
                    errObj?.optString("message") ?: responseBody
                } catch (_: Exception) {
                    responseBody
                }
                return@withContext Result.failure(
                    Exception("Erreur API Gemini (${response.code}) : $errorDetails")
                )
            }

            val json = JSONObject(responseBody)
            val candidates = json.optJSONArray("candidates")
            if (candidates == null || candidates.length() == 0) {
                return@withContext Result.failure(Exception("Aucun contenu généré par l'IA."))
            }

            val firstCandidate = candidates.getJSONObject(0)
            val contentObj = firstCandidate.optJSONObject("content")
            val parts = contentObj?.optJSONArray("parts")
            val generatedText = if (parts != null && parts.length() > 0) {
                parts.getJSONObject(0).optString("text", "")
            } else ""

            if (generatedText.isBlank()) {
                return@withContext Result.failure(Exception("Réponse vide de l'IA."))
            }

            Result.success(
                AIGeneratedResult(
                    content = generatedText,
                    creditsUsed = 1,
                    metadata = mapOf(
                        "model" to model,
                        "category" to category.id,
                        "timestamp" to System.currentTimeMillis().toString()
                    )
                )
            )
        } catch (e: IOException) {
            Result.failure(Exception("Erreur réseau lors de la communication avec Gemini : ${e.localizedMessage}"))
        } catch (e: Exception) {
            Result.failure(Exception("Erreur inattendue : ${e.localizedMessage}"))
        }
    }
}
