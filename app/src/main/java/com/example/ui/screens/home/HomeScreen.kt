package com.example.ui.screens.home

import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.model.Post
import com.example.data.repository.PostRepository
import com.example.ui.components.AuthRequiredDialog
import com.example.ui.components.InstallAppBanner
import com.example.ui.components.InstallAppDialog
import com.example.ui.components.PanuAvatar
import com.example.ui.components.PanuBottomNav
import com.example.ui.components.PanuEmptyState
import com.example.ui.components.PanuTopBar
import com.example.ui.navigation.PanuScreen
import com.example.ui.theme.PanuTheme
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun HomeScreen(
    postRepository: PostRepository,
    isLoggedIn: Boolean = false,
    isFounder: Boolean = false,
    onNavigate: (String) -> Unit,
    onNavigateToAuth: () -> Unit = {},
    onMenuClick: (() -> Unit)? = null,
    onOpenPublicProfile: (String) -> Unit,
    onNavigateToCreate: () -> Unit,
    onNavigateToStudio: () -> Unit,
    onNavigateToFounder: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToVod: () -> Unit,
    onNavigateToLive: () -> Unit,
    onWatchVideo: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val colors = PanuTheme.colors
    val posts by postRepository.publishedPosts.collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()

    var selectedTab by remember { mutableStateOf("Tendances") }
    val tabs = listOf("Tendances", "Pour vous", "Vidéos")

    // Gating Modal State
    var showAuthModal by remember { mutableStateOf(false) }
    var currentBlockedAction by remember { mutableStateOf("interagir") }

    // Likes state tracker
    val likedPosts = remember { mutableStateMapOf<String, Boolean>() }
    val likesCount = remember { mutableStateMapOf<String, Int>() }

    LaunchedEffect(Unit) {
        postRepository.refreshPublishedPosts()
    }

    // Modal obligatoire d'authentification pour invités
    AuthRequiredDialog(
        isOpen = showAuthModal,
        actionName = currentBlockedAction,
        onDismiss = { showAuthModal = false },
        onNavigateToAuth = {
            showAuthModal = false
            onNavigateToAuth()
        }
    )

    // Dialogue d'installation sans câble USB & PWA
    var showInstallDialog by remember { mutableStateOf(false) }
    InstallAppDialog(
        isOpen = showInstallDialog,
        onDismiss = { showInstallDialog = false }
    )

    fun handleInteractionGated(actionLabel: String, onAllowed: () -> Unit) {
        if (!isLoggedIn) {
            currentBlockedAction = actionLabel
            showAuthModal = true
        } else {
            onAllowed()
        }
    }

    Scaffold(
        topBar = {
            Column {
                PanuTopBar(
                    title = "PANU",
                    subtitle = if (!isLoggedIn) "Mode Invité • Tendances publiques" else "Imaginez. Créez. Publiez.",
                    onMenuClick = onMenuClick,
                    isFounder = isFounder,
                    onFounderClick = onNavigateToFounder,
                    onSettingsClick = onNavigateToSettings,
                    actions = {
                        IconButton(
                            onClick = { showInstallDialog = true },
                            modifier = Modifier.testTag("home_install_btn_top")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Download,
                                contentDescription = "Installer l'application",
                                tint = colors.champagne
                            )
                        }

                        if (!isLoggedIn) {
                            Button(
                                onClick = onNavigateToAuth,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = colors.champagne,
                                    contentColor = if (colors.isDark) colors.background else Color.White
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                modifier = Modifier
                                    .padding(end = 6.dp)
                                    .testTag("home_guest_login_btn")
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Login,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Connexion",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        } else {
                            IconButton(
                                onClick = { scope.launch { postRepository.refreshPublishedPosts() } },
                                modifier = Modifier.testTag("home_refresh_btn")
                            ) {
                                Icon(imageVector = Icons.Default.Refresh, contentDescription = "Actualiser")
                            }
                        }
                    }
                )

                // Onglets Tendances / Feed / Vidéos
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(tabs) { tab ->
                        FilterChip(
                            selected = selectedTab == tab,
                            onClick = { selectedTab = tab },
                            label = {
                                Text(
                                    text = when (tab) {
                                        "Tendances" -> "🔥 Tendances"
                                        "Pour vous" -> "✨ Pour vous"
                                        else -> "🎬 Vidéos & Shorts"
                                    },
                                    fontWeight = if (selectedTab == tab) FontWeight.Bold else FontWeight.Medium
                                )
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = colors.champagne,
                                selectedLabelColor = if (colors.isDark) colors.background else Color.White
                            )
                        )
                    }

                    item {
                        OutlinedButton(
                            onClick = onNavigateToVod,
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("VOD", fontSize = 13.sp)
                        }
                    }

                    item {
                        OutlinedButton(
                            onClick = onNavigateToLive,
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("Live Sports", fontSize = 13.sp)
                        }
                    }
                }

                // Bouton & Bannière proéminente "Installer l'application"
                InstallAppBanner(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    onInstallClick = { showInstallDialog = true }
                )
            }
        },
        bottomBar = {
            PanuBottomNav(
                currentRoute = PanuScreen.Home.route,
                isFounder = isFounder,
                onNavigate = onNavigate
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    handleInteractionGated("publier") {
                        onNavigateToCreate()
                    }
                },
                containerColor = colors.champagne,
                contentColor = if (colors.isDark) colors.background else Color.White,
                shape = CircleShape,
                modifier = Modifier.testTag("home_fab_create")
            ) {
                Icon(Icons.Default.Add, contentDescription = "Créer du contenu")
            }
        },
        containerColor = colors.background
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            val filteredPosts = remember(posts, selectedTab) {
                when (selectedTab) {
                    "Vidéos" -> posts.filter { it.mediaType == "video" || (!it.mediaUrl.isNullOrBlank() && (it.mediaUrl.contains(".mp4") || it.mediaUrl.contains(".mov"))) }
                    else -> posts
                }
            }

            if (filteredPosts.isEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    if (!isLoggedIn) {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 20.dp),
                            colors = CardDefaults.cardColors(containerColor = colors.surface),
                            border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(modifier = Modifier.padding(18.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Whatshot,
                                        contentDescription = null,
                                        tint = colors.champagne,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = "Bienvenue sur le flux public PANU",
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                        color = colors.textPrimary
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Découvrez librement les vidéos et créations de nos créateurs africains. Créez un compte pour interagir et publier.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.textSecondary
                                )
                                Spacer(modifier = Modifier.height(14.dp))
                                Button(
                                    onClick = onNavigateToAuth,
                                    colors = ButtonDefaults.buttonColors(containerColor = colors.champagne)
                                ) {
                                    Text("Rejoindre PANU")
                                }
                            }
                        }
                    }

                    PanuEmptyState(
                        title = "Aucune publication pour le moment",
                        subtitle = "Les créations publiées apparaîtront ici. Actualisez pour charger les dernières tendances.",
                        actionText = "Actualiser le flux",
                        onActionClick = {
                            scope.launch { postRepository.refreshPublishedPosts() }
                        }
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Bannière Mode Invité si non connecté
                    if (!isLoggedIn) {
                        item {
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(14.dp))
                                    .border(1.dp, colors.champagne.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
                                    .clickable { onNavigateToAuth() }
                                    .testTag("guest_mode_banner"),
                                color = colors.champagneSubtle,
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.Lock,
                                        contentDescription = null,
                                        tint = colors.champagne,
                                        modifier = Modifier.size(22.dp)
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Mode Découverte Invité",
                                            fontWeight = FontWeight.Bold,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = colors.textPrimary
                                        )
                                        Text(
                                            text = "Regardez les vidéos librement. Connectez-vous pour liker, commenter et publier.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = colors.textSecondary
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "S'inscrire",
                                        fontWeight = FontWeight.Bold,
                                        color = colors.champagne,
                                        fontSize = 12.sp
                                    )
                                }
                            }
                        }
                    }

                    // Feed de publications et vidéos publiques
                    items(filteredPosts, key = { it.id }) { post ->
                        val isLiked = likedPosts[post.id] ?: false
                        val currentCount = likesCount[post.id] ?: ((post.id.hashCode() % 40) + 12).coerceAtLeast(0)

                        PostCard(
                            post = post,
                            isLiked = isLiked,
                            likesCount = currentCount,
                            onAuthorClick = {
                                val handle = post.authorUsername ?: post.authorName ?: ""
                                if (handle.isNotBlank()) {
                                    onOpenPublicProfile(handle)
                                }
                            },
                            onVideoClick = { videoUrl ->
                                onWatchVideo(videoUrl)
                            },
                            onLikeClick = {
                                handleInteractionGated("liker") {
                                    val newStatus = !isLiked
                                    likedPosts[post.id] = newStatus
                                    likesCount[post.id] = if (newStatus) currentCount + 1 else (currentCount - 1).coerceAtLeast(0)
                                    Toast.makeText(context, if (newStatus) "❤️ Mention J'aime ajoutée" else "Mention retirée", Toast.LENGTH_SHORT).show()
                                }
                            },
                            onCommentClick = {
                                handleInteractionGated("commenter") {
                                    Toast.makeText(context, "Espace commentaires ouvert", Toast.LENGTH_SHORT).show()
                                }
                            },
                            onShareClick = {
                                handleInteractionGated("partager") {
                                    val sendIntent = Intent().apply {
                                        action = Intent.ACTION_SEND
                                        putExtra(Intent.EXTRA_TEXT, "Regardez cette vidéo sur PANU : ${post.title ?: post.content}")
                                        type = "text/plain"
                                    }
                                    val shareIntent = Intent.createChooser(sendIntent, "Partager via")
                                    context.startActivity(shareIntent)
                                }
                            },
                            onDownloadClick = {
                                handleInteractionGated("télécharger") {
                                    Toast.makeText(context, "Téléchargement de la vidéo initié", Toast.LENGTH_SHORT).show()
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun PostCard(
    post: Post,
    isLiked: Boolean = false,
    likesCount: Int = 14,
    onAuthorClick: () -> Unit,
    onVideoClick: (String) -> Unit = {},
    onLikeClick: () -> Unit = {},
    onCommentClick: () -> Unit = {},
    onShareClick: () -> Unit = {},
    onDownloadClick: () -> Unit = {}
) {
    val colors = PanuTheme.colors
    val isVideo = post.mediaType == "video" || (!post.mediaUrl.isNullOrBlank() && (post.mediaUrl.endsWith(".mp4", true) || post.mediaUrl.endsWith(".mov", true)))

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("post_card_${post.id}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Auteur & Badge public
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onAuthorClick() },
                verticalAlignment = Alignment.CenterVertically
            ) {
                PanuAvatar(
                    avatarUrl = post.authorAvatarUrl,
                    fullName = post.authorName ?: post.authorUsername ?: "Auteur",
                    size = 42.dp
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = post.authorName ?: post.authorUsername ?: "Créateur PANU",
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                        color = colors.textPrimary
                    )
                    Text(
                        text = if (!post.authorUsername.isNullOrBlank()) "@${post.authorUsername}" else "Membre",
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.textSecondary
                    )
                }
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = colors.surfaceElevated
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Public,
                            contentDescription = null,
                            tint = colors.champagne,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Public",
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.champagne,
                            fontSize = 10.sp
                        )
                    }
                }
            }

            if (!post.title.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = post.title,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = colors.textPrimary
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = post.content,
                style = MaterialTheme.typography.bodyMedium,
                color = colors.textPrimary,
                lineHeight = 22.sp
            )

            // Contenu Média (Vidéo ou Image)
            if (!post.mediaUrl.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(12.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(230.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(colors.surfaceElevated)
                        .border(1.dp, colors.surfaceBorder, RoundedCornerShape(12.dp))
                        .clickable {
                            if (isVideo) {
                                onVideoClick(post.mediaUrl)
                            }
                        }
                ) {
                    AsyncImage(
                        model = post.mediaUrl,
                        contentDescription = "Média de la publication",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )

                    // Overlay vidéo avec badge Lecture
                    if (isVideo) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.3f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(54.dp)
                                    .clip(CircleShape)
                                    .background(colors.champagne.copy(alpha = 0.9f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.PlayArrow,
                                    contentDescription = "Regarder la vidéo",
                                    tint = if (colors.isDark) colors.background else Color.White,
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                        }

                        // Badge vidéo en bas à gauche
                        Surface(
                            shape = RoundedCornerShape(topEnd = 6.dp),
                            color = Color.Black.copy(alpha = 0.7f),
                            modifier = Modifier.align(Alignment.BottomStart)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Videocam,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Vidéo HD", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // ============================================================
            // BARRE D'INTERACTIONS (LIKER, COMMENTER, TÉLÉCHARGER, PARTAGER)
            // ============================================================
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Like Button
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clickable { onLikeClick() }
                        .padding(vertical = 4.dp)
                        .testTag("btn_like_${post.id}")
                ) {
                    Icon(
                        imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Liker",
                        tint = if (isLiked) Color(0xFFFF4757) else colors.textSecondary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "$likesCount",
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                        color = if (isLiked) Color(0xFFFF4757) else colors.textSecondary
                    )
                }

                // Comment Button
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clickable { onCommentClick() }
                        .padding(vertical = 4.dp)
                        .testTag("btn_comment_${post.id}")
                ) {
                    Icon(
                        imageVector = Icons.Default.ChatBubbleOutline,
                        contentDescription = "Commenter",
                        tint = colors.textSecondary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Commenter",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.textSecondary
                    )
                }

                // Download Button
                IconButton(
                    onClick = onDownloadClick,
                    modifier = Modifier
                        .size(32.dp)
                        .testTag("btn_download_${post.id}")
                ) {
                    Icon(
                        imageVector = Icons.Default.Download,
                        contentDescription = "Télécharger la vidéo",
                        tint = colors.textSecondary,
                        modifier = Modifier.size(19.dp)
                    )
                }

                // Share Button
                IconButton(
                    onClick = onShareClick,
                    modifier = Modifier
                        .size(32.dp)
                        .testTag("btn_share_${post.id}")
                ) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = "Partager",
                        tint = colors.textSecondary,
                        modifier = Modifier.size(19.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            val dateStr = SimpleDateFormat("dd MMM yyyy", Locale.FRENCH).format(Date(post.createdAt))
            Text(
                text = dateStr,
                style = MaterialTheme.typography.labelSmall,
                color = colors.textMuted
            )
        }
    }
}
