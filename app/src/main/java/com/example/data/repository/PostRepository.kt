package com.example.data.repository

import android.net.Uri
import com.example.data.local.PostDao
import com.example.data.model.Post
import com.example.data.remote.SupabasePostService
import com.example.data.remote.SupabaseStorageService
import kotlinx.coroutines.flow.Flow

class PostRepository(
    private val postService: SupabasePostService,
    private val storageService: SupabaseStorageService,
    private val postDao: PostDao
) {
    val publishedPosts: Flow<List<Post>> = postDao.getPublishedPosts()

    fun getUserPosts(userId: String): Flow<List<Post>> = postDao.getPostsByAuthor(userId)

    fun getPublicAuthorPosts(userId: String): Flow<List<Post>> = postDao.getPublishedPostsByAuthor(userId)

    suspend fun refreshPublishedPosts(): Result<List<Post>> {
        val result = postService.getPublishedPosts()
        if (result.isSuccess) {
            val list = result.getOrNull() ?: emptyList()
            postDao.insertPosts(list)
        }
        return result
    }

    suspend fun refreshUserPosts(userId: String): Result<List<Post>> {
        val result = postService.getUserPosts(userId)
        if (result.isSuccess) {
            val list = result.getOrNull() ?: emptyList()
            postDao.insertPosts(list)
        }
        return result
    }

    suspend fun uploadMedia(userId: String, uri: Uri, isVideo: Boolean): Result<Pair<String, String>> {
        return storageService.uploadPostMedia(userId, uri, isVideo)
    }

    suspend fun uploadMediaFile(userId: String, uri: Uri, forcedType: String? = null): Result<Triple<String, String, Long>> {
        return storageService.uploadMediaFile(userId, uri, forcedType)
    }

    suspend fun uploadMultipleMedia(userId: String, uris: List<Uri>): Result<List<Triple<String, String, Long>>> {
        return storageService.uploadMultipleMedia(userId, uris)
    }

    suspend fun savePost(post: Post): Result<Post> {
        // Save locally first
        postDao.insertPost(post)
        // If connected, sync to Supabase
        val remoteResult = postService.createPost(post)
        if (remoteResult.isSuccess) {
            val created = remoteResult.getOrNull()
            if (created != null) {
                postDao.insertPost(created)
                return Result.success(created)
            }
        }
        return Result.success(post)
    }

    suspend fun updatePost(post: Post): Result<Post> {
        postDao.insertPost(post)
        val remoteResult = postService.updatePost(post)
        if (remoteResult.isSuccess) {
            val updated = remoteResult.getOrNull()
            if (updated != null) {
                postDao.insertPost(updated)
                return Result.success(updated)
            }
        }
        return Result.success(post)
    }

    suspend fun publishDraft(post: Post): Result<Post> {
        val published = post.copy(status = "published", updatedAt = System.currentTimeMillis())
        return updatePost(published)
    }

    suspend fun deletePost(post: Post): Result<Unit> {
        postDao.deletePost(post)
        // Clean up remote storage if media exists
        post.mediaUrl?.let { url ->
            try {
                storageService.deleteStorageFile(url)
            } catch (_: Exception) {}
        }
        return postService.deletePost(post.id)
    }
}
