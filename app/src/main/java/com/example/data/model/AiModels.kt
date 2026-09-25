package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "ai_credits")
data class AiCredit(
    @PrimaryKey
    val userId: String,
    val balance: Int = 0,
    val freeCredits: Int = 0,
    val purchasedCredits: Int = 0,
    val usedCredits: Int = 0,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "ai_credit_transactions")
data class AiCreditTransaction(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val userId: String,
    val amount: Int,
    val transactionType: String, // bonus, purchase, usage, refund
    val description: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "ai_generations")
data class AiGeneration(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val userId: String,
    val category: String, // script, image, video, voice, publication
    val prompt: String,
    val status: String = "pending", // pending, completed, failed
    val resultUrl: String? = null,
    val creditsConsumed: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)
