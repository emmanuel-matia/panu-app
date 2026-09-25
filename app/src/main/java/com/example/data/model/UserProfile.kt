package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "profiles")
data class UserProfile(
    @PrimaryKey
    val id: String,
    val email: String? = null,
    val username: String? = null,
    val fullName: String? = null,
    val bio: String? = null,
    val avatarUrl: String? = null,
    val location: String? = null,
    val category: String? = "Créateur de contenu",
    val role: String = "user",
    val themePreference: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val userRole: UserRole
        get() = UserRole.fromString(role)

    val displayName: String
        get() = fullName?.takeIf { it.isNotBlank() }
            ?: username?.takeIf { it.isNotBlank() }
            ?: email?.substringBefore("@")
            ?: "Créateur PANU"

    val handle: String
        get() = username?.takeIf { it.isNotBlank() }?.let { "@$it" }
            ?: email?.substringBefore("@")?.let { "@$it" }
            ?: "@panu_user"
}
