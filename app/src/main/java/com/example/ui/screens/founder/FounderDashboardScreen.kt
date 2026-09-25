package com.example.ui.screens.founder

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.local.SessionManager
import com.example.data.model.Post
import com.example.data.model.UserProfile
import com.example.data.model.UserRole
import com.example.data.remote.FounderAIGeneration
import com.example.data.remote.FounderStats
import com.example.data.remote.SystemHealthStatus
import com.example.data.repository.FounderRepository
import com.example.ui.components.PanuTopBar
import com.example.ui.theme.PanuError
import com.example.ui.theme.PanuTheme
import kotlinx.coroutines.launch

@Composable
fun FounderDashboardScreen(
    founderRepository: FounderRepository,
    sessionManager: SessionManager,
    initialTab: String = "dashboard",
    onNavigateBack: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    val colors = PanuTheme.colors
    val currentRole by sessionManager.currentUserRole.collectAsState()
    val isFounder = currentRole.equals(UserRole.FOUNDER.value, ignoreCase = true) ||
            currentRole.equals(UserRole.ADMIN.value, ignoreCase = true)

    val tabTitles = listOf(
        "Tableau de bord",
        "Utilisateurs",
        "Publications",
        "Créations",
        "Statistiques",
        "Studio IA / PANU AI",
        "Gestion des crédits",
        "Paramètres",
        "Sécurité"
    )

    val initialIndex = when (initialTab.lowercase()) {
        "users", "utilisateurs" -> 1
        "publications", "posts", "contenus" -> 2
        "creations", "créations" -> 3
        "stats", "statistiques" -> 4
        "ai", "panu_ai", "studio" -> 5
        "credits", "crédits" -> 6
        "settings", "parametres", "paramètres" -> 7
        "security", "securite", "sécurité" -> 8
        else -> 0
    }
    var selectedTabIndex by remember { mutableIntStateOf(initialIndex) }

    var stats by remember { mutableStateOf<FounderStats?>(null) }
    var healthStatus by remember { mutableStateOf<SystemHealthStatus?>(null) }
    var usersList by remember { mutableStateOf<List<UserProfile>>(emptyList()) }
    var postsList by remember { mutableStateOf<List<Post>>(emptyList()) }
    var aiGenerationsList by remember { mutableStateOf<List<FounderAIGeneration>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    fun loadData() {
        if (!isFounder) return
        isLoading = true
        scope.launch {
            founderRepository.getPlatformStats().onSuccess { stats = it }
            founderRepository.checkSystemHealth().onSuccess { healthStatus = it }
            founderRepository.getAllUsers().onSuccess { usersList = it }
            founderRepository.getAllPosts().onSuccess { postsList = it }
            founderRepository.getAllAIGenerations().onSuccess { aiGenerationsList = it }
            isLoading = false
        }
    }

    LaunchedEffect(isFounder) {
        loadData()
    }

    Scaffold(
        topBar = {
            PanuTopBar(
                title = "PANU Founder",
                subtitle = "Console de Contrôle Supabase",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack,
                onSettingsClick = onNavigateToSettings,
                actions = {
                    if (isFounder) {
                        IconButton(
                            onClick = { loadData() },
                            modifier = Modifier.testTag("founder_refresh_btn")
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = "Actualiser", tint = colors.champagne)
                        }
                    }
                }
            )
        },
        containerColor = colors.background
    ) { padding ->
        // STRICT SECURITY GATE:
        // Accessible ONLY to accounts verified with role "founder" or "admin" in Supabase session
        if (!isFounder) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = colors.surfaceElevated),
                    border = androidx.compose.foundation.BorderStroke(1.dp, PanuError.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().testTag("founder_access_denied_card")
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(PanuError.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Block,
                                contentDescription = null,
                                tint = PanuError,
                                modifier = Modifier.size(32.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Accès Refusé — Rôle Invalide",
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                            color = PanuError
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Ce tableau de bord est réservé aux comptes possédant le rôle sécurisé 'founder' dans Supabase PostgreSQL. Votre rôle actuel est : '$currentRole'.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = colors.textSecondary,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = onNavigateBack,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.champagne,
                                contentColor = if (colors.isDark) colors.background else androidx.compose.ui.graphics.Color.White
                            ),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Retour à l'application", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        } else if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = colors.champagne)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                // Navigation Tabs for the 9 Founder Sections
                ScrollableTabRow(
                    selectedTabIndex = selectedTabIndex,
                    containerColor = colors.surface,
                    contentColor = colors.champagne,
                    edgePadding = 12.dp,
                    indicator = { tabPositions ->
                        if (selectedTabIndex < tabPositions.size) {
                            TabRowDefaults.SecondaryIndicator(
                                Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex]),
                                color = colors.champagne
                            )
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, colors.surfaceBorder)
                        .testTag("founder_subnav_tabs")
                ) {
                    tabTitles.forEachIndexed { index, title ->
                        Tab(
                            selected = selectedTabIndex == index,
                            onClick = { selectedTabIndex = index },
                            text = {
                                Text(
                                    text = title,
                                    style = MaterialTheme.typography.labelMedium.copy(
                                        fontWeight = if (selectedTabIndex == index) FontWeight.Bold else FontWeight.Normal
                                    ),
                                    color = if (selectedTabIndex == index) colors.champagne else colors.textSecondary
                                )
                            },
                            modifier = Modifier.testTag("founder_tab_$index")
                        )
                    }
                }

                // Tab Content
                when (selectedTabIndex) {
                    0 -> FounderOverviewTab(
                        stats = stats ?: FounderStats(),
                        healthStatus = healthStatus,
                        recentUsers = usersList.take(5),
                        recentPosts = postsList.take(5),
                        onSwitchTab = { selectedTabIndex = it }
                    )
                    1 -> FounderUsersTab(
                        usersList = usersList,
                        postsList = postsList,
                        searchQuery = searchQuery,
                        onSearchChange = { searchQuery = it },
                        onUpdateUserRole = { userId, newRole ->
                            scope.launch {
                                founderRepository.updateUserRole(userId, newRole)
                                loadData()
                            }
                        },
                        onAllocateCredits = { userId, delta, reason ->
                            scope.launch {
                                founderRepository.allocateUserCredits(userId, delta, reason)
                                loadData()
                            }
                        }
                    )
                    2 -> FounderPublicationsTab(
                        postsList = postsList,
                        onToggleArchive = { postId, isArchived ->
                            scope.launch {
                                founderRepository.toggleArchivePost(postId, !isArchived)
                                loadData()
                            }
                        },
                        onDeletePost = { postId ->
                            scope.launch {
                                founderRepository.deletePost(postId)
                                loadData()
                            }
                        }
                    )
                    3 -> FounderCreationsTab(
                        generationsList = aiGenerationsList
                    )
                    4 -> FounderStatsTab(
                        stats = stats ?: FounderStats(),
                        totalUsers = usersList.size,
                        totalPosts = postsList.size,
                        totalGenerations = aiGenerationsList.size
                    )
                    5 -> FounderStudioAiTab(
                        generationsList = aiGenerationsList,
                        totalCreditsUsed = stats?.totalCreditsUsed ?: 0
                    )
                    6 -> FounderCreditsTab(
                        usersList = usersList,
                        totalCreditsUsed = stats?.totalCreditsUsed ?: 0,
                        onAllocateCredits = { userId, delta, reason ->
                            scope.launch {
                                founderRepository.allocateUserCredits(userId, delta, reason)
                                loadData()
                            }
                        }
                    )
                    7 -> FounderSettingsTab(
                        healthStatus = healthStatus,
                        onNavigateToAppSettings = onNavigateToSettings
                    )
                    8 -> FounderSecurityTab(
                        currentRole = currentRole,
                        healthStatus = healthStatus
                    )
                }
            }
        }
    }
}
