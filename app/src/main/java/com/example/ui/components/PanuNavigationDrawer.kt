package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.DynamicFeed
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.UserProfile
import com.example.ui.navigation.PanuScreen
import com.example.ui.theme.PanuEmerald
import com.example.ui.theme.PanuError
import com.example.ui.theme.PanuTheme

@Composable
fun PanuDrawerSheetContent(
    currentRoute: String?,
    userProfile: UserProfile?,
    isFounder: Boolean,
    onNavigate: (String) -> Unit,
    onLogoutClick: () -> Unit,
    onCloseDrawer: () -> Unit
) {
    val colors = PanuTheme.colors

    ModalDrawerSheet(
        drawerContainerColor = colors.background,
        drawerContentColor = colors.textPrimary,
        modifier = Modifier
            .width(320.dp)
            .fillMaxHeight()
            .border(width = 1.dp, color = colors.surfaceBorder)
            .testTag("panu_navigation_drawer")
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .verticalScroll(rememberScrollState())
                .padding(vertical = 16.dp)
        ) {
            // App Branding & Title
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(colors.champagneSubtle)
                        .border(1.dp, colors.champagne.copy(alpha = 0.4f), RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "P",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Black,
                            color = colors.champagne
                        )
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "PANU",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.5.sp
                        ),
                        color = colors.textPrimary
                    )
                    Text(
                        text = "Studio Créatif Africain",
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.textSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // User Info Card (Guest Mode vs Logged In Profile)
            if (userProfile == null) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.dp, colors.champagne.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                        .clickable {
                            onCloseDrawer()
                            onNavigate(PanuScreen.Login.route)
                        }
                        .testTag("drawer_guest_card"),
                    color = colors.champagneSubtle
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = colors.champagne,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Mode Invité (Découverte)",
                                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                color = colors.textPrimary
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Connectez-vous pour publier, liker et interagir.",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.textSecondary
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(
                            onClick = {
                                onCloseDrawer()
                                onNavigate(PanuScreen.Login.route)
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.champagne,
                                contentColor = if (colors.isDark) colors.background else Color.White
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Connexion / S'inscrire", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            } else {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.dp, colors.surfaceBorder, RoundedCornerShape(12.dp))
                        .clickable {
                            onCloseDrawer()
                            onNavigate(PanuScreen.Profile.route)
                        },
                    color = colors.surface
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        PanuAvatar(
                            avatarUrl = userProfile.avatarUrl,
                            fullName = userProfile.fullName ?: userProfile.username ?: "Créateur",
                            size = 46.dp
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = userProfile.fullName ?: "Mon Compte",
                                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                                color = colors.textPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = "@${userProfile.username ?: "createur"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.textSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            PanuRoleBadge(roleString = userProfile.role)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = colors.surfaceBorder, thickness = 1.dp, modifier = Modifier.padding(horizontal = 20.dp))
            Spacer(modifier = Modifier.height(12.dp))

            // -------------------------------------------------------------
            // SECTION 1: 👤 Compte utilisateur
            // -------------------------------------------------------------
            DrawerSectionHeader(title = "Compte utilisateur", icon = Icons.Default.Person)

            if (userProfile != null) {
                DrawerItem(
                    label = "Mon profil",
                    icon = Icons.Default.Person,
                    isSelected = currentRoute == PanuScreen.Profile.route,
                    testTag = "drawer_item_my_profile",
                    onClick = {
                        onCloseDrawer()
                        onNavigate(PanuScreen.Profile.route)
                    }
                )

                DrawerItem(
                    label = "Modifier mon profil",
                    icon = Icons.Default.Edit,
                    isSelected = currentRoute == PanuScreen.EditProfile.route,
                    testTag = "drawer_item_edit_profile",
                    onClick = {
                        onCloseDrawer()
                        onNavigate(PanuScreen.EditProfile.route)
                    }
                )
            }

            DrawerItem(
                label = "Paramètres & Apparence",
                icon = Icons.Default.Settings,
                isSelected = currentRoute == PanuScreen.Settings.route,
                testTag = "drawer_item_settings",
                onClick = {
                    onCloseDrawer()
                    onNavigate(PanuScreen.Settings.route)
                }
            )

            if (userProfile != null) {
                DrawerItem(
                    label = "Déconnexion",
                    icon = Icons.AutoMirrored.Filled.ExitToApp,
                    isSelected = false,
                    iconTint = PanuError,
                    textColor = PanuError,
                    testTag = "drawer_item_logout",
                    onClick = {
                        onCloseDrawer()
                        onLogoutClick()
                    }
                )
            } else {
                DrawerItem(
                    label = "Se connecter / S'inscrire",
                    icon = Icons.Default.Login,
                    isSelected = currentRoute == PanuScreen.Login.route,
                    iconTint = colors.champagne,
                    textColor = colors.champagne,
                    testTag = "drawer_item_login",
                    onClick = {
                        onCloseDrawer()
                        onNavigate(PanuScreen.Login.route)
                    }
                )
            }

            // -------------------------------------------------------------
            // SECTION 2: 👑 Founder (STRICT RULE: ONLY VISIBLE IF isFounder)
            // -------------------------------------------------------------
            if (isFounder) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = colors.surfaceBorder, thickness = 1.dp, modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(modifier = Modifier.height(12.dp))

                DrawerSectionHeader(
                    title = "Founder",
                    icon = Icons.Default.Security,
                    badgeText = "Vérifié",
                    badgeColor = colors.champagne
                )

                DrawerItem(
                    label = "Tableau de bord",
                    icon = Icons.Default.Dashboard,
                    isSelected = currentRoute?.startsWith("founder") == true && (currentRoute.contains("dashboard") || !currentRoute.contains("tab=")),
                    testTag = "drawer_item_founder_dashboard",
                    highlightTint = colors.champagne,
                    onClick = {
                        onCloseDrawer()
                        onNavigate(PanuScreen.Founder.createRoute("dashboard"))
                    }
                )

                DrawerItem(
                    label = "Gestion Utilisateurs",
                    icon = Icons.Default.Group,
                    isSelected = currentRoute?.contains("tab=users") == true,
                    testTag = "drawer_item_founder_users",
                    highlightTint = colors.champagne,
                    onClick = {
                        onCloseDrawer()
                        onNavigate(PanuScreen.Founder.createRoute("users"))
                    }
                )

                DrawerItem(
                    label = "Contenus & Modération",
                    icon = Icons.Default.DynamicFeed,
                    isSelected = currentRoute?.contains("tab=content") == true,
                    testTag = "drawer_item_founder_content",
                    highlightTint = colors.champagne,
                    onClick = {
                        onCloseDrawer()
                        onNavigate(PanuScreen.Founder.createRoute("content"))
                    }
                )

                DrawerItem(
                    label = "Statistiques PANU",
                    icon = Icons.Default.Analytics,
                    isSelected = currentRoute?.contains("tab=stats") == true,
                    testTag = "drawer_item_founder_stats",
                    highlightTint = colors.champagne,
                    onClick = {
                        onCloseDrawer()
                        onNavigate(PanuScreen.Founder.createRoute("stats"))
                    }
                )

                DrawerItem(
                    label = "PANU AI Studio Master",
                    icon = Icons.Default.AutoAwesome,
                    isSelected = currentRoute?.contains("tab=ai") == true,
                    testTag = "drawer_item_founder_ai",
                    highlightTint = colors.champagne,
                    onClick = {
                        onCloseDrawer()
                        onNavigate(PanuScreen.Founder.createRoute("ai"))
                    }
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = colors.surfaceBorder, thickness = 1.dp, modifier = Modifier.padding(horizontal = 20.dp))
            Spacer(modifier = Modifier.height(12.dp))

            // -------------------------------------------------------------
            // SECTION 3: 🌐 Liens Publics & Découverte
            // -------------------------------------------------------------
            DrawerSectionHeader(title = "Découvrir", icon = Icons.Default.Public)

            DrawerItem(
                label = "Fil d'actualité",
                icon = Icons.Default.Home,
                isSelected = currentRoute == PanuScreen.Home.route,
                testTag = "drawer_item_home",
                onClick = {
                    onCloseDrawer()
                    onNavigate(PanuScreen.Home.route)
                }
            )

            DrawerItem(
                label = "Studio de Création IA",
                icon = Icons.Default.AutoAwesome,
                isSelected = currentRoute == PanuScreen.Studio.route,
                testTag = "drawer_item_studio",
                onClick = {
                    onCloseDrawer()
                    onNavigate(PanuScreen.Studio.route)
                }
            )

            DrawerItem(
                label = "Mes créations",
                icon = Icons.Default.VideoLibrary,
                isSelected = currentRoute == PanuScreen.Creations.route || currentRoute == PanuScreen.Activity.route,
                testTag = "drawer_item_creations",
                onClick = {
                    onCloseDrawer()
                    onNavigate(PanuScreen.Creations.route)
                }
            )

            Spacer(modifier = Modifier.weight(1f))

            // Footer version
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp)
            ) {
                Text(
                    text = "PANU v1.0.0 • RLS & Supabase Sécurisés",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.textMuted
                )
            }
        }
    }
}

@Composable
private fun DrawerSectionHeader(
    title: String,
    icon: ImageVector,
    badgeText: String? = null,
    badgeColor: Color = PanuEmerald
) {
    val colors = PanuTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = colors.textSecondary,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title.uppercase(),
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp
            ),
            color = colors.textSecondary
        )
        if (badgeText != null) {
            Spacer(modifier = Modifier.width(8.dp))
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .background(badgeColor.copy(alpha = 0.15f))
                    .border(1.dp, badgeColor.copy(alpha = 0.4f), RoundedCornerShape(4.dp))
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = badgeText,
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold
                    ),
                    color = badgeColor
                )
            }
        }
    }
}

@Composable
private fun DrawerItem(
    label: String,
    icon: ImageVector,
    isSelected: Boolean,
    testTag: String,
    onClick: () -> Unit,
    iconTint: Color? = null,
    textColor: Color? = null,
    highlightTint: Color? = null
) {
    val colors = PanuTheme.colors
    val accent = highlightTint ?: colors.champagne
    val activeBg = if (isSelected) colors.surfaceElevated else Color.Transparent
    val activeBorder = if (isSelected) colors.surfaceBorder else Color.Transparent
    val effectiveIconTint = iconTint ?: if (isSelected) accent else colors.textSecondary
    val effectiveTextColor = textColor ?: if (isSelected) colors.textPrimary else colors.textSecondary

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 2.dp)
            .clip(RoundedCornerShape(10.dp))
            .border(1.dp, activeBorder, RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .testTag(testTag),
        color = activeBg
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = effectiveIconTint,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(14.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
                ),
                color = effectiveTextColor,
                modifier = Modifier.weight(1f)
            )
            if (isSelected) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(accent)
                )
            }
        }
    }
}
