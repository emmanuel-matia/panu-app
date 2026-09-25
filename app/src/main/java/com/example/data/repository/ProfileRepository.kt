package com.example.data.repository

import android.net.Uri
import com.example.data.local.ProfileDao
import com.example.data.local.SessionManager
import com.example.data.local.SocialLinksDao
import com.example.data.model.SocialLinks
import com.example.data.model.UserProfile
import com.example.data.remote.SupabaseProfileService
import com.example.data.remote.SupabaseStorageService
import kotlinx.coroutines.flow.Flow

class ProfileRepository(
    private val profileService: SupabaseProfileService,
    private val storageService: SupabaseStorageService,
    private val profileDao: ProfileDao,
    private val socialLinksDao: SocialLinksDao,
    private val sessionManager: SessionManager? = null
) {
    fun getProfileFlow(userId: String): Flow<UserProfile?> = profileDao.getProfileById(userId)

    fun getSocialLinksFlow(userId: String): Flow<SocialLinks?> = socialLinksDao.getSocialLinks(userId)

    suspend fun refreshProfile(userId: String): Result<UserProfile?> {
        val remote = profileService.getProfile(userId)
        if (remote.isSuccess) {
            val p = remote.getOrNull()
            if (p != null) {
                profileDao.insertProfile(p)
                if (!p.themePreference.isNullOrBlank()) {
                    sessionManager?.setThemePreference(p.themePreference)
                }
            }
        }
        return remote
    }

    suspend fun updateThemePreference(userId: String, theme: String): Result<Unit> {
        // Update local Room cache if profile exists
        val current = profileDao.getProfileByIdSync(userId)
        if (current != null) {
            profileDao.insertProfile(current.copy(themePreference = theme))
        }
        return profileService.updateThemePreference(userId, theme)
    }

    suspend fun refreshSocialLinks(userId: String): Result<SocialLinks?> {
        val remote = profileService.getSocialLinks(userId)
        if (remote.isSuccess) {
            val links = remote.getOrNull()
            if (links != null) {
                socialLinksDao.insertSocialLinks(links)
            }
        }
        return remote
    }

    suspend fun updateProfile(profile: UserProfile): Result<UserProfile> {
        // Save locally first for instant persistence
        profileDao.insertProfile(profile)
        // Sync with Supabase
        val remoteResult = profileService.updateProfile(profile)
        if (remoteResult.isSuccess) {
            val updated = remoteResult.getOrNull()
            if (updated != null) {
                profileDao.insertProfile(updated)
                return Result.success(updated)
            }
        }
        return Result.success(profile)
    }

    suspend fun saveSocialLinks(userId: String, links: SocialLinks): Result<Unit> {
        socialLinksDao.insertSocialLinks(links)
        return profileService.saveSocialLinks(userId, links)
    }

    suspend fun uploadAvatar(userId: String, imageUri: Uri): Result<String> {
        val result = storageService.uploadAvatar(userId, imageUri)
        if (result.isSuccess) {
            val publicUrl = result.getOrNull()
            if (!publicUrl.isNullOrBlank()) {
                // Update profile with new avatar URL
                val current = profileDao.getProfileByUsername("") // or direct
            }
        }
        return result
    }

    suspend fun getPublicProfile(username: String): Result<UserProfile?> {
        // First try local room
        val local = profileDao.getProfileByUsername(username.removePrefix("@"))
        if (local != null) {
            // Asynchronously refresh in background
            return Result.success(local)
        }
        return profileService.getProfileByUsername(username)
    }

    suspend fun autoFollowFounder(userId: String): Result<Unit> {
        return profileService.autoFollowFounder(userId)
    }
}
