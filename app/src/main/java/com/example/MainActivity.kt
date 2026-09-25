package com.example

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Surface
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import com.example.ui.viewmodel.AuthViewModel
import com.example.ui.viewmodel.VodViewModel
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavType
import androidx.compose.runtime.remember
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.data.local.SessionManager
import com.example.data.model.UserRole
import com.example.ui.components.PanuDrawerSheetContent
import com.example.ui.navigation.PanuScreen
import com.example.ui.screens.activity.ActivityScreen
import com.example.ui.screens.auth.ForgotPasswordScreen
import com.example.ui.screens.auth.LoginScreen
import com.example.ui.screens.auth.RegisterScreen
import com.example.ui.screens.create.CreatePostScreen
import com.example.ui.screens.founder.FounderDashboardScreen
import com.example.ui.screens.home.HomeScreen
import com.example.ui.screens.profile.EditProfileScreen
import com.example.ui.screens.profile.ProfileScreen
import com.example.ui.screens.publicprofile.PublicProfileScreen
import com.example.ui.screens.settings.SupabaseSettingsScreen
import com.example.ui.screens.studio.StudioScreen
import com.example.ui.screens.vod.VodHomeScreen
import com.example.ui.screens.vod.VideoPlayerScreen
import com.example.ui.screens.live.LiveSportsScreen
import com.example.ui.theme.PanuTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var container: PanuAppContainer

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Forcer la langue par défaut de l'interface en Français (fr-FR)
        val frenchLocale = java.util.Locale("fr", "FR")
        java.util.Locale.setDefault(frenchLocale)
        val config = resources.configuration
        config.setLocale(frenchLocale)
        @Suppress("DEPRECATION")
        resources.updateConfiguration(config, resources.displayMetrics)

        container = PanuAppContainer(this)

        // Process incoming OAuth redirect if app was opened via panu://auth/callback
        handleAuthIntent(intent)

        // Restore & verify session validity with Supabase
        lifecycleScope.launch {
            container.authRepository.verifySession()
        }

        setContent {
            val themePref by container.sessionManager.themePreference.collectAsState()
            val systemIsDark = isSystemInDarkTheme()
            val isDark = when (themePref) {
                SessionManager.THEME_LIGHT -> false
                SessionManager.THEME_DARK -> true
                SessionManager.THEME_SYSTEM -> systemIsDark
                else -> false // Mode clair par défaut pour les nouveaux utilisateurs
            }

            PanuTheme(darkTheme = isDark) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = PanuTheme.colors.background
                ) {
                    PanuAppNavHost(container = container)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleAuthIntent(intent)
    }

    private fun handleAuthIntent(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme == "panu" && uri.host == "auth") {
            lifecycleScope.launch {
                container.authRepository.handleOAuthCallback(uri.toString())
            }
        }
    }
}

@Composable
fun PanuAppNavHost(container: PanuAppContainer) {
    val navController = rememberNavController()
    val scope = rememberCoroutineScope()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)

    val currentRole by container.sessionManager.currentUserRole.collectAsState()
    val currentUserId by container.sessionManager.currentUserId.collectAsState()
    val userProfile by container.profileRepository.getProfileFlow(currentUserId ?: "").collectAsState(initial = null)

    // Strict Founder check: verified only if role in Supabase session is 'founder' or 'admin'
    val isFounder = currentRole.equals(UserRole.FOUNDER.value, ignoreCase = true) ||
            currentRole.equals(UserRole.ADMIN.value, ignoreCase = true)

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val isUserLoggedIn = !currentUserId.isNullOrBlank()
    val startDestination = PanuScreen.Home.route

    val isAuthScreen = currentRoute in listOf(
        PanuScreen.Login.route,
        PanuScreen.Register.route,
        PanuScreen.ForgotPassword.route
    )

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = !isAuthScreen,
        drawerContent = {
            PanuDrawerSheetContent(
                currentRoute = currentRoute,
                userProfile = userProfile,
                isFounder = isFounder,
                onNavigate = { route ->
                    navController.navigate(route) {
                        launchSingleTop = true
                    }
                },
                onLogoutClick = {
                    scope.launch {
                        container.authRepository.logout()
                        navController.navigate(PanuScreen.Home.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                },
                onCloseDrawer = {
                    scope.launch { drawerState.close() }
                }
            )
        }
    ) {
        NavHost(
            navController = navController,
            startDestination = startDestination
        ) {
            // --- Authentication ---
            composable(PanuScreen.Login.route) {
                LoginScreen(
                    authRepository = container.authRepository,
                    profileRepository = container.profileRepository,
                    initialTab = 1,
                    onLoginSuccess = {
                        val target = if (isFounder) {
                            PanuScreen.Founder.createRoute("dashboard")
                        } else {
                            PanuScreen.Home.route
                        }
                        navController.navigate(target) {
                            popUpTo(PanuScreen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateToForgotPassword = {
                        navController.navigate(PanuScreen.ForgotPassword.route)
                    },
                    onNavigateToSettings = {
                        navController.navigate(PanuScreen.Settings.route)
                    },
                    onContinueAsGuest = {
                        navController.navigate(PanuScreen.Home.route) {
                            popUpTo(PanuScreen.Login.route) { inclusive = true }
                        }
                    }
                )
            }

            composable(PanuScreen.Register.route) {
                LoginScreen(
                    authRepository = container.authRepository,
                    profileRepository = container.profileRepository,
                    initialTab = 0,
                    onLoginSuccess = {
                        navController.navigate(PanuScreen.Home.route) {
                            popUpTo(PanuScreen.Register.route) { inclusive = true }
                        }
                    },
                    onNavigateToForgotPassword = {
                        navController.navigate(PanuScreen.ForgotPassword.route)
                    },
                    onNavigateToSettings = {
                        navController.navigate(PanuScreen.Settings.route)
                    },
                    onContinueAsGuest = {
                        navController.navigate(PanuScreen.Home.route) {
                            popUpTo(PanuScreen.Register.route) { inclusive = true }
                        }
                    }
                )
            }

            composable(PanuScreen.ForgotPassword.route) {
                ForgotPasswordScreen(
                    authRepository = container.authRepository,
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }

            // --- Core App Navigation ---
            composable(PanuScreen.Home.route) {
                HomeScreen(
                    postRepository = container.postRepository,
                    isLoggedIn = isUserLoggedIn,
                    isFounder = isFounder,
                    onNavigate = { route ->
                        if (route != PanuScreen.Home.route) {
                            navController.navigate(route) {
                                launchSingleTop = true
                            }
                        }
                    },
                    onNavigateToAuth = {
                        navController.navigate(PanuScreen.Login.route)
                    },
                    onMenuClick = {
                        scope.launch { drawerState.open() }
                    },
                    onOpenPublicProfile = { handle ->
                        navController.navigate(PanuScreen.PublicProfile.createRoute(handle))
                    },
                    onNavigateToCreate = {
                        navController.navigate(PanuScreen.Create.route)
                    },
                    onNavigateToStudio = {
                        navController.navigate(PanuScreen.Studio.route)
                    },
                    onNavigateToFounder = {
                        navController.navigate(PanuScreen.Founder.createRoute("dashboard"))
                    },
                    onNavigateToSettings = {
                        navController.navigate(PanuScreen.Settings.route)
                    },
                    onNavigateToVod = {
                        navController.navigate(PanuScreen.VodHome.route)
                    },
                    onNavigateToLive = {
                        navController.navigate(PanuScreen.LiveSports.route)
                    },
                    onWatchVideo = { url ->
                        try {
                            val encoded = java.net.URLEncoder.encode(url, "UTF-8")
                            navController.navigate(PanuScreen.VodPlayer.createRoute(encoded))
                        } catch (_: Exception) {
                            navController.navigate(PanuScreen.VodPlayer.createRoute(url))
                        }
                    }
                )
            }

            // 🎬 VOD & Live
            composable(PanuScreen.VodHome.route) {
                val vodViewModel = remember(container.contentRepository, currentUserId) {
                    VodViewModel(container.contentRepository, currentUserId)
                }
                VodHomeScreen(
                    viewModel = vodViewModel,
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToPlayer = { url ->
                        try {
                            val encoded = java.net.URLEncoder.encode(url, "UTF-8")
                            navController.navigate(PanuScreen.VodPlayer.createRoute(encoded))
                        } catch (_: Exception) {
                            navController.navigate(PanuScreen.VodPlayer.createRoute(url))
                        }
                    }
                )
            }
            composable(
                route = PanuScreen.VodPlayer.route,
                arguments = listOf(navArgument("url") { type = NavType.StringType })
            ) { backStackEntry ->
                val url = java.net.URLDecoder.decode(backStackEntry.arguments?.getString("url") ?: "", "UTF-8")
                VideoPlayerScreen(videoUrl = url)
            }
            composable(PanuScreen.LiveSports.route) {
                LiveSportsScreen(onNavigateToPlayer = { url -> navController.navigate(PanuScreen.VodPlayer.createRoute(url)) })
            }

            // 🎨 Studio IA
            composable(PanuScreen.Studio.route) {
                StudioScreen(
                    mediaService = container.creativeMediaService,
                    groundingService = container.groundingService,
                    geminiRepository = container.geminiRepository
                )
            }

            // Create Post
            composable(PanuScreen.Create.route) {
                CreatePostScreen(
                    postRepository = container.postRepository,
                    profileRepository = container.profileRepository,
                    sessionManager = container.sessionManager,
                    isFounder = isFounder,
                    onNavigate = { route ->
                        if (route != PanuScreen.Create.route) {
                            navController.navigate(route) {
                                launchSingleTop = true
                            }
                        }
                    },
                    onNavigateToHome = {
                        navController.navigate(PanuScreen.Home.route) {
                            popUpTo(PanuScreen.Home.route) { inclusive = true }
                        }
                    },
                    onNavigateToFounder = {
                        navController.navigate(PanuScreen.Founder.createRoute("dashboard"))
                    },
                    onNavigateToSettings = {
                        navController.navigate(PanuScreen.Settings.route)
                    }
                )
            }

            // 📹 Mes créations (both 'creations' and 'activity' routes)
            composable(PanuScreen.Creations.route) {
                ActivityScreen(
                    postRepository = container.postRepository,
                    sessionManager = container.sessionManager,
                    isFounder = isFounder,
                    onNavigate = { route ->
                        if (route != PanuScreen.Creations.route) {
                            navController.navigate(route) {
                                launchSingleTop = true
                            }
                        }
                    },
                    onMenuClick = {
                        scope.launch { drawerState.open() }
                    },
                    onNavigateToCreate = {
                        navController.navigate(PanuScreen.Create.route)
                    },
                    onNavigateToFounder = {
                        navController.navigate(PanuScreen.Founder.createRoute("dashboard"))
                    },
                    onNavigateToSettings = {
                        navController.navigate(PanuScreen.Settings.route)
                    }
                )
            }

            composable(PanuScreen.Activity.route) {
                ActivityScreen(
                    postRepository = container.postRepository,
                    sessionManager = container.sessionManager,
                    isFounder = isFounder,
                    onNavigate = { route ->
                        if (route != PanuScreen.Activity.route) {
                            navController.navigate(route) {
                                launchSingleTop = true
                            }
                        }
                    },
                    onMenuClick = {
                        scope.launch { drawerState.open() }
                    },
                    onNavigateToCreate = {
                        navController.navigate(PanuScreen.Create.route)
                    },
                    onNavigateToFounder = {
                        navController.navigate(PanuScreen.Founder.createRoute("dashboard"))
                    },
                    onNavigateToSettings = {
                        navController.navigate(PanuScreen.Settings.route)
                    }
                )
            }

            // 👤 Mon profil
            composable(PanuScreen.Profile.route) {
                ProfileScreen(
                    profileRepository = container.profileRepository,
                    authRepository = container.authRepository,
                    sessionManager = container.sessionManager,
                    isFounder = isFounder,
                    onNavigate = { route ->
                        if (route != PanuScreen.Profile.route) {
                            navController.navigate(route) {
                                launchSingleTop = true
                            }
                        }
                    },
                    onMenuClick = {
                        scope.launch { drawerState.open() }
                    },
                    onOpenPublicProfile = { handle ->
                        navController.navigate(PanuScreen.PublicProfile.createRoute(handle))
                    },
                    onLogout = {
                        scope.launch {
                            container.authRepository.logout()
                            navController.navigate(PanuScreen.Login.route) {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    },
                    onNavigateToFounder = {
                        navController.navigate(PanuScreen.Founder.createRoute("dashboard"))
                    },
                    onNavigateToSettings = {
                        navController.navigate(PanuScreen.Settings.route)
                    }
                )
            }

            // 👤 Modifier mon profil
            composable(PanuScreen.EditProfile.route) {
                EditProfileScreen(
                    profileRepository = container.profileRepository,
                    sessionManager = container.sessionManager,
                    isFounder = isFounder,
                    onNavigateBack = {
                        navController.popBackStack()
                    },
                    onSavedSuccess = {
                        navController.popBackStack()
                    },
                    onNavigateToSettings = {
                        navController.navigate(PanuScreen.Settings.route)
                    }
                )
            }

            // 🌐 Profil public
            composable(
                route = PanuScreen.PublicProfile.route,
                arguments = listOf(
                    navArgument("username") {
                        type = NavType.StringType
                    }
                )
            ) { backStackEntry ->
                val username = backStackEntry.arguments?.getString("username") ?: ""
                PublicProfileScreen(
                    username = username,
                    profileRepository = container.profileRepository,
                    postRepository = container.postRepository,
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }

            // 👑 Founder Dashboard (Strictly protected by RLS and Role checks)
            composable(
                route = PanuScreen.Founder.route,
                arguments = listOf(
                    navArgument("tab") {
                        type = NavType.StringType
                        defaultValue = "dashboard"
                        nullable = true
                    }
                )
            ) { backStackEntry ->
                val tab = backStackEntry.arguments?.getString("tab") ?: "dashboard"
                FounderDashboardScreen(
                    founderRepository = container.founderRepository,
                    sessionManager = container.sessionManager,
                    initialTab = tab,
                    onNavigateBack = {
                        navController.popBackStack()
                    },
                    onNavigateToSettings = {
                        navController.navigate(PanuScreen.Settings.route)
                    }
                )
            }

            // ⚙️ Paramètres
            composable(PanuScreen.Settings.route) {
                SupabaseSettingsScreen(
                    sessionManager = container.sessionManager,
                    supabaseClient = container.supabaseClient,
                    profileRepository = container.profileRepository,
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
        }
    }
}
