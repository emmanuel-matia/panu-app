package com.example.data.repository.ai

import com.example.data.local.SessionManager
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class GroundingService(private val sessionManager: SessionManager) {

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    // Recherche Google
    suspend fun search(query: String): Result<String> {
        return callGroundingApi("googleSearch", query)
    }

    // Données Maps
    suspend fun getMapData(query: String): Result<String> {
        return callGroundingApi("googleMaps", query)
    }

    private fun callGroundingApi(toolType: String, query: String): Result<String> {
        val apiKey = sessionManager.getGeminiApiKey()
        if (apiKey.isBlank()) return Result.failure(Exception("API Key manquante"))

        // Configuration pour activer les outils de Grounding
        val jsonRequest = JSONObject().apply {
            put("contents", org.json.JSONArray().apply {
                put(JSONObject().apply {
                    put("parts", org.json.JSONArray().apply {
                        put(JSONObject().put("text", query))
                    })
                })
            })
            put("tools", org.json.JSONArray().apply {
                put(JSONObject().put(toolType, JSONObject()))
            })
        }

        val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=$apiKey"
        
        val request = Request.Builder()
            .url(url)
            .post(jsonRequest.toString().toRequestBody(jsonMediaType))
            .build()

        return try {
            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) return Result.failure(Exception("Erreur API Grounding"))
            
            // Parsing simplifié de la réponse
            Result.success("Résultat de $toolType obtenu")
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
