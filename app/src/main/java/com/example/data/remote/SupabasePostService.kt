package com.example.data.remote

import com.example.data.model.Post
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class SupabasePostService(private val client: SupabaseClient) {

    suspend fun getPublishedPosts(): Result<List<Post>> = withContext(Dispatchers.IO) {
        // Query posts with author profiles joined or select fields
        val endpoint = "/rest/v1/posts?status=eq.published&visibility=eq.public&order=created_at.desc&select=id,author_id,title,content,media_url,media_type,status,visibility,created_at,updated_at,profiles(full_name,username,avatar_url)"
        when (val response = client.execute(endpoint)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray() ?: JSONArray()
                val list = mutableListOf<Post>()
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    list.add(parsePost(obj))
                }
                Result.success(list)
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun getUserPosts(authorId: String): Result<List<Post>> = withContext(Dispatchers.IO) {
        val endpoint = "/rest/v1/posts?author_id=eq.$authorId&order=created_at.desc&select=*"
        when (val response = client.execute(endpoint)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray() ?: JSONArray()
                val list = mutableListOf<Post>()
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    list.add(parsePost(obj))
                }
                Result.success(list)
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun createPost(post: Post): Result<Post> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("author_id", post.authorId)
            post.title?.let { put("title", it) }
            put("content", post.content)
            post.mediaUrl?.let { put("media_url", it) }
            put("media_type", post.mediaType)
            put("status", post.status)
            put("visibility", post.visibility)
        }

        val endpoint = "/rest/v1/posts"
        val headers = mapOf("Prefer" to "return=representation")
        when (val response = client.execute(endpoint, method = "POST", jsonBody = payload.toString(), headers = headers)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray()
                if (array != null && array.length() > 0) {
                    Result.success(parsePost(array.getJSONObject(0)))
                } else {
                    Result.success(post)
                }
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun updatePost(post: Post): Result<Post> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            post.title?.let { put("title", it) }
            put("content", post.content)
            post.mediaUrl?.let { put("media_url", it) }
            put("media_type", post.mediaType)
            put("status", post.status)
            put("visibility", post.visibility)
        }

        val endpoint = "/rest/v1/posts?id=eq.${post.id}"
        val headers = mapOf("Prefer" to "return=representation")
        when (val response = client.execute(endpoint, method = "PATCH", jsonBody = payload.toString(), headers = headers)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray()
                if (array != null && array.length() > 0) {
                    Result.success(parsePost(array.getJSONObject(0)))
                } else {
                    Result.success(post)
                }
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun updatePostStatus(postId: String, status: String): Result<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("status", status)
        }
        val endpoint = "/rest/v1/posts?id=eq.$postId"
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

    private fun parsePost(obj: JSONObject): Post {
        val profilesObj = obj.optJSONObject("profiles")
        return Post(
            id = obj.optString("id"),
            authorId = obj.optString("author_id"),
            authorName = profilesObj?.optString("full_name")?.takeIf { it.isNotBlank() } ?: obj.optString("author_name").takeIf { it.isNotBlank() },
            authorUsername = profilesObj?.optString("username")?.takeIf { it.isNotBlank() } ?: obj.optString("author_username").takeIf { it.isNotBlank() },
            authorAvatarUrl = profilesObj?.optString("avatar_url")?.takeIf { it.isNotBlank() } ?: obj.optString("author_avatar_url").takeIf { it.isNotBlank() },
            title = obj.optString("title").takeIf { it.isNotBlank() },
            content = obj.optString("content", ""),
            mediaUrl = obj.optString("media_url").takeIf { it.isNotBlank() },
            mediaType = obj.optString("media_type", "none"),
            status = obj.optString("status", "draft"),
            visibility = obj.optString("visibility", "public"),
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
    }
}
