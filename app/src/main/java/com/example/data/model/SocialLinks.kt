package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "social_links")
data class SocialLinks(
    @PrimaryKey
    val userId: String,
    val facebook: String? = null,
    val youtube: String? = null,
    val tiktok: String? = null,
    val instagram: String? = null,
    val x: String? = null,
    val whatsapp: String? = null,
    val website: String? = null
) {
    fun hasAnyLink(): Boolean {
        return !facebook.isNullOrBlank() ||
                !youtube.isNullOrBlank() ||
                !tiktok.isNullOrBlank() ||
                !instagram.isNullOrBlank() ||
                !x.isNullOrBlank() ||
                !whatsapp.isNullOrBlank() ||
                !website.isNullOrBlank()
    }
}
