package com.example.data.model

data class ChatMessage(
    val id: String,
    val role: String, // "user" or "model"
    val text: String,
    val timestamp: Long = System.currentTimeMillis()
)
