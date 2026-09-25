package com.example.data.local

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class SessionManager(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("panu_session_prefs", Context.MODE_PRIVATE)

    private val _currentUserId = MutableStateFlow<String?>(prefs.getString(KEY_USER_ID, null))
    val currentUserId: StateFlow<String?> = _currentUserId.asStateFlow()

    private val _currentUserEmail = MutableStateFlow<String?>(prefs.getString(KEY_USER_EMAIL, null))
    val currentUserEmail: StateFlow<String?> = _currentUserEmail.asStateFlow()

    private val _currentUserRole = MutableStateFlow<String>(prefs.getString(KEY_USER_ROLE, "user") ?: "user")
    val currentUserRole: StateFlow<String> = _currentUserRole.asStateFlow()

    private val initialUrl: String = run {
        val stored = prefs.getString(KEY_SUPABASE_URL, null)
        if (stored.isNullOrBlank() || stored.contains("your-project.supabase.co")) {
            DEFAULT_SUPABASE_URL
        } else {
            stored
        }
    }

    private val initialKey: String = run {
        val stored = prefs.getString(KEY_SUPABASE_ANON_KEY, null)
        if (stored.isNullOrBlank() || stored.contains("placeholder") || stored.contains("your-anon-key")) {
            DEFAULT_ANON_KEY
        } else {
            stored
        }
    }

    private val _supabaseUrl = MutableStateFlow<String>(initialUrl)
    val supabaseUrl: StateFlow<String> = _supabaseUrl.asStateFlow()

    private val _supabaseAnonKey = MutableStateFlow<String>(initialKey)
    val supabaseAnonKey: StateFlow<String> = _supabaseAnonKey.asStateFlow()

    // Gestion du thème PANU : "light" (par défaut), "dark", "system"
    private val _themePreference = MutableStateFlow<String>(
        prefs.getString(KEY_THEME_PREFERENCE, THEME_LIGHT) ?: THEME_LIGHT
    )
    val themePreference: StateFlow<String> = _themePreference.asStateFlow()

    fun setThemePreference(theme: String) {
        val valid = when (theme.lowercase()) {
            THEME_DARK -> THEME_DARK
            THEME_SYSTEM -> THEME_SYSTEM
            else -> THEME_LIGHT
        }
        prefs.edit().putString(KEY_THEME_PREFERENCE, valid).apply()
        _themePreference.value = valid
    }

    fun isLoggedIn(): Boolean = !_currentUserId.value.isNullOrBlank()

    fun saveSession(userId: String, token: String?, email: String?, role: String = "user") {
        prefs.edit()
            .putString(KEY_USER_ID, userId)
            .putString(KEY_AUTH_TOKEN, token)
            .putString(KEY_USER_EMAIL, email)
            .putString(KEY_USER_ROLE, role)
            .apply()
        _currentUserId.value = userId
        _currentUserEmail.value = email
        _currentUserRole.value = role
    }

    fun updateRole(role: String) {
        prefs.edit().putString(KEY_USER_ROLE, role).apply()
        _currentUserRole.value = role
    }

    fun clearSession() {
        prefs.edit()
            .remove(KEY_USER_ID)
            .remove(KEY_AUTH_TOKEN)
            .remove(KEY_USER_EMAIL)
            .remove(KEY_USER_ROLE)
            .apply()
        _currentUserId.value = null
        _currentUserEmail.value = null
        _currentUserRole.value = "user"
    }

    fun getAuthToken(): String? = prefs.getString(KEY_AUTH_TOKEN, null)
    fun getUserEmail(): String? = prefs.getString(KEY_USER_EMAIL, null)

    fun getGeminiApiKey(): String {
        val stored = prefs.getString(KEY_GEMINI_API_KEY, null)?.trim()
        if (!stored.isNullOrBlank()) return stored
        val env = System.getenv("GEMINI_API_KEY")?.trim()
        if (!env.isNullOrBlank()) return env
        return try {
            val buildConfigKey = com.example.BuildConfig.GEMINI_API_KEY.trim()
            if (buildConfigKey.isNotBlank() && !buildConfigKey.contains("placeholder") && !buildConfigKey.contains("your-gemini-api-key")) buildConfigKey else ""
        } catch (_: Exception) {
            ""
        }
    }

    fun updateGeminiApiKey(key: String) {
        prefs.edit().putString(KEY_GEMINI_API_KEY, key.trim()).apply()
    }

    fun updateSupabaseConfig(url: String, key: String) {
        val cleanUrl = url.trim().trimEnd('/')
        val cleanKey = key.trim()
        prefs.edit()
            .putString(KEY_SUPABASE_URL, cleanUrl)
            .putString(KEY_SUPABASE_ANON_KEY, cleanKey)
            .apply()
        _supabaseUrl.value = cleanUrl
        _supabaseAnonKey.value = cleanKey
    }

    companion object {
        const val THEME_LIGHT = "light"
        const val THEME_DARK = "dark"
        const val THEME_SYSTEM = "system"
        private const val KEY_THEME_PREFERENCE = "key_theme_preference"

        private const val KEY_USER_ID = "key_user_id"
        private const val KEY_AUTH_TOKEN = "key_auth_token"
        private const val KEY_USER_EMAIL = "key_user_email"
        private const val KEY_USER_ROLE = "key_user_role"
        private const val KEY_SUPABASE_URL = "key_supabase_url"
        private const val KEY_SUPABASE_ANON_KEY = "key_supabase_anon_key"
        private const val KEY_GEMINI_API_KEY = "key_gemini_api_key"

        // Default Supabase configuration injected from environment (.env / BuildConfig)
        val DEFAULT_SUPABASE_URL: String = com.example.BuildConfig.SUPABASE_URL.ifBlank {
            "https://your-project.supabase.co"
        }
        val DEFAULT_ANON_KEY: String = com.example.BuildConfig.SUPABASE_ANON_KEY.ifBlank {
            "public-anon-key-placeholder"
        }
    }
}
