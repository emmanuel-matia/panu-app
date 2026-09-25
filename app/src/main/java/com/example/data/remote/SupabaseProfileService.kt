package com.example.data.remote

import com.example.data.model.SocialLinks
import com.example.data.model.UserProfile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class SupabaseProfileService(private val client: SupabaseClient) {

    suspend fun getProfile(userId: String): Result<UserProfile?> = withContext(Dispatchers.IO) {
        val endpoint = "/rest/v1/profiles?id=eq.$userId&select=*"
        when (val response = client.execute(endpoint)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray()
                if (array != null && array.length() > 0) {
                    val obj = array.getJSONObject(0)
                    Result.success(parseProfile(obj))
                } else {
                    Result.success(null)
                }
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun getProfileByUsername(username: String): Result<UserProfile?> = withContext(Dispatchers.IO) {
        val clean = username.removePrefix("@").trim()
        val endpoint = "/rest/v1/profiles?username=eq.$clean&select=*"
        when (val response = client.execute(endpoint)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray()
                if (array != null && array.length() > 0) {
                    val obj = array.getJSONObject(0)
                    Result.success(parseProfile(obj))
                } else {
                    Result.success(null)
                }
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun upsertProfile(profile: UserProfile): Result<UserProfile> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("id", profile.id)
            profile.email?.let { put("email", it) }
            profile.fullName?.let { put("full_name", it) }
            profile.username?.let { put("username", it) }
            profile.bio?.let { put("bio", it) }
            profile.avatarUrl?.let { put("avatar_url", it) }
            profile.location?.let { put("location", it) }
            profile.category?.let { put("category", it) }
            profile.role?.let { put("role", it) }
            profile.themePreference?.let { put("theme_preference", it) }
        }

        val endpoint = "/rest/v1/profiles"
        val headers = mapOf("Prefer" to "resolution=merge-duplicates,return=representation")
        when (val response = client.execute(endpoint, method = "POST", jsonBody = payload.toString(), headers = headers)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray()
                if (array != null && array.length() > 0) {
                    Result.success(parseProfile(array.getJSONObject(0)))
                } else {
                    Result.success(profile)
                }
            }
            is SupabaseResponse.Error -> updateProfile(profile)
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun updateProfile(profile: UserProfile): Result<UserProfile> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            profile.fullName?.let { put("full_name", it) }
            profile.username?.let { put("username", it) }
            profile.bio?.let { put("bio", it) }
            profile.avatarUrl?.let { put("avatar_url", it) }
            profile.location?.let { put("location", it) }
            profile.category?.let { put("category", it) }
            profile.themePreference?.let { put("theme_preference", it) }
        }

        val endpoint = "/rest/v1/profiles?id=eq.${profile.id}"
        val headers = mapOf("Prefer" to "return=representation")
        when (val response = client.execute(endpoint, method = "PATCH", jsonBody = payload.toString(), headers = headers)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray()
                if (array != null && array.length() > 0) {
                    Result.success(parseProfile(array.getJSONObject(0)))
                } else {
                    Result.success(profile)
                }
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun updateThemePreference(userId: String, theme: String): Result<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("theme_preference", theme)
        }
        val endpoint = "/rest/v1/profiles?id=eq.$userId"
        when (val response = client.execute(endpoint, method = "PATCH", jsonBody = payload.toString())) {
            is SupabaseResponse.Success -> Result.success(Unit)
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun getSocialLinks(userId: String): Result<SocialLinks?> = withContext(Dispatchers.IO) {
        val endpoint = "/rest/v1/social_links?user_id=eq.$userId&select=*"
        when (val response = client.execute(endpoint)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray()
                if (array != null && array.length() > 0) {
                    val linksMap = mutableMapOf<String, String>()
                    for (i in 0 until array.length()) {
                        val row = array.getJSONObject(i)
                        val platform = row.optString("platform")
                        val url = row.optString("url")
                        if (platform.isNotBlank() && url.isNotBlank()) {
                            linksMap[platform.lowercase()] = url
                        }
                    }
                    Result.success(
                        SocialLinks(
                            userId = userId,
                            facebook = linksMap["facebook"],
                            youtube = linksMap["youtube"],
                            tiktok = linksMap["tiktok"],
                            instagram = linksMap["instagram"],
                            x = linksMap["x"],
                            whatsapp = linksMap["whatsapp"],
                            website = linksMap["website"]
                        )
                    )
                } else {
                    Result.success(null)
                }
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun saveSocialLinks(userId: String, links: SocialLinks): Result<Unit> = withContext(Dispatchers.IO) {
        val platforms = listOf(
            "facebook" to links.facebook,
            "youtube" to links.youtube,
            "tiktok" to links.tiktok,
            "instagram" to links.instagram,
            "x" to links.x,
            "whatsapp" to links.whatsapp,
            "website" to links.website
        )

        // Delete existing links then batch insert
        val delEndpoint = "/rest/v1/social_links?user_id=eq.$userId"
        client.execute(delEndpoint, method = "DELETE")

        val array = JSONArray()
        for ((p, url) in platforms) {
            if (!url.isNullOrBlank()) {
                val item = JSONObject().apply {
                    put("user_id", userId)
                    put("platform", p)
                    put("url", url.trim())
                }
                array.put(item)
            }
        }

        if (array.length() > 0) {
            val endpoint = "/rest/v1/social_links"
            val headers = mapOf("Prefer" to "resolution=merge-duplicates")
            val resp = client.execute(endpoint, method = "POST", jsonBody = array.toString(), headers = headers)
            if (resp is SupabaseResponse.Error) {
                return@withContext Result.failure(Exception(resp.message))
            }
        }
        Result.success(Unit)
    }

    suspend fun autoFollowFounder(userId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val founderQuery = "/rest/v1/profiles?email=eq.emmanuelmatia150@gmail.com&select=id"
            when (val resp = client.execute(founderQuery)) {
                is SupabaseResponse.Success -> {
                    val array = resp.asJsonArray()
                    if (array != null && array.length() > 0) {
                        val founderId = array.getJSONObject(0).optString("id")
                        if (founderId.isNotBlank() && founderId != userId) {
                            val payload = JSONObject().apply {
                                put("follower_id", userId)
                                put("following_id", founderId)
                            }
                            val headers = mapOf("Prefer" to "resolution=ignore-duplicates")
                            client.execute("/rest/v1/follows", method = "POST", jsonBody = payload.toString(), headers = headers)
                        }
                    }
                    Result.success(Unit)
                }
                else -> Result.success(Unit)
            }
        } catch (_: Exception) {
            Result.success(Unit)
        }
    }

    private fun parseProfile(obj: JSONObject): UserProfile {
        return UserProfile(
            id = obj.optString("id"),
            email = obj.optString("email").takeIf { it.isNotBlank() },
            username = obj.optString("username").takeIf { it.isNotBlank() },
            fullName = obj.optString("full_name").takeIf { it.isNotBlank() },
            bio = obj.optString("bio").takeIf { it.isNotBlank() },
            avatarUrl = obj.optString("avatar_url").takeIf { it.isNotBlank() },
            location = obj.optString("location").takeIf { it.isNotBlank() },
            category = obj.optString("category", "Créateur de contenu"),
            role = obj.optString("role", "user"),
            themePreference = obj.optString("theme_preference").takeIf { it.isNotBlank() },
            createdAt = obj.optString("created_at").takeIf { it.isNotBlank() },
            updatedAt = obj.optString("updated_at").takeIf { it.isNotBlank() }
        )
    }
}
