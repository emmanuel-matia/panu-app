package com.example.ui.screens.founder

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.DynamicFeed
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import com.example.data.model.Post
import com.example.data.model.UserProfile
import com.example.data.remote.FounderStats
import com.example.data.remote.SupabaseAuthService
import com.example.data.remote.SystemHealthStatus
import com.example.ui.components.PanuAvatar
import com.example.ui.components.PanuRoleBadge
import com.example.ui.theme.PanuEmerald
import com.example.ui.theme.PanuTheme

// -----------------------------------------------------------------------------
// TAB 0: TABLEAU DE BORD (Overview)
// -----------------------------------------------------------------------------
@Composable
fun FounderOverviewTab(
    stats: FounderStats,
    healthStatus: SystemHealthStatus?,
    recentUsers: List<UserProfile>,
    recentPosts: List<Post>,
    onSwitchTab: (Int) -> Unit
) {
    val colors = PanuTheme.colors

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Founder Welcome & Identity Card
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            color = colors.champagneSubtle,
            border = androidx.compose.foundation.BorderStroke(1.dp, colors.champagne.copy(alpha = 0.5f))
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(colors.champagne),
                    contentAlignment = Alignment.Center
                ) {
                    Text("👑", fontSize = 22.sp)
                }
                Spacer(modifier = Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Espace Founder PANU",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Black),
                        color = colors.textPrimary
                    )
                    Text(
                        text = "Compte identifié : ${SupabaseAuthService.FOUNDER_EMAIL}",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.champagne,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Surface(
                    color = PanuEmerald.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "SÉCURISÉ",
                        color = PanuEmerald,
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Real Metrics Grid (4 Key Metric Cards)
        Text(
            text = "Indicateurs Clés de la Plateforme",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = colors.textPrimary
        )
        Text(
            text = "Données réelles agrégées depuis Supabase PostgreSQL",
            style = MaterialTheme.typography.bodySmall,
            color = colors.textSecondary
        )

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            MetricKpiCard(
                title = "Utilisateurs",
                value = "${stats.totalUsers}",
                icon = Icons.Default.Group,
                modifier = Modifier.weight(1f),
                onClick = { onSwitchTab(1) }
            )
            MetricKpiCard(
                title = "Publications",
                value = "${stats.totalPosts}",
                icon = Icons.Default.DynamicFeed,
                modifier = Modifier.weight(1f),
                onClick = { onSwitchTab(2) }
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            MetricKpiCard(
                title = "Créations IA",
                value = "${stats.totalGenerations}",
                icon = Icons.Default.AutoAwesome,
                modifier = Modifier.weight(1f),
                onClick = { onSwitchTab(3) }
            )
            MetricKpiCard(
                title = "Crédits Utilisés",
                value = "${stats.totalCreditsUsed}",
                icon = Icons.Default.CreditCard,
                modifier = Modifier.weight(1f),
                onClick = { onSwitchTab(6) }
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Quick Navigation to Founder Spaces
        Text(
            text = "Gestion & Modules",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = colors.textPrimary
        )

        Spacer(modifier = Modifier.height(10.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            QuickActionButton(
                label = "Studio IA",
                icon = Icons.Default.AutoAwesome,
                modifier = Modifier.weight(1f),
                onClick = { onSwitchTab(5) }
            )
            QuickActionButton(
                label = "Crédits",
                icon = Icons.Default.CreditCard,
                modifier = Modifier.weight(1f),
                onClick = { onSwitchTab(6) }
            )
            QuickActionButton(
                label = "Statistiques",
                icon = Icons.Default.Analytics,
                modifier = Modifier.weight(1f),
                onClick = { onSwitchTab(4) }
            )
            QuickActionButton(
                label = "Sécurité",
                icon = Icons.Default.Security,
                modifier = Modifier.weight(1f),
                onClick = { onSwitchTab(8) }
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Recent users
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Derniers Utilisateurs Inscrits",
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary
            )
            Text(
                text = "Voir tout (${stats.totalUsers})",
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                color = colors.champagne,
                modifier = Modifier.clickable { onSwitchTab(1) }
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (recentUsers.isEmpty()) {
            Text(
                text = "Aucun utilisateur pour le moment.",
                style = MaterialTheme.typography.bodySmall,
                color = colors.textSecondary
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                recentUsers.take(4).forEach { user ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = colors.surfaceElevated),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            PanuAvatar(
                                avatarUrl = user.avatarUrl,
                                fullName = user.fullName ?: user.username,
                                size = 36.dp
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = user.fullName ?: user.username ?: "Créateur",
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                    color = colors.textPrimary
                                )
                                Text(
                                    text = user.email ?: "@${user.username}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = colors.textSecondary
                                )
                            }
                            PanuRoleBadge(user.role)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricKpiCard(
    title: String,
    value: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val colors = PanuTheme.colors
    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = colors.surfaceElevated),
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.textSecondary
                )
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = colors.champagne,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black),
                color = colors.textPrimary
            )
        }
    }
}

@Composable
private fun QuickActionButton(
    label: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val colors = PanuTheme.colors
    Surface(
        onClick = onClick,
        color = colors.surfaceElevated,
        shape = RoundedCornerShape(10.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(vertical = 10.dp, horizontal = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = null, tint = colors.champagne, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                color = colors.textPrimary,
                maxLines = 1
            )
        }
    }
}

// -----------------------------------------------------------------------------
// TAB 4: STATISTIQUES RÉELLES SUPABASE
// -----------------------------------------------------------------------------
@Composable
fun FounderStatsTab(
    stats: FounderStats,
    totalUsers: Int,
    totalPosts: Int,
    totalGenerations: Int
) {
    val colors = PanuTheme.colors

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = "Statistiques Réelles Supabase",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = colors.textPrimary
        )
        Text(
            text = "Aucune simulation — Données issues de la base PostgreSQL",
            style = MaterialTheme.typography.bodySmall,
            color = colors.textSecondary
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Breakdown Card: Publications
        Card(
            colors = CardDefaults.cardColors(containerColor = colors.surfaceElevated),
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Publications ($totalPosts totales)",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = colors.textPrimary
                )
                Spacer(modifier = Modifier.height(10.dp))
                StatRow("Publiées en ligne", "${stats.publishedPosts}", PanuEmerald)
                StatRow("Brouillons", "${stats.draftPosts}", colors.textSecondary)
                val other = (totalPosts - stats.publishedPosts - stats.draftPosts).coerceAtLeast(0)
                if (other > 0) {
                    StatRow("Archivées / Autres", "$other", colors.champagne)
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Breakdown Card: Rôles
        Card(
            colors = CardDefaults.cardColors(containerColor = colors.surfaceElevated),
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Distribution des Rôles ($totalUsers utilisateurs)",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = colors.textPrimary
                )
                Spacer(modifier = Modifier.height(10.dp))
                stats.roleDistribution.forEach { (role, count) ->
                    val roleLabel = when (role) {
                        "founder" -> "👑 Founder"
                        "admin" -> "🛡️ Admin"
                        "business" -> "💼 Business"
                        "creator" -> "🎨 Creator"
                        else -> "👤 User standard"
                    }
                    StatRow(roleLabel, "$count", colors.champagne)
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Breakdown Card: IA & Crédits
        Card(
            colors = CardDefaults.cardColors(containerColor = colors.surfaceElevated),
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Consommation IA & Crédits",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = colors.textPrimary
                )
                Spacer(modifier = Modifier.height(10.dp))
                StatRow("Générations IA totales", "$totalGenerations", colors.champagne)
                StatRow("Crédits réels consommés", "${stats.totalCreditsUsed} crédits", colors.champagne)
            }
        }
    }
}

@Composable
private fun StatRow(label: String, value: String, color: Color) {
    val colors = PanuTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = colors.textSecondary)
        Text(value, style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold), color = color)
    }
}
