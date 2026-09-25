package com.example.data.remote

import com.example.data.model.UserProfile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

data class FounderAIGeneration(
    val id: String,
    val userId: String,
    val category: String,
    val prompt: String,
    val status: String,
    val creditsConsumed: Int,
    val createdAt: String
)

data class FounderStats(
    val totalUsers: Int = 0,
    val totalPosts: Int = 0,
    val publishedPosts: Int = 0,
    val draftPosts: Int = 0,
    val totalGenerations: Int = 0,
    val totalCreditsUsed: Int = 0,
    val roleDistribution: Map<String, Int> = emptyMap()
)

class SupabaseFounderService(private val client: SupabaseClient) {

    suspend fun getStats(): Result<FounderStats> = withContext(Dispatchers.IO) {
        try {
            // Count users & roles
            var totalUsers = 0
            val roleMap = mutableMapOf<String, Int>()
            val usersResp = client.execute("/rest/v1/profiles?select=role")
            if (usersResp is SupabaseResponse.Success) {
                val array = usersResp.asJsonArray() ?: JSONArray()
                totalUsers = array.length()
                for (i in 0 until array.length()) {
                    val r = array.getJSONObject(i).optString("role", "user")
                    roleMap[r] = (roleMap[r] ?: 0) + 1
                }
            }

            // Count posts
            var totalPosts = 0
            var publishedPosts = 0
            var draftPosts = 0
            val postsResp = client.execute("/rest/v1/posts?select=status")
            if (postsResp is SupabaseResponse.Success) {
                val array = postsResp.asJsonArray() ?: JSONArray()
                totalPosts = array.length()
                for (i in 0 until array.length()) {
                    val status = array.getJSONObject(i).optString("status")
                    if (status == "published") publishedPosts++
                    else if (status == "draft") draftPosts++
                }
            }

            // Count AI Generations
            var totalGenerations = 0
            val genResp = client.execute("/rest/v1/ai_generations?select=id")
            if (genResp is SupabaseResponse.Success) {
                totalGenerations = genResp.asJsonArray()?.length() ?: 0
            }

            // Credits used
            var usedCredits = 0
            val credResp = client.execute("/rest/v1/ai_credits?select=used_credits")
            if (credResp is SupabaseResponse.Success) {
                val array = credResp.asJsonArray() ?: JSONArray()
                for (i in 0 until array.length()) {
                    usedCredits += array.getJSONObject(i).optInt("used_credits", 0)
                }
            }

            Result.success(
                FounderStats(
                    totalUsers = totalUsers,
                    totalPosts = totalPosts,
                    publishedPosts = publishedPosts,
                    draftPosts = draftPosts,
                    totalGenerations = totalGenerations,
                    totalCreditsUsed = usedCredits,
                    roleDistribution = roleMap
                )
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAllUsers(): Result<List<UserProfile>> = withContext(Dispatchers.IO) {
        val endpoint = "/rest/v1/profiles?order=created_at.desc&select=*"
        when (val response = client.execute(endpoint)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray() ?: JSONArray()
                val list = mutableListOf<UserProfile>()
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    list.add(
                        UserProfile(
                            id = obj.optString("id"),
                            email = obj.optString("email").takeIf { it.isNotBlank() },
                            username = obj.optString("username").takeIf { it.isNotBlank() },
                            fullName = obj.optString("full_name").takeIf { it.isNotBlank() },
                            bio = obj.optString("bio").takeIf { it.isNotBlank() },
                            avatarUrl = obj.optString("avatar_url").takeIf { it.isNotBlank() },
                            location = obj.optString("location").takeIf { it.isNotBlank() },
                            category = obj.optString("category", "Créateur de contenu"),
                            role = obj.optString("role", "user"),
                            createdAt = obj.optString("created_at").takeIf { it.isNotBlank() },
                            updatedAt = obj.optString("updated_at").takeIf { it.isNotBlank() }
                        )
                    )
                }
                Result.success(list)
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun getAllPosts(): Result<List<com.example.data.model.Post>> = withContext(Dispatchers.IO) {
        val endpoint = "/rest/v1/posts?order=created_at.desc&select=*"
        when (val response = client.execute(endpoint)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray() ?: JSONArray()
                val list = mutableListOf<com.example.data.model.Post>()
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    list.add(
                        com.example.data.model.Post(
                            id = obj.optString("id"),
                            authorId = obj.optString("author_id"),
                            authorName = obj.optString("author_name").takeIf { it.isNotBlank() },
                            authorUsername = obj.optString("author_username").takeIf { it.isNotBlank() },
                            title = obj.optString("title").takeIf { it.isNotBlank() },
                            content = obj.optString("content", ""),
                            mediaUrl = obj.optString("media_url").takeIf { it.isNotBlank() },
                            mediaType = obj.optString("media_type", "none"),
                            status = obj.optString("status", "published"),
                            visibility = obj.optString("visibility", "public")
                        )
                    )
                }
                Result.success(list)
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun getAllAIGenerations(): Result<List<FounderAIGeneration>> = withContext(Dispatchers.IO) {
        val endpoint = "/rest/v1/ai_generations?order=created_at.desc&select=*&limit=50"
        when (val response = client.execute(endpoint)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray() ?: JSONArray()
                val list = mutableListOf<FounderAIGeneration>()
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    list.add(
                        FounderAIGeneration(
                            id = obj.optString("id"),
                            userId = obj.optString("user_id"),
                            category = obj.optString("category", "script"),
                            prompt = obj.optString("prompt", ""),
                            status = obj.optString("status", "completed"),
                            creditsConsumed = obj.optInt("credits_consumed", 0),
                            createdAt = obj.optString("created_at")
                        )
                    )
                }
                Result.success(list)
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun updateUserRole(userId: String, newRole: String): Result<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply { put("role", newRole) }
        val endpoint = "/rest/v1/profiles?id=eq.$userId"
        when (val response = client.execute(endpoint, method = "PATCH", jsonBody = payload.toString())) {
            is SupabaseResponse.Success -> Result.success(Unit)
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun deletePost(postId: String): Result<Unit> = withContext(Dispatchers.IO) {
        val endpoint = "/rest/v1/posts?id=eq.$postId"
        when (val response = client.execute(endpoint, method = "DELETE")) {
            is SupabaseResponse.Success -> Result.success(Unit)
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun toggleArchivePost(postId: String, archive: Boolean): Result<Unit> = withContext(Dispatchers.IO) {
        val newStatus = if (archive) "archived" else "published"
        val payload = JSONObject().apply { put("status", newStatus) }
        val endpoint = "/rest/v1/posts?id=eq.$postId"
        when (val response = client.execute(endpoint, method = "PATCH", jsonBody = payload.toString())) {
            is SupabaseResponse.Success -> Result.success(Unit)
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun allocateUserCredits(userId: String, creditDelta: Int, reason: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            // Read current balance
            val getResp = client.execute("/rest/v1/ai_credits?user_id=eq.$userId&select=balance,free_credits,purchased_credits")
            var currentBalance = 0
            var freeCredits = 0
            if (getResp is SupabaseResponse.Success) {
                val arr = getResp.asJsonArray()
                if (arr != null && arr.length() > 0) {
                    val obj = arr.getJSONObject(0)
                    currentBalance = obj.optInt("balance", 0)
                    freeCredits = obj.optInt("free_credits", 0)
                }
            }
            val newBalance = (currentBalance + creditDelta).coerceAtLeast(0)
            val newFree = (freeCredits + creditDelta).coerceAtLeast(0)
            val updatePayload = JSONObject().apply {
                put("balance", newBalance)
                put("free_credits", newFree)
            }
            val patchResp = client.execute("/rest/v1/ai_credits?user_id=eq.$userId", method = "PATCH", jsonBody = updatePayload.toString())
            if (patchResp is SupabaseResponse.Success) {
                // Record transaction
                val txPayload = JSONObject().apply {
                    put("user_id", userId)
                    put("amount", creditDelta)
                    put("transaction_type", if (creditDelta >= 0) "grant" else "deduction")
                    put("description", "Ajustement Founder: $reason")
                }
                client.execute("/rest/v1/ai_credit_transactions", method = "POST", jsonBody = txPayload.toString())
                Result.success(Unit)
            } else {
                Result.failure(Exception("Échec de la mise à jour des crédits"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun checkSystemHealth(): Result<SystemHealthStatus> = withContext(Dispatchers.IO) {
        val start = System.currentTimeMillis()
        val authCheck = client.execute("/auth/v1/settings")
        val latency = System.currentTimeMillis() - start
        val isAuthOk = authCheck is SupabaseResponse.Success
        val dbCheck = client.execute("/rest/v1/profiles?select=id&limit=1")
        val isDbOk = dbCheck is SupabaseResponse.Success

        Result.success(
            SystemHealthStatus(
                isSupabaseConnected = client.isConfigured && (isAuthOk || isDbOk),
                latencyMs = latency,
                authHealthy = isAuthOk,
                databaseHealthy = isDbOk,
                projectUrl = client.currentUrl,
                founderEmail = SupabaseAuthService.FOUNDER_EMAIL
            )
        )
    }
}

data class SystemHealthStatus(
    val isSupabaseConnected: Boolean,
    val latencyMs: Long,
    val authHealthy: Boolean,
    val databaseHealthy: Boolean,
    val projectUrl: String,
    val founderEmail: String
)
