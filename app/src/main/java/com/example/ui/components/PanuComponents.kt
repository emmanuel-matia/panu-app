package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.DynamicFeed
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.VideoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.model.UserRole
import com.example.ui.navigation.PanuScreen
import com.example.ui.theme.PanuEmerald
import com.example.ui.theme.PanuTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PanuTopBar(
    title: String = "PANU",
    subtitle: String? = "Imaginez. Créez. Publiez.",
    canNavigateBack: Boolean = false,
    onNavigateBack: () -> Unit = {},
    onMenuClick: (() -> Unit)? = null,
    isFounder: Boolean = false,
    onFounderClick: () -> Unit = {},
    onSettingsClick: () -> Unit = {},
    actions: @Composable () -> Unit = {}
) {
    val colors = PanuTheme.colors

    TopAppBar(
        title = {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp
                        ),
                        color = colors.textPrimary
                    )
                    if (isFounder) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(colors.champagneSubtle)
                                .border(1.dp, colors.champagne.copy(alpha = 0.5f), RoundedCornerShape(6.dp))
                                .clickable { onFounderClick() }
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                .testTag("topbar_founder_badge")
                        ) {
                            Text(
                                text = "FOUNDER",
                                color = colors.champagne,
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                fontSize = 10.sp
                            )
                        }
                    }
                }
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        },
        navigationIcon = {
            if (canNavigateBack) {
                IconButton(
                    onClick = onNavigateBack,
                    modifier = Modifier.testTag("nav_back_button")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Retour",
                        tint = colors.textPrimary
                    )
                }
            } else if (onMenuClick != null) {
                IconButton(
                    onClick = onMenuClick,
                    modifier = Modifier.testTag("nav_menu_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Menu,
                        contentDescription = "Menu Principal",
                        tint = colors.textPrimary
                    )
                }
            }
        },
        actions = {
            if (isFounder) {
                IconButton(
                    onClick = onFounderClick,
                    modifier = Modifier.testTag("topbar_founder_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = "Tableau de bord Fondateur",
                        tint = colors.champagne
                    )
                }
            }
            IconButton(
                onClick = onSettingsClick,
                modifier = Modifier.testTag("topbar_settings_button")
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "Paramètres",
                    tint = colors.textSecondary
                )
            }
            actions()
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = colors.background,
            titleContentColor = colors.textPrimary
        )
    )
}

data class BottomNavItem(
    val route: String,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val testTag: String
)

@Composable
fun PanuBottomNav(
    currentRoute: String?,
    isFounder: Boolean = false,
    onNavigate: (String) -> Unit
) {
    val colors = PanuTheme.colors

    val items = buildList {
        add(
            BottomNavItem(
                route = PanuScreen.Home.route,
                label = "Accueil",
                selectedIcon = Icons.Filled.Home,
                unselectedIcon = Icons.Outlined.Home,
                testTag = "nav_home"
            )
        )
        add(
            BottomNavItem(
                route = PanuScreen.Studio.route,
                label = "Studio IA",
                selectedIcon = Icons.Filled.AutoAwesome,
                unselectedIcon = Icons.Outlined.AutoAwesome,
                testTag = "nav_studio"
            )
        )
        add(
            BottomNavItem(
                route = PanuScreen.Creations.route,
                label = "Créations",
                selectedIcon = Icons.Filled.VideoLibrary,
                unselectedIcon = Icons.Outlined.VideoLibrary,
                testTag = "nav_creations"
            )
        )
        add(
            BottomNavItem(
                route = PanuScreen.Profile.route,
                label = "Compte",
                selectedIcon = Icons.Filled.Person,
                unselectedIcon = Icons.Outlined.Person,
                testTag = "nav_profile"
            )
        )
        if (isFounder) {
            add(
                BottomNavItem(
                    route = PanuScreen.Founder.createRoute("dashboard"),
                    label = "Founder",
                    selectedIcon = Icons.Filled.Security,
                    unselectedIcon = Icons.Outlined.Security,
                    testTag = "nav_founder"
                )
            )
        }
    }

    NavigationBar(
        containerColor = colors.surface,
        contentColor = colors.textPrimary,
        tonalElevation = 8.dp,
        modifier = Modifier
            .border(width = 1.dp, color = colors.surfaceBorder)
            .testTag("panu_bottom_nav")
    ) {
        items.forEach { item ->
            val isSelected = when (item.route) {
                PanuScreen.Creations.route -> currentRoute == PanuScreen.Creations.route || currentRoute == PanuScreen.Activity.route
                PanuScreen.Founder.createRoute("dashboard") -> currentRoute?.startsWith("founder") == true
                else -> currentRoute == item.route
            }
            NavigationBarItem(
                selected = isSelected,
                onClick = { onNavigate(item.route) },
                icon = {
                    Icon(
                        imageVector = if (isSelected) item.selectedIcon else item.unselectedIcon,
                        contentDescription = item.label,
                        tint = if (isSelected) colors.champagne else colors.textSecondary
                    )
                },
                label = {
                    Text(
                        text = item.label,
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
                        ),
                        color = if (isSelected) colors.champagne else colors.textSecondary,
                        maxLines = 1
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    indicatorColor = colors.champagneSubtle,
                    selectedIconColor = colors.champagne,
                    selectedTextColor = colors.champagne,
                    unselectedIconColor = colors.textSecondary,
                    unselectedTextColor = colors.textSecondary
                ),
                modifier = Modifier.testTag(item.testTag)
            )
        }
    }
}

@Composable
fun PanuEmptyState(
    title: String,
    subtitle: String,
    icon: ImageVector = Icons.Default.DynamicFeed,
    actionText: String? = null,
    onActionClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val colors = PanuTheme.colors

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(colors.champagneSubtle)
                .border(1.dp, colors.surfaceBorder, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = colors.champagne,
                modifier = Modifier.size(32.dp)
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = colors.textPrimary,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = colors.textSecondary,
            textAlign = TextAlign.Center
        )
        if (!actionText.isNullOrBlank() && onActionClick != null) {
            Spacer(modifier = Modifier.height(20.dp))
            Button(
                onClick = onActionClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.champagne,
                    contentColor = if (colors.isDark) colors.background else Color.White
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.testTag("empty_state_action_btn")
            ) {
                Text(actionText, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun PanuAvatar(
    avatarUrl: String?,
    fullName: String? = null,
    name: String? = fullName,
    size: Dp = 48.dp,
    borderWidth: Dp = 1.5.dp,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val colors = PanuTheme.colors
    val displayName = name ?: fullName
    val initial = displayName?.firstOrNull()?.uppercaseChar()?.toString() ?: "P"
    val clickableModifier = if (onClick != null) {
        modifier.clickable { onClick() }
    } else modifier

    Box(
        modifier = clickableModifier
            .size(size)
            .clip(CircleShape)
            .background(colors.surfaceElevated)
            .border(borderWidth, colors.champagne.copy(alpha = 0.6f), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        if (!avatarUrl.isNullOrBlank()) {
            AsyncImage(
                model = avatarUrl,
                contentDescription = "Photo de profil",
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )
        } else {
            Text(
                text = initial,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Black,
                    fontSize = (size.value * 0.42).sp
                ),
                color = colors.champagne
            )
        }
    }
}

@Composable
fun PanuRoleBadge(roleString: String) {
    PanuRoleBadge(UserRole.fromString(roleString))
}

@Composable
fun PanuRoleBadge(role: UserRole) {
    val colors = PanuTheme.colors
    val (bgColor, textColor, label) = when (role) {
        UserRole.FOUNDER -> Triple(colors.champagneSubtle, colors.champagne, "Fondateur")
        UserRole.ADMIN -> Triple(colors.emeraldSubtle, colors.emerald, "Admin")
        UserRole.BUSINESS -> Triple(colors.champagneSubtle, colors.champagne, "Entreprise")
        UserRole.CREATOR -> Triple(colors.champagneSubtle, colors.champagne, "Créateur")
        UserRole.USER -> Triple(colors.surfaceElevated, colors.textSecondary, "Membre")
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(6.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, textColor.copy(alpha = 0.5f))
    ) {
        Text(
            text = label,
            color = textColor,
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
        )
    }
}
