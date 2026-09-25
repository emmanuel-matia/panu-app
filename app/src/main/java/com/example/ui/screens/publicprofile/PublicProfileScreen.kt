package com.example.ui.screens.publicprofile

import android.content.Intent
import android.net.Uri
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
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.SocialLinks
import com.example.data.model.UserProfile
import com.example.data.repository.PostRepository
import com.example.data.repository.ProfileRepository
import com.example.ui.components.PanuAvatar
import com.example.ui.components.PanuRoleBadge
import com.example.ui.components.PanuTopBar
import com.example.ui.screens.home.PostCard
import com.example.ui.theme.PanuGold
import com.example.ui.theme.PanuGoldDark
import com.example.ui.theme.PanuGoldLight
import com.example.ui.theme.PanuObsidian
import com.example.ui.theme.PanuSurfaceBorder
import com.example.ui.theme.PanuSurfaceDark
import com.example.ui.theme.PanuSurfaceElevated
import com.example.ui.theme.PanuTerracotta
import com.example.ui.theme.PanuTextMutedDark
import com.example.ui.theme.PanuTextPrimaryDark
import com.example.ui.theme.PanuTextSecondaryDark

data class SocialLinkItem(
    val name: String,
    val url: String,
    val color: androidx.compose.ui.graphics.Color
)

@Composable
fun PublicProfileScreen(
    username: String,
    profileRepository: ProfileRepository,
    postRepository: PostRepository,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    var profile by remember { mutableStateOf<UserProfile?>(null) }
    var socialLinks by remember { mutableStateOf<SocialLinks?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    val cleanUsername = username.removePrefix("@")
    val authorPosts by postRepository.getPublicAuthorPosts(profile?.id ?: "").collectAsState(initial = emptyList())

    LaunchedEffect(cleanUsername) {
        isLoading = true
        val res = profileRepository.getPublicProfile(cleanUsername)
        if (res.isSuccess) {
            profile = res.getOrNull()
            profile?.let { p ->
                val linksRes = profileRepository.refreshSocialLinks(p.id)
                socialLinks = linksRes.getOrNull()
                postRepository.refreshUserPosts(p.id)
            }
        }
        isLoading = false
    }

    val colors = com.example.ui.theme.PanuTheme.colors
    val socialList = remember(socialLinks, colors) {
        val s = socialLinks
        val list = mutableListOf<SocialLinkItem>()
        if (s != null) {
            if (!s.whatsapp.isNullOrBlank()) list.add(SocialLinkItem("WhatsApp", s.whatsapp, colors.champagne))
            if (!s.instagram.isNullOrBlank()) list.add(SocialLinkItem("Instagram", s.instagram, colors.champagneLight))
            if (!s.tiktok.isNullOrBlank()) list.add(SocialLinkItem("TikTok", s.tiktok, colors.textPrimary))
            if (!s.youtube.isNullOrBlank()) list.add(SocialLinkItem("YouTube", s.youtube, colors.champagne))
            if (!s.facebook.isNullOrBlank()) list.add(SocialLinkItem("Facebook", s.facebook, colors.champagneDark))
            if (!s.x.isNullOrBlank()) list.add(SocialLinkItem("X", s.x, colors.textPrimary))
            if (!s.website.isNullOrBlank()) list.add(SocialLinkItem("Site Web", s.website, colors.champagne))
        }
        list
    }

    Scaffold(
        topBar = {
            PanuTopBar(
                title = "@$cleanUsername",
                subtitle = "Profil Public PANU",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack,
                actions = {
                    IconButton(
                        onClick = {
                            val sendIntent = Intent().apply {
                                action = Intent.ACTION_SEND
                                putExtra(Intent.EXTRA_TEXT, "Découvrez le profil de @$cleanUsername sur PANU : panu.app/@$cleanUsername")
                                type = "text/plain"
                            }
                            context.startActivity(Intent.createChooser(sendIntent, "Partager le profil"))
                        },
                        modifier = Modifier.testTag("public_profile_share_btn")
                    ) {
                        Icon(Icons.Default.Share, contentDescription = "Partager", tint = PanuGold)
                    }
                }
            )
        },
        containerColor = PanuObsidian
    ) { padding ->
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = PanuTerracotta)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    // Public Bio Card
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("public_profile_card"),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = PanuSurfaceDark),
                        border = androidx.compose.foundation.BorderStroke(1.dp, PanuSurfaceBorder)
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            PanuAvatar(
                                avatarUrl = profile?.avatarUrl,
                                fullName = profile?.displayName ?: cleanUsername,
                                size = 96.dp,
                                borderWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                text = profile?.displayName ?: cleanUsername,
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Black),
                                color = PanuTextPrimaryDark
                            )
                            Text(
                                text = "@$cleanUsername",
                                style = MaterialTheme.typography.bodyMedium,
                                color = PanuGoldLight
                            )

                            Spacer(modifier = Modifier.height(8.dp))
                            profile?.let { PanuRoleBadge(it.userRole) }

                            if (!profile?.bio.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(14.dp))
                                Text(
                                    text = profile?.bio ?: "",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = PanuTextSecondaryDark,
                                    textAlign = TextAlign.Center,
                                    lineHeight = 22.sp
                                )
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // Metadata row (Location, Category)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (!profile?.location.isNullOrBlank()) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = PanuGold, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(profile?.location ?: "", style = MaterialTheme.typography.labelSmall, color = PanuTextSecondaryDark)
                                    }
                                    Spacer(modifier = Modifier.width(16.dp))
                                }
                                if (!profile?.category.isNullOrBlank()) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Category, contentDescription = null, tint = PanuGold, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(profile?.category ?: "", style = MaterialTheme.typography.labelSmall, color = PanuTextSecondaryDark)
                                    }
                                }
                            }

                            // Social buttons
                            if (socialList.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(20.dp))
                                Text(
                                    text = "Réseaux & Contact",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                    color = PanuGoldDark
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    items(socialList) { item ->
                                        Surface(
                                            modifier = Modifier
                                                .clickable {
                                                    try {
                                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(item.url))
                                                        context.startActivity(intent)
                                                    } catch (_: Exception) {}
                                                }
                                                .testTag("public_link_${item.name.lowercase()}"),
                                            shape = RoundedCornerShape(10.dp),
                                            color = PanuSurfaceElevated,
                                            border = androidx.compose.foundation.BorderStroke(1.dp, PanuSurfaceBorder)
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(8.dp)
                                                        .clip(CircleShape)
                                                        .background(item.color)
                                                )
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    text = item.name,
                                                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                                    color = PanuTextPrimaryDark
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    Text(
                        text = "Publications de @$cleanUsername (${authorPosts.size})",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = PanuTextPrimaryDark
                    )
                }

                if (authorPosts.isEmpty()) {
                    item {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            color = PanuSurfaceDark,
                            border = androidx.compose.foundation.BorderStroke(1.dp, PanuSurfaceBorder)
                        ) {
                            Text(
                                text = "Aucune création publiée pour le moment.",
                                color = PanuTextSecondaryDark,
                                style = MaterialTheme.typography.bodyMedium,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(24.dp)
                            )
                        }
                    }
                } else {
                    items(authorPosts, key = { it.id }) { post ->
                        PostCard(post = post, onAuthorClick = {})
                    }
                }
            }
        }
    }
}
