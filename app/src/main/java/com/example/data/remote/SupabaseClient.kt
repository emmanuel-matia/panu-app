package com.example.data.remote

import com.example.data.local.SessionManager
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class SupabaseClient(private val sessionManager: SessionManager) {

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    val currentUrl: String
        get() {
            var raw = sessionManager.supabaseUrl.value.trim()
            if (raw.isBlank()) return ""
            if (raw.startsWith("http://")) {
                raw = "https://" + raw.removePrefix("http://")
            } else if (!raw.startsWith("https://")) {
                raw = "https://$raw"
            }
            return raw.removeSuffix("/")
        }

    val currentAnonKey: String get() = sessionManager.supabaseAnonKey.value.trim()

    val isConfigured: Boolean
        get() = currentUrl.isNotBlank() &&
                !currentUrl.contains("your-project.supabase.co") &&
                currentAnonKey.isNotBlank() &&
                !currentAnonKey.contains("placeholder") &&
                !currentAnonKey.contains("your-anon-key")

    private fun buildRequest(
        endpoint: String,
        method: String,
        body: RequestBody? = null,
        extraHeaders: Map<String, String> = emptyMap()
    ): Request {
        val cleanEndpoint = if (endpoint.startsWith("/")) endpoint else "/$endpoint"
        val fullUrl = if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
            if (endpoint.startsWith("http://")) "https://" + endpoint.removePrefix("http://") else endpoint
        } else {
            "$currentUrl$cleanEndpoint"
        }
        val builder = Request.Builder()
            .url(fullUrl)
            .addHeader("apikey", currentAnonKey)

        val token = sessionManager.getAuthToken()
        if (!token.isNullOrBlank()) {
            builder.addHeader("Authorization", "Bearer $token")
        } else {
            builder.addHeader("Authorization", "Bearer $currentAnonKey")
        }

        extraHeaders.forEach { (k, v) -> builder.addHeader(k, v) }

        when (method.uppercase()) {
            "GET" -> builder.get()
            "POST" -> builder.post(body ?: "".toRequestBody(jsonMediaType))
            "PUT" -> builder.put(body ?: "".toRequestBody(jsonMediaType))
            "PATCH" -> builder.patch(body ?: "".toRequestBody(jsonMediaType))
            "DELETE" -> builder.delete(body)
        }

        return builder.build()
    }

    suspend fun execute(
        endpoint: String,
        method: String = "GET",
        jsonBody: String? = null,
        headers: Map<String, String> = emptyMap()
    ): SupabaseResponse {
        val body = jsonBody?.toRequestBody(jsonMediaType)
        val request = buildRequest(endpoint, method, body, headers)

        return try {
            val response: Response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""
            if (response.isSuccessful) {
                SupabaseResponse.Success(response.code, responseBody)
            } else {
                SupabaseResponse.Error(response.code, parseErrorMessage(responseBody, response.code))
            }
        } catch (e: java.net.UnknownHostException) {
            SupabaseResponse.NetworkError("Hôte introuvable : vérifiez l'URL Supabase (${e.localizedMessage})")
        } catch (e: java.net.ConnectException) {
            SupabaseResponse.NetworkError("Connexion refusée : impossible d'atteindre Supabase (${e.localizedMessage})")
        } catch (e: java.net.SocketTimeoutException) {
            SupabaseResponse.NetworkError("Délai de connexion dépassé (timeout)")
        } catch (e: IOException) {
            SupabaseResponse.NetworkError("Erreur réseau : ${e.localizedMessage}")
        } catch (e: Exception) {
            SupabaseResponse.Error(500, "Erreur inattendue : ${e.localizedMessage}")
        }
    }

    private fun parseErrorMessage(body: String, code: Int): String {
        return try {
            val json = JSONObject(body)
            when {
                json.has("error_description") && json.getString("error_description").isNotBlank() ->
                    json.getString("error_description")
                json.has("msg") && json.getString("msg").isNotBlank() ->
                    json.getString("msg")
                json.has("message") && json.getString("message").isNotBlank() ->
                    json.getString("message")
                json.has("error") && json.getString("error").isNotBlank() ->
                    json.getString("error")
                json.has("hint") && json.getString("hint").isNotBlank() ->
                    "${json.optString("message", "Erreur")}: ${json.getString("hint")}"
                else -> if (body.isNotBlank()) body.take(250) else "Erreur HTTP $code"
            }
        } catch (e: Exception) {
            if (body.isNotBlank()) body.take(250) else "Erreur serveur ($code)"
        }
    }
}

sealed class SupabaseResponse {
    data class Success(val code: Int, val body: String) : SupabaseResponse() {
        fun asJsonObject(): JSONObject? = try { JSONObject(body) } catch (e: Exception) { null }
        fun asJsonArray(): JSONArray? = try { JSONArray(body) } catch (e: Exception) { null }
    }
    data class Error(val code: Int, val message: String) : SupabaseResponse()
    data class NetworkError(val message: String) : SupabaseResponse()
}
