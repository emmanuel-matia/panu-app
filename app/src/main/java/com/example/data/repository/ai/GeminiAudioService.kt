package com.example.data.repository.ai

import android.util.Base64
import com.example.data.local.SessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class GeminiAudioService(private val sessionManager: SessionManager) {

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    suspend fun transcribeAudio(audioData: ByteArray): Result<String> = withContext(Dispatchers.IO) {
        val apiKey = sessionManager.getGeminiApiKey()
        if (apiKey.isBlank()) return@withContext Result.failure(Exception("API Key manquante"))

        val base64Audio = Base64.encodeToString(audioData, Base64.NO_WRAP)
        
        // Structure de la requête pour le modèle de transcription Gemini
        val jsonRequest = JSONObject().apply {
            put("contents", JSONObject().apply {
                put("parts", org.json.JSONArray().apply {
                    put(JSONObject().apply {
                        put("inline_data", JSONObject().apply {
                            put("mime_type", "audio/wav")
                            put("data", base64Audio)
                        })
                    })
                })
            })
        }

        val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey"
        val request = Request.Builder()
            .url(url)
            .post(jsonRequest.toString().toRequestBody(jsonMediaType))
            .build()

        try {
            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) return@withContext Result.failure(Exception("Erreur API"))
            
            val body = response.body?.string() ?: ""
            // Parsing simplifié de la réponse pour extraire le texte
            val text = JSONObject(body).getJSONArray("candidates").getJSONObject(0)
                .getJSONObject("content").getJSONArray("parts").getJSONObject(0).getString("text")
            
            Result.success(text)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
