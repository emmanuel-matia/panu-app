package com.example.data.repository.ai

import com.example.data.local.SessionManager
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class CreativeMediaService(private val sessionManager: SessionManager) {

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    // Génération d'image (Nano)
    suspend fun generateImage(prompt: String): Result<String> {
        return callMediaApi("gemini-3.1-flash-image-preview", mapOf("prompt" to prompt))
    }

    // Génération vidéo (Veo)
    suspend fun generateVideo(prompt: String, isImageToVideo: Boolean = false): Result<String> {
        val model = "veo-3.1-fast-generate-preview"
        val params = mutableMapOf("prompt" to prompt, "aspect_ratio" to "16:9")
        return callMediaApi(model, params)
    }

    // Génération musique (Lyria)
    suspend fun generateMusic(prompt: String): Result<String> {
        return callMediaApi("lyria-3-clip-preview", mapOf("prompt" to prompt))
    }

    private fun callMediaApi(model: String, params: Map<String, Any>): Result<String> {
        val apiKey = sessionManager.getGeminiApiKey()
        if (apiKey.isBlank()) return Result.failure(Exception("API Key manquante"))

        val jsonRequest = JSONObject(params).toString()
        val url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey"
        
        val request = Request.Builder()
            .url(url)
            .post(jsonRequest.toRequestBody(jsonMediaType))
            .build()

        return try {
            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) return Result.failure(Exception("Erreur API Media"))
            
            // Logique de parsing simplifiée (à adapter selon la réponse réelle de l'API)
            Result.success("Contenu généré avec succès")
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
