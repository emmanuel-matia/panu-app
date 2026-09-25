package com.example.data.repository

import com.example.data.model.Content
import com.example.data.remote.SupabaseContentService

class ContentRepository(private val contentService: SupabaseContentService) {

    suspend fun getContents(): List<Content> = contentService.getContents()

    suspend fun toggleFavorite(userId: String, contentId: String, isFavorite: Boolean) =
        contentService.toggleFavorite(userId, contentId, isFavorite)

    suspend fun saveHistory(userId: String, contentId: String, position: Int) =
        contentService.saveHistory(userId, contentId, position)
}
