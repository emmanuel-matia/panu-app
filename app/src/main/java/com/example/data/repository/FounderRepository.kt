package com.example.data.repository

import com.example.data.local.CreditDao
import com.example.data.local.PostDao
import com.example.data.local.ProfileDao
import com.example.data.model.UserProfile
import com.example.data.remote.FounderStats
import com.example.data.remote.SupabaseFounderService
import kotlinx.coroutines.flow.first

class FounderRepository(
    private val founderService: SupabaseFounderService,
    private val profileDao: ProfileDao,
    private val postDao: PostDao,
    private val creditDao: CreditDao
) {
    suspend fun getPlatformStats(): Result<FounderStats> {
        val remote = founderService.getStats()
        if (remote.isSuccess) {
            return remote
        }
        // Fallback to real local aggregates if network fails
        val localUserCount = profileDao.getProfileCount().first()
        val localTotalPosts = postDao.getTotalPostCount().first()
        val localPublishedPosts = postDao.getPublishedPostCount().first()
        val localCredits = creditDao.getTotalUsedCredits().first()

        return Result.success(
            FounderStats(
                totalUsers = localUserCount,
                totalPosts = localTotalPosts,
                publishedPosts = localPublishedPosts,
                draftPosts = (localTotalPosts - localPublishedPosts).coerceAtLeast(0),
                totalGenerations = 0,
                totalCreditsUsed = localCredits
            )
        )
    }

    suspend fun getAllUsers(): Result<List<UserProfile>> {
        val remote = founderService.getAllUsers()
        if (remote.isSuccess) {
            return remote
        }
        val local = profileDao.getAllProfiles().first()
        return Result.success(local)
    }

    suspend fun getAllPosts(): Result<List<com.example.data.model.Post>> {
        val remote = founderService.getAllPosts()
        if (remote.isSuccess) return remote
        val local = postDao.getAllPosts().first()
        return Result.success(local)
    }

    suspend fun getAllAIGenerations(): Result<List<com.example.data.remote.FounderAIGeneration>> {
        return founderService.getAllAIGenerations()
    }

    suspend fun updateUserRole(userId: String, newRole: String): Result<Unit> {
        return founderService.updateUserRole(userId, newRole)
    }

    suspend fun deletePost(postId: String): Result<Unit> {
        val remote = founderService.deletePost(postId)
        postDao.deletePostById(postId)
        return remote
    }

    suspend fun toggleArchivePost(postId: String, archive: Boolean): Result<Unit> {
        return founderService.toggleArchivePost(postId, archive)
    }

    suspend fun allocateUserCredits(userId: String, delta: Int, reason: String): Result<Unit> {
        return founderService.allocateUserCredits(userId, delta, reason)
    }

    suspend fun checkSystemHealth(): Result<com.example.data.remote.SystemHealthStatus> {
        return founderService.checkSystemHealth()
    }
}
