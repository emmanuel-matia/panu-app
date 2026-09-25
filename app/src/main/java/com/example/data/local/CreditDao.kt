package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.data.model.AiCredit
import com.example.data.model.AiCreditTransaction
import kotlinx.coroutines.flow.Flow

@Dao
interface CreditDao {
    @Query("SELECT * FROM ai_credits WHERE userId = :userId LIMIT 1")
    fun getCredit(userId: String): Flow<AiCredit?>

    @Query("SELECT * FROM ai_credits WHERE userId = :userId LIMIT 1")
    suspend fun getCreditDirect(userId: String): AiCredit?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCredit(credit: AiCredit)

    @Query("SELECT * FROM ai_credit_transactions WHERE userId = :userId ORDER BY createdAt DESC")
    fun getTransactions(userId: String): Flow<List<AiCreditTransaction>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransaction(transaction: AiCreditTransaction)

    @Query("SELECT COALESCE(SUM(usedCredits), 0) FROM ai_credits")
    fun getTotalUsedCredits(): Flow<Int>
}
