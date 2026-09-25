package com.example

import com.example.data.local.SessionManager
import com.example.data.remote.SupabaseClient
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class SupabaseAuthTest {

    @Test
    fun testSupabaseUrlEnforcesHttps() {
        val context = RuntimeEnvironment.getApplication()
        val sessionManager = SessionManager(context)

        sessionManager.updateSupabaseConfig(
            url = "http://myproject.supabase.co/",
            key = "valid-anon-key-12345"
        )

        val client = SupabaseClient(sessionManager)
        assertEquals("https://myproject.supabase.co", client.currentUrl)
        assertTrue(client.isConfigured)
    }

    @Test
    fun testSupabaseUrlPrependsHttpsIfMissing() {
        val context = RuntimeEnvironment.getApplication()
        val sessionManager = SessionManager(context)

        sessionManager.updateSupabaseConfig(
            url = "myproject.supabase.co",
            key = "valid-anon-key-12345"
        )

        val client = SupabaseClient(sessionManager)
        assertEquals("https://myproject.supabase.co", client.currentUrl)
        assertTrue(client.isConfigured)
    }

    @Test
    fun testSupabaseIsConfiguredDetectsPlaceholders() {
        val context = RuntimeEnvironment.getApplication()
        val sessionManager = SessionManager(context)

        sessionManager.updateSupabaseConfig(
            url = "https://your-project.supabase.co",
            key = "your-anon-key"
        )

        val client = SupabaseClient(sessionManager)
        assertFalse(client.isConfigured)
    }

    @Test
    fun testSupabaseResponseParsing() {
        val errorJson = """
            {
                "code": 400,
                "error": "user_already_exists",
                "error_description": "User already registered"
            }
        """.trimIndent()

        val obj = JSONObject(errorJson)
        val description = if (obj.has("error_description")) obj.getString("error_description") else obj.getString("error")
        assertEquals("User already registered", description)
    }

    @Test
    fun testDefaultClientUsesEnvironmentConfig() {
        val context = RuntimeEnvironment.getApplication()
        val sessionManager = SessionManager(context)
        val client = SupabaseClient(sessionManager)

        if (com.example.BuildConfig.SUPABASE_URL.isNotBlank()) {
            assertTrue(client.currentUrl.startsWith("https://"))
        }
    }

    @Test
    fun testFounderEmailConfiguration() {
        assertEquals("emmanuelmatia150@gmail.com", com.example.data.remote.SupabaseAuthService.FOUNDER_EMAIL)
    }

    @Test
    fun testGoogleOAuthUrlGeneration() {
        val context = RuntimeEnvironment.getApplication()
        val sessionManager = SessionManager(context)
        sessionManager.updateSupabaseConfig("https://test.supabase.co", "anon-key-123")
        val client = SupabaseClient(sessionManager)
        val authService = com.example.data.remote.SupabaseAuthService(client, sessionManager)

        val url = authService.getGoogleOAuthUrl()
        assertTrue(url.contains("provider=google"))
        assertTrue(url.contains("panu://auth/callback"))
    }

    @Test
    fun testSessionManagerFounderRoleStorage() {
        val context = RuntimeEnvironment.getApplication()
        val sessionManager = SessionManager(context)

        // Default role is "user"
        assertEquals("user", sessionManager.currentUserRole.value)

        // Save session for founder email
        sessionManager.saveSession("founder-id-123", "jwt-token-xyz", "emmanuelmatia150@gmail.com", "founder")
        assertEquals("founder", sessionManager.currentUserRole.value)
        assertEquals("emmanuelmatia150@gmail.com", sessionManager.currentUserEmail.value)
        assertTrue(sessionManager.isLoggedIn())

        // Clear session resets role
        sessionManager.clearSession()
        assertEquals("user", sessionManager.currentUserRole.value)
        assertFalse(sessionManager.isLoggedIn())
    }
}
