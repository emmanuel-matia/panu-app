package com.example.data.remote

import com.example.data.model.Content
import org.json.JSONArray
import org.json.JSONObject

class SupabaseContentService(private val client: SupabaseClient) {

    suspend fun getContents(): List<Content> {
        val response = client.execute(endpoint = "/rest/v1/contents", method = "GET")
        // Parsing simplifié de la réponse JSON en liste de Content
        return emptyList() // À compléter avec le parsing réel
    }

    suspend fun toggleFavorite(userId: String, contentId: String, isFavorite: Boolean) {
        // Implémentation utilisant client.execute...
    }

    suspend fun saveHistory(userId: String, contentId: String, position: Int) {
        // Implémentation utilisant client.execute...
    }
}
