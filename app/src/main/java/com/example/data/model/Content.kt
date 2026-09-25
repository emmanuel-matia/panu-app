package com.example.data.model

data class Content(
    val id: String,
    val title: String,
    val type: String,
    val category: String,
    val thumbnailUrl: String,
    val videoUrl: String,
    val isFavorite: Boolean = false
)
