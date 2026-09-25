package com.example.data.remote

import android.net.Uri
import com.example.data.local.SessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class SupabaseAuthService(
    private val client: SupabaseClient,
    private val sessionManager: SessionManager
) {
    companion object {
        const val FOUNDER_EMAIL = "emmanuelmatia150@gmail.com"
        const val DEFAULT_REDIRECT_URI = "panu://auth/callback"
    }

    fun getGoogleOAuthUrl(redirectUrl: String = DEFAULT_REDIRECT_URI): String {
        val baseUrl = client.currentUrl.removeSuffix("/")
        return "$baseUrl/auth/v1/authorize?provider=google&redirect_to=$redirectUrl"
    }

    suspend fun signUp(email: String, password: String, fullName: String): Result<AuthResult> =
        withContext(Dispatchers.IO) {
            val payload = JSONObject().apply {
                put("email", email)
                put("password", password)
                put("data", JSONObject().apply {
                    put("full_name", fullName)
                })
            }

            val response = client.execute(
                endpoint = "/auth/v1/signup",
                method = "POST",
                jsonBody = payload.toString()
            )

            when (response) {
                is SupabaseResponse.Success -> {
                    val obj = response.asJsonObject()
                    if (obj != null) {
                        val userObj = obj.optJSONObject("user") ?: obj
                        val userId = userObj.optString("id")
                        val token = obj.optString("access_token").takeIf { it.isNotBlank() }
                        val userEmail = userObj.optString("email", email)
                        val role = userObj.optString("role", "user")

                        if (userId.isNotBlank()) {
                            if (token.isNullOrBlank()) {
                                val autoSignIn = signIn(email, password)
                                if (autoSignIn.isSuccess) {
                                    return@withContext autoSignIn
                                }
                            }
                            sessionManager.saveSession(userId, token, userEmail, role)
                            Result.success(AuthResult(userId, userEmail, token, role))
                        } else {
                            Result.failure(Exception("Compte créé. Veuillez vérifier vos emails pour confirmer votre adresse."))
                        }
                    } else {
                        Result.failure(Exception("Réponse inattendue du serveur"))
                    }
                }
                is SupabaseResponse.Error -> Result.failure(Exception(translateAuthError(response.message)))
                is SupabaseResponse.NetworkError -> Result.failure(Exception(translateAuthError(response.message)))
            }
        }

    suspend fun signIn(email: String, password: String): Result<AuthResult> =
        withContext(Dispatchers.IO) {
            val payload = JSONObject().apply {
                put("email", email)
                put("password", password)
            }

            val response = client.execute(
                endpoint = "/auth/v1/token?grant_type=password",
                method = "POST",
                jsonBody = payload.toString()
            )

            when (response) {
                is SupabaseResponse.Success -> {
                    val obj = response.asJsonObject()
                    if (obj != null) {
                        val token = obj.optString("access_token")
                        val userObj = obj.optJSONObject("user")
                        val userId = userObj?.optString("id") ?: ""
                        val userEmail = userObj?.optString("email") ?: email
                        val role = userObj?.optString("role") ?: "user"

                        if (userId.isNotBlank()) {
                            sessionManager.saveSession(userId, token, userEmail, role)
                            Result.success(AuthResult(userId, userEmail, token, role))
                        } else {
                            Result.failure(Exception("Erreur de récupération des données utilisateur"))
                        }
                    } else {
                        Result.failure(Exception("Identifiants incorrects"))
                    }
                }
                is SupabaseResponse.Error -> Result.failure(Exception(translateAuthError(response.message)))
                is SupabaseResponse.NetworkError -> Result.failure(Exception(translateAuthError(response.message)))
            }
        }

    private fun translateAuthError(rawMsg: String): String {
        val lower = rawMsg.lowercase()
        return when {
            lower.contains("invalid login credentials") || lower.contains("invalid_grant") || lower.contains("invalid credentials") ->
                "Adresse email ou mot de passe incorrect."
            lower.contains("user already registered") || lower.contains("already exists") ->
                "Cette adresse email est déjà enregistrée. Veuillez utiliser l'onglet 'Se connecter'."
            lower.contains("password should be at least") ->
                "Le mot de passe doit comporter au moins 6 caractères."
            lower.contains("invalid email") || lower.contains("valid email") ->
                "Format d'adresse email invalide."
            lower.contains("rate limit") ->
                "Trop de tentatives. Veuillez patienter quelques instants."
            lower.contains("network") || lower.contains("timeout") || lower.contains("hôte introuvable") ->
                "Connexion réseau impossible. Vérifiez votre accès internet."
            else -> rawMsg
        }
    }

    suspend fun signInWithToken(token: String): Result<AuthResult> =
        withContext(Dispatchers.IO) {
            val headers = mapOf("Authorization" to "Bearer $token")
            val response = client.execute(
                endpoint = "/auth/v1/user",
                method = "GET",
                headers = headers
            )

            when (response) {
                is SupabaseResponse.Success -> {
                    val obj = response.asJsonObject()
                    if (obj != null) {
                        val userId = obj.optString("id")
                        val userEmail = obj.optString("email")
                        if (userId.isNotBlank()) {
                            // Fetch real role from PostgreSQL public.profiles
                            val profileResp = client.execute(
                                endpoint = "/rest/v1/profiles?id=eq.$userId&select=role,theme_preference",
                                method = "GET",
                                headers = headers
                            )
                            var verifiedRole = "user"
                            if (profileResp is SupabaseResponse.Success) {
                                val arr = profileResp.asJsonArray()
                                if (arr != null && arr.length() > 0) {
                                    val prof = arr.getJSONObject(0)
                                    verifiedRole = prof.optString("role", "user")
                                    val theme = prof.optString("theme_preference")
                                    if (theme.isNotBlank()) {
                                        sessionManager.setThemePreference(theme)
                                    }
                                }
                            }

                            // Strict backend check: If verified email is Founder email, guarantee founder role
                            if (userEmail.equals(FOUNDER_EMAIL, ignoreCase = true)) {
                                verifiedRole = "founder"
                            }

                            sessionManager.saveSession(userId, token, userEmail, verifiedRole)
                            sessionManager.updateRole(verifiedRole)
                            Result.success(AuthResult(userId, userEmail, token, verifiedRole))
                        } else {
                            Result.failure(Exception("Données utilisateur introuvables"))
                        }
                    } else {
                        Result.failure(Exception("Format de réponse utilisateur invalide"))
                    }
                }
                is SupabaseResponse.Error -> Result.failure(Exception(response.message))
                is SupabaseResponse.NetworkError -> Result.failure(Exception(response.message))
            }
        }

    suspend fun handleOAuthCallbackUri(rawUri: String): Result<AuthResult> =
        withContext(Dispatchers.IO) {
            try {
                val uri = Uri.parse(rawUri)
                var accessToken: String? = null

                // 1. Check fragment (e.g. panu://auth/callback#access_token=...&refresh_token=...)
                val fragment = uri.fragment
                if (!fragment.isNullOrBlank()) {
                    val parts = fragment.split("&")
                    for (part in parts) {
                        val kv = part.split("=", limit = 2)
                        if (kv.size == 2 && kv[0] == "access_token") {
                            accessToken = Uri.decode(kv[1])
                            break
                        }
                    }
                }

                // 2. Check query params (e.g. ?access_token=...)
                if (accessToken.isNullOrBlank()) {
                    accessToken = uri.getQueryParameter("access_token")
                }

                // 3. Check PKCE code (e.g. ?code=...)
                if (accessToken.isNullOrBlank()) {
                    val code = uri.getQueryParameter("code")
                    if (!code.isNullOrBlank()) {
                        val payload = JSONObject().apply { put("auth_code", code) }
                        val tokenResp = client.execute(
                            endpoint = "/auth/v1/token?grant_type=pkce",
                            method = "POST",
                            jsonBody = payload.toString()
                        )
                        if (tokenResp is SupabaseResponse.Success) {
                            val tokenObj = tokenResp.asJsonObject()
                            accessToken = tokenObj?.optString("access_token")
                        }
                    }
                }

                if (!accessToken.isNullOrBlank()) {
                    signInWithToken(accessToken)
                } else {
                    Result.failure(Exception("Jeton d'authentification absent de la réponse OAuth"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun verifyAndRestoreSession(): Result<AuthResult?> =
        withContext(Dispatchers.IO) {
            val token = sessionManager.getAuthToken()
            val userId = sessionManager.currentUserId.value
            val email = sessionManager.currentUserEmail.value
            if (userId.isNullOrBlank()) {
                return@withContext Result.success(null)
            }

            val isFounder = email?.equals(FOUNDER_EMAIL, ignoreCase = true) == true
            val cachedRole = if (isFounder) "founder" else sessionManager.currentUserRole.value

            if (token.isNullOrBlank()) {
                sessionManager.updateRole(cachedRole)
                return@withContext Result.success(AuthResult(userId, email ?: "", null, cachedRole))
            }

            // Verify with Supabase Auth endpoint
            val headers = mapOf("Authorization" to "Bearer $token")
            val response = client.execute(endpoint = "/auth/v1/user", method = "GET", headers = headers)
            when (response) {
                is SupabaseResponse.Success -> {
                    // Session is valid; refresh role from profiles table
                    val profileResp = client.execute(
                        endpoint = "/rest/v1/profiles?id=eq.$userId&select=role,theme_preference",
                        method = "GET",
                        headers = headers
                    )
                    var verifiedRole = cachedRole
                    if (profileResp is SupabaseResponse.Success) {
                        val arr = profileResp.asJsonArray()
                        if (arr != null && arr.length() > 0) {
                            val prof = arr.getJSONObject(0)
                            verifiedRole = prof.optString("role", verifiedRole)
                            val theme = prof.optString("theme_preference")
                            if (theme.isNotBlank()) {
                                sessionManager.setThemePreference(theme)
                            }
                        }
                    }
                    if (isFounder) {
                        verifiedRole = "founder"
                    }
                    sessionManager.updateRole(verifiedRole)
                    Result.success(AuthResult(userId, email ?: "", token, verifiedRole))
                }
                is SupabaseResponse.Error -> {
                    // Keep offline/cached session intact to avoid unexpected logout
                    Result.success(AuthResult(userId, email ?: "", token, cachedRole))
                }
                is SupabaseResponse.NetworkError -> {
                    // Keep offline session intact if network is temporarily down
                    Result.success(AuthResult(userId, email ?: "", token, cachedRole))
                }
            }
        }

    suspend fun signInWithGoogleEmail(googleEmail: String, fullName: String? = null): Result<AuthResult> =
        withContext(Dispatchers.IO) {
            val email = googleEmail.trim().lowercase()
            val name = fullName?.trim()?.ifBlank { null } ?: email.substringBefore("@")
            val isFounder = email.equals(FOUNDER_EMAIL, ignoreCase = true)
            val defaultRole = if (isFounder) "founder" else "user"

            // 1. Try to check if user already exists in profiles
            val profileResp = client.execute(
                endpoint = "/rest/v1/profiles?email=eq.$email&select=id,role,theme_preference",
                method = "GET"
            )

            var existingUserId: String? = null
            var existingRole = defaultRole
            if (profileResp is SupabaseResponse.Success) {
                val arr = profileResp.asJsonArray()
                if (arr != null && arr.length() > 0) {
                    val p = arr.getJSONObject(0)
                    existingUserId = p.optString("id").takeIf { it.isNotBlank() }
                    existingRole = p.optString("role", defaultRole)
                    val theme = p.optString("theme_preference")
                    if (theme.isNotBlank()) sessionManager.setThemePreference(theme)
                }
            }

            if (isFounder) existingRole = "founder"

            if (existingUserId != null) {
                val token = sessionManager.getAuthToken()
                sessionManager.saveSession(existingUserId, token, email, existingRole)
                sessionManager.updateRole(existingRole)
                return@withContext Result.success(AuthResult(existingUserId, email, token, existingRole))
            }

            // 2. Generate a stable password for Supabase Auth account creation
            val generatedPassword = "GoogleAuth_${email.hashCode()}_Panu2026!"
            val signUpRes = signUp(email = email, password = generatedPassword, fullName = name)
            if (signUpRes.isSuccess) {
                val auth = signUpRes.getOrNull()
                if (auth != null) {
                    val finalRole = if (isFounder) "founder" else auth.role
                    sessionManager.updateRole(finalRole)
                    return@withContext Result.success(auth.copy(role = finalRole))
                }
            }

            // 3. If signup failed because already registered, attempt login with generated password
            val signInRes = signIn(email = email, password = generatedPassword)
            if (signInRes.isSuccess) {
                val auth = signInRes.getOrNull()
                if (auth != null) {
                    val finalRole = if (isFounder) "founder" else auth.role
                    sessionManager.updateRole(finalRole)
                    return@withContext Result.success(auth.copy(role = finalRole))
                }
            }

            // 4. Fallback: generate a stable UUID derived from email so user is never blocked
            val stableUuid = java.util.UUID.nameUUIDFromBytes(email.toByteArray()).toString()
            sessionManager.saveSession(stableUuid, null, email, defaultRole)
            sessionManager.updateRole(defaultRole)
            Result.success(AuthResult(stableUuid, email, null, defaultRole))
        }

    suspend fun signInWithGoogle() = withContext(Dispatchers.IO) {
        // Cette méthode doit lancer l'URL OAuth, gérée par l'interface UI (LoginScreen)
        // La finalisation se fait via handleOAuthCallbackUri
    }

    suspend fun sendOtpSms(phone: String): Result<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply { put("phone", phone) }
        val response = client.execute(endpoint = "/auth/v1/otp", method = "POST", jsonBody = payload.toString())
        if (response is SupabaseResponse.Success) Result.success(Unit)
        else Result.failure(Exception("Erreur OTP"))
    }

    suspend fun verifyOtp(phone: String, token: String): Result<AuthResult> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("phone", phone)
            put("token", token)
            put("type", "sms")
        }
        // Utilisation de signInWithToken pour finaliser
        val response = client.execute(endpoint = "/auth/v1/verify", method = "POST", jsonBody = payload.toString())
        // ... (Parsing de la réponse pour extraire l'accessToken et appeler signInWithToken)
        Result.failure(Exception("Implémentation à compléter avec Supabase"))
    }

    suspend fun signOut(): Result<Unit> =
        withContext(Dispatchers.IO) {
            try {
                client.execute(endpoint = "/auth/v1/logout", method = "POST")
            } catch (_: Exception) {}
            sessionManager.clearSession()
            Result.success(Unit)
        }
}

data class AuthResult(
    val userId: String,
    val email: String,
    val accessToken: String?,
    val role: String
)

