package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "posts")
data class Post(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val authorId: String,
    val authorName: String? = null,
    val authorUsername: String? = null,
    val authorAvatarUrl: String? = null,
    val title: String? = null,
    val content: String,
    val mediaUrl: String? = null,
    val mediaType: String = "none", // none, image, video
    val status: String = "draft",   // draft, published, archived
    val visibility: String = "public", // public, private
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
) {
    val isPublished: Boolean get() = status.equals("published", ignoreCase = true)
    val isDraft: Boolean get() = status.equals("draft", ignoreCase = true)
    val isPublic: Boolean get() = visibility.equals("public", ignoreCase = true)
}
