package com.example.data.remote

import com.example.data.model.AiCredit
import com.example.data.model.AiCreditTransaction
import com.example.data.model.AiGeneration
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

class SupabaseCreditService(private val client: SupabaseClient) {

    suspend fun getUserCredits(userId: String): Result<AiCredit> = withContext(Dispatchers.IO) {
        val endpoint = "/rest/v1/ai_credits?user_id=eq.$userId&select=*"
        when (val response = client.execute(endpoint)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray()
                if (array != null && array.length() > 0) {
                    val obj = array.getJSONObject(0)
                    val credit = AiCredit(
                        userId = obj.optString("user_id", userId),
                        balance = obj.optInt("balance", 0),
                        freeCredits = obj.optInt("free_credits", 0),
                        purchasedCredits = obj.optInt("purchased_credits", 0),
                        usedCredits = obj.optInt("used_credits", 0),
                        updatedAt = System.currentTimeMillis()
                    )
                    Result.success(credit)
                } else {
                    // Try to create initial credit row if none exists
                    val initial = AiCredit(userId = userId, balance = 0, freeCredits = 0, purchasedCredits = 0, usedCredits = 0)
                    createInitialCredits(initial)
                    Result.success(initial)
                }
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    private suspend fun createInitialCredits(credit: AiCredit) = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("user_id", credit.userId)
            put("balance", credit.balance)
            put("free_credits", credit.freeCredits)
            put("purchased_credits", credit.purchasedCredits)
            put("used_credits", credit.usedCredits)
        }
        val endpoint = "/rest/v1/ai_credits"
        client.execute(endpoint, method = "POST", jsonBody = payload.toString())
    }

    suspend fun getUserTransactions(userId: String): Result<List<AiCreditTransaction>> = withContext(Dispatchers.IO) {
        val endpoint = "/rest/v1/ai_credit_transactions?user_id=eq.$userId&order=created_at.desc&select=*"
        when (val response = client.execute(endpoint)) {
            is SupabaseResponse.Success -> {
                val array = response.asJsonArray() ?: JSONArray()
                val list = mutableListOf<AiCreditTransaction>()
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    list.add(
                        AiCreditTransaction(
                            id = obj.optString("id", UUID.randomUUID().toString()),
                            userId = obj.optString("user_id", userId),
                            amount = obj.optInt("amount", 0),
                            transactionType = obj.optString("transaction_type", "usage"),
                            description = obj.optString("description").takeIf { it.isNotBlank() },
                            createdAt = System.currentTimeMillis()
                        )
                    )
                }
                Result.success(list)
            }
            is SupabaseResponse.Error -> Result.failure(Exception(response.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
        }
    }

    suspend fun consumeCredit(
        userId: String,
        amount: Int,
        category: String,
        description: String? = null
    ): Result<Int> = withContext(Dispatchers.IO) {
        // Read current balance
        val creditsRes = getUserCredits(userId)
        val current = creditsRes.getOrNull() ?: AiCredit(userId = userId, balance = 0)

        if (current.balance < amount) {
            return@withContext Result.failure(
                IllegalStateException("Solde insuffisant : ${current.balance} crédit(s) disponible(s), $amount requis.")
            )
        }

        val newBalance = (current.balance - amount).coerceAtLeast(0)
        val newUsed = current.usedCredits + amount

        val updatePayload = JSONObject().apply {
            put("balance", newBalance)
            put("used_credits", newUsed)
        }

        // Update ai_credits
        val updateEndpoint = "/rest/v1/ai_credits?user_id=eq.$userId"
        client.execute(updateEndpoint, method = "PATCH", jsonBody = updatePayload.toString())

        // Insert transaction record
        val txPayload = JSONObject().apply {
            put("user_id", userId)
            put("amount", -amount)
            put("transaction_type", "usage")
            put("description", description ?: "Génération Studio IA ($category)")
        }
        client.execute("/rest/v1/ai_credit_transactions", method = "POST", jsonBody = txPayload.toString())

        Result.success(newBalance)
    }

    suspend fun saveAiGeneration(generation: AiGeneration): Result<AiGeneration> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("user_id", generation.userId)
            put("category", generation.category)
            put("prompt", generation.prompt)
            put("status", generation.status)
            generation.resultUrl?.let { put("result_url", it) }
            put("credits_consumed", generation.creditsConsumed)
        }
        val endpoint = "/rest/v1/ai_generations"
        val headers = mapOf("Prefer" to "return=representation")
        when (val res = client.execute(endpoint, method = "POST", jsonBody = payload.toString(), headers = headers)) {
            is SupabaseResponse.Success -> Result.success(generation)
            is SupabaseResponse.Error -> Result.failure(Exception(res.message))
            is SupabaseResponse.NetworkError -> Result.failure(Exception(res.message))
        }
    }
}
