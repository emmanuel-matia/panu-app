package com.example

import android.content.Context
import com.example.data.local.AppDatabase
import com.example.data.local.SessionManager
import com.example.data.remote.SupabaseAuthService
import com.example.data.remote.SupabaseClient
import com.example.data.remote.SupabaseCreditService
import com.example.data.remote.SupabaseFounderService
import com.example.data.remote.SupabasePostService
import com.example.data.remote.SupabaseProfileService
import com.example.data.remote.SupabaseStorageService
import com.example.data.remote.RetrofitClient
import com.example.data.repository.GeminiRepository
import com.example.data.repository.AuthRepository
import com.example.data.repository.ContentRepository
import com.example.data.repository.CreditRepository
import com.example.data.repository.FounderRepository
import com.example.data.repository.PostRepository
import com.example.data.repository.ProfileRepository
import com.example.data.remote.SupabaseContentService
import com.example.data.repository.ai.AIProvider
import com.example.data.repository.ai.CreativeMediaService
import com.example.data.repository.ai.GeminiAIProvider
import com.example.data.repository.ai.GroundingService

class PanuAppContainer(context: Context) {
    val database: AppDatabase = AppDatabase.getInstance(context)
    val sessionManager: SessionManager = SessionManager(context)
    val supabaseClient: SupabaseClient = SupabaseClient(sessionManager)

    val authService: SupabaseAuthService = SupabaseAuthService(supabaseClient, sessionManager)
    val profileService: SupabaseProfileService = SupabaseProfileService(supabaseClient)
    val postService: SupabasePostService = SupabasePostService(supabaseClient)
    val storageService: SupabaseStorageService = SupabaseStorageService(supabaseClient, context)
    val founderService: SupabaseFounderService = SupabaseFounderService(supabaseClient)
    val creditService: SupabaseCreditService = SupabaseCreditService(supabaseClient)

    val authRepository: AuthRepository = AuthRepository(
        authService = authService,
        profileService = profileService,
        profileDao = database.profileDao(),
        sessionManager = sessionManager
    )

    val profileRepository: ProfileRepository = ProfileRepository(
        profileService = profileService,
        storageService = storageService,
        profileDao = database.profileDao(),
        socialLinksDao = database.socialLinksDao(),
        sessionManager = sessionManager
    )

    val postRepository: PostRepository = PostRepository(
        postService = postService,
        storageService = storageService,
        postDao = database.postDao()
    )

    val founderRepository: FounderRepository = FounderRepository(
        founderService = founderService,
        profileDao = database.profileDao(),
        postDao = database.postDao(),
        creditDao = database.creditDao()
    )

    val creditRepository: CreditRepository = CreditRepository(
        creditService = creditService,
        creditDao = database.creditDao()
    )

    val contentRepository: ContentRepository = ContentRepository(
        contentService = SupabaseContentService(supabaseClient)
    )

    val geminiRepository: GeminiRepository = GeminiRepository(
        apiService = RetrofitClient.geminiService,
        apiKey = BuildConfig.GEMINI_API_KEY
    )

    val aiProvider: AIProvider = GeminiAIProvider(sessionManager)
    val creativeMediaService: CreativeMediaService = CreativeMediaService(sessionManager)
    val groundingService: GroundingService = GroundingService(sessionManager)
}
