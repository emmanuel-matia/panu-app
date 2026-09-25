package com.example.data.repository

import com.example.data.local.CreditDao
import com.example.data.model.AiCredit
import com.example.data.model.AiCreditTransaction
import com.example.data.model.AiGeneration
import com.example.data.remote.SupabaseCreditService
import kotlinx.coroutines.flow.Flow

class CreditRepository(
    private val creditService: SupabaseCreditService,
    private val creditDao: CreditDao
) {
    fun getCreditFlow(userId: String): Flow<AiCredit?> = creditDao.getCredit(userId)

    fun getTransactionsFlow(userId: String): Flow<List<AiCreditTransaction>> = creditDao.getTransactions(userId)

    suspend fun refreshCredits(userId: String): Result<AiCredit> {
        val result = creditService.getUserCredits(userId)
        if (result.isSuccess) {
            val credit = result.getOrNull()
            if (credit != null) {
                creditDao.insertCredit(credit)
            }
        }
        return result
    }

    suspend fun refreshTransactions(userId: String): Result<List<AiCreditTransaction>> {
        val result = creditService.getUserTransactions(userId)
        if (result.isSuccess) {
            val list = result.getOrNull() ?: emptyList()
            list.forEach { creditDao.insertTransaction(it) }
        }
        return result
    }

    suspend fun consumeCredits(
        userId: String,
        amount: Int,
        category: String,
        description: String? = null
    ): Result<Int> {
        val result = creditService.consumeCredit(userId, amount, category, description)
        if (result.isSuccess) {
            val newBalance = result.getOrThrow()
            val existing = creditDao.getCreditDirect(userId) ?: AiCredit(userId = userId)
            creditDao.insertCredit(
                existing.copy(
                    balance = newBalance,
                    usedCredits = existing.usedCredits + amount,
                    updatedAt = System.currentTimeMillis()
                )
            )
            creditDao.insertTransaction(
                AiCreditTransaction(
                    userId = userId,
                    amount = -amount,
                    transactionType = "usage",
                    description = description ?: "Génération Studio IA ($category)",
                    createdAt = System.currentTimeMillis()
                )
            )
        }
        return result
    }

    suspend fun saveAiGeneration(generation: AiGeneration): Result<AiGeneration> {
        return creditService.saveAiGeneration(generation)
    }
}
