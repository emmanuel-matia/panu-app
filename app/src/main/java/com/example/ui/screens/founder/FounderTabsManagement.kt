package com.example.ui.screens.founder

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Unarchive
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.Post
import com.example.data.model.UserProfile
import com.example.data.model.UserRole
import com.example.data.remote.FounderAIGeneration
import com.example.ui.components.PanuAvatar
import com.example.ui.components.PanuRoleBadge
import com.example.ui.theme.PanuEmerald
import com.example.ui.theme.PanuError
import com.example.ui.theme.PanuTheme

// -----------------------------------------------------------------------------
// TAB 1: GESTION DES UTILISATEURS (Données réelles Supabase)
// -----------------------------------------------------------------------------
@Composable
fun FounderUsersTab(
    usersList: List<UserProfile>,
    postsList: List<Post>,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onUpdateUserRole: (userId: String, newRole: String) -> Unit,
    onAllocateCredits: (userId: String, delta: Int, reason: String) -> Unit
) {
    val colors = PanuTheme.colors
    var selectedUserForRole by remember { mutableStateOf<UserProfile?>(null) }
    var selectedUserForCredits by remember { mutableStateOf<UserProfile?>(null) }
    var creditsAmountInput by remember { mutableStateOf("10") }
    var creditsReasonInput by remember { mutableStateOf("Bonus d'encouragement") }

    val filtered = usersList.filter {
        val q = searchQuery.trim().lowercase()
        if (q.isBlank()) true
        else {
            (it.fullName?.lowercase()?.contains(q) == true) ||
            (it.username?.lowercase()?.contains(q) == true) ||
            (it.email?.lowercase()?.contains(q) == true) ||
            (it.role.lowercase().contains(q))
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Search bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            placeholder = { Text("Rechercher par nom, @username, email ou rôle...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = colors.champagne) },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .testTag("founder_users_search_input"),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = colors.champagne,
                unfocusedBorderColor = colors.surfaceBorder,
                focusedTextColor = colors.textPrimary,
                unfocusedTextColor = colors.textPrimary,
                focusedContainerColor = colors.surface,
                unfocusedContainerColor = colors.surface
            )
        )

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "${filtered.size} utilisateur(s) réel(s) trouvé(s)",
                style = MaterialTheme.typography.bodySmall,
                color = colors.textSecondary
            )
            Text(
                text = "Données synchronisées Supabase",
                style = MaterialTheme.typography.labelSmall,
                color = colors.champagne
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (filtered.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (searchQuery.isBlank()) "Aucun utilisateur enregistré dans Supabase." else "Aucun résultat pour cette recherche.",
                    color = colors.textSecondary,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(filtered, key = { it.id }) { user ->
                    val userPostCount = postsList.count { it.authorId == user.id }
                    UserManagementCard(
                        user = user,
                        postCount = userPostCount,
                        onEditRole = { selectedUserForRole = user },
                        onGrantCredits = { selectedUserForCredits = user }
                    )
                }
            }
        }
    }

    // Dialog Modifier le Rôle
    selectedUserForRole?.let { targetUser ->
        RoleChangeDialog(
            user = targetUser,
            onDismiss = { selectedUserForRole = null },
            onConfirm = { newRole ->
                onUpdateUserRole(targetUser.id, newRole)
                selectedUserForRole = null
            }
        )
    }

    // Dialog Allouer des Crédits
    selectedUserForCredits?.let { targetUser ->
        AlertDialog(
            onDismissRequest = { selectedUserForCredits = null },
            title = {
                Text(
                    text = "Allouer des crédits réels",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = colors.textPrimary
                )
            },
            text = {
                Column {
                    Text(
                        text = "Attribuer des crédits au compte : ${targetUser.fullName ?: targetUser.username ?: targetUser.email}",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.textSecondary
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = creditsAmountInput,
                        onValueChange = { creditsAmountInput = it },
                        label = { Text("Montant (crédits)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = colors.champagne,
                            unfocusedBorderColor = colors.surfaceBorder,
                            focusedTextColor = colors.textPrimary,
                            unfocusedTextColor = colors.textPrimary
                        )
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = creditsReasonInput,
                        onValueChange = { creditsReasonInput = it },
                        label = { Text("Motif de l'ajustement") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = colors.champagne,
                            unfocusedBorderColor = colors.surfaceBorder,
                            focusedTextColor = colors.textPrimary,
                            unfocusedTextColor = colors.textPrimary
                        )
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val amt = creditsAmountInput.toIntOrNull() ?: 0
                        if (amt > 0) {
                            onAllocateCredits(targetUser.id, amt, creditsReasonInput)
                            selectedUserForCredits = null
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.champagne,
                        contentColor = if (colors.isDark) colors.background else Color.White
                    )
                ) {
                    Text("Confirmer l'allocation")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedUserForCredits = null }) {
                    Text("Annuler", color = colors.textSecondary)
                }
            },
            containerColor = colors.surfaceElevated
        )
    }
}

@Composable
private fun UserManagementCard(
    user: UserProfile,
    postCount: Int,
    onEditRole: () -> Unit,
    onGrantCredits: () -> Unit
) {
    val colors = PanuTheme.colors

    Card(
        colors = CardDefaults.cardColors(containerColor = colors.surfaceElevated),
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("founder_user_card_${user.id}")
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                PanuAvatar(
                    avatarUrl = user.avatarUrl,
                    fullName = user.fullName ?: user.username,
                    size = 44.dp
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = user.fullName ?: "Créateur PANU",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = colors.textPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    if (!user.username.isNullOrBlank()) {
                        Text(
                            text = "@${user.username}",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.textSecondary
                        )
                    }
                    if (!user.email.isNullOrBlank()) {
                        Text(
                            text = user.email ?: "",
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.textMuted
                        )
                    }
                }
                PanuRoleBadge(user.role)
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Publications : $postCount • Statut : Actif",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.textSecondary
                )

                Row {
                    OutlinedButton(
                        onClick = onGrantCredits,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .height(34.dp)
                            .testTag("user_grant_credits_btn_${user.id}"),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.champagne),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.champagne.copy(alpha = 0.5f))
                    ) {
                        Text("+ Crédits", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Button(
                        onClick = onEditRole,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .height(34.dp)
                            .testTag("user_edit_role_btn_${user.id}"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = colors.champagneSubtle,
                            contentColor = colors.champagne
                        )
                    ) {
                        Text("Rôle", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun RoleChangeDialog(
    user: UserProfile,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    val colors = PanuTheme.colors
    var selectedRole by remember { mutableStateOf(user.role) }
    val availableRoles = listOf("user", "creator", "business", "founder", "admin")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Modifier le rôle Supabase",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary
            )
        },
        text = {
            Column {
                Text(
                    text = "Attention : La modification du rôle pour ${user.fullName ?: user.email} s'applique directement dans la base PostgreSQL.",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.textSecondary
                )
                Spacer(modifier = Modifier.height(14.dp))
                availableRoles.forEach { role ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        androidx.compose.material3.RadioButton(
                            selected = selectedRole.equals(role, ignoreCase = true),
                            onClick = { selectedRole = role }
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = when (role) {
                                "founder" -> "👑 Founder (Accès total console)"
                                "admin" -> "🛡️ Admin"
                                "business" -> "💼 Business / Entreprise"
                                "creator" -> "🎨 Creator / Créateur Pro"
                                else -> "👤 User / Membre standard"
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = colors.textPrimary
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(selectedRole) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.champagne,
                    contentColor = if (colors.isDark) colors.background else Color.White
                )
            ) {
                Text("Appliquer la modification")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annuler", color = colors.textSecondary)
            }
        },
        containerColor = colors.surfaceElevated
    )
}

// -----------------------------------------------------------------------------
// TAB 2: PUBLICATIONS & MODÉRATION (Données réelles Supabase)
// -----------------------------------------------------------------------------
@Composable
fun FounderPublicationsTab(
    postsList: List<Post>,
    onToggleArchive: (postId: String, currentArchived: Boolean) -> Unit,
    onDeletePost: (postId: String) -> Unit
) {
    val colors = PanuTheme.colors
    var selectedFilter by remember { mutableStateOf("all") }
    var postToDelete by remember { mutableStateOf<Post?>(null) }

    val filtered = postsList.filter {
        when (selectedFilter) {
            "published" -> it.status == "published"
            "draft" -> it.status == "draft"
            "archived" -> it.status == "archived"
            else -> true
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Filters
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("all" to "Tous (${postsList.size})", "published" to "Publiés", "archived" to "Archivés", "draft" to "Brouillons").forEach { (key, label) ->
                val isSelected = selectedFilter == key
                OutlinedButton(
                    onClick = { selectedFilter = key },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = if (isSelected) colors.champagneSubtle else Color.Transparent,
                        contentColor = if (isSelected) colors.champagne else colors.textSecondary
                    ),
                    border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) colors.champagne else colors.surfaceBorder),
                    modifier = Modifier.weight(1f)
                ) {
                    Text(label, fontSize = 11.sp, maxLines = 1)
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        if (filtered.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Aucune publication trouvée dans cette catégorie.",
                    color = colors.textSecondary,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(filtered, key = { it.id }) { post ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = colors.surfaceElevated),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("founder_post_card_${post.id}")
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = post.authorName ?: post.authorUsername ?: "Auteur inconnu",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                    color = colors.textPrimary
                                )
                                Surface(
                                    color = when (post.status) {
                                        "published" -> PanuEmerald.copy(alpha = 0.15f)
                                        "archived" -> colors.champagneSubtle
                                        else -> colors.surface
                                    },
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = post.status.uppercase(),
                                        color = when (post.status) {
                                            "published" -> PanuEmerald
                                            "archived" -> colors.champagne
                                            else -> colors.textSecondary
                                        },
                                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }

                            if (!post.title.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = post.title ?: "",
                                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                                    color = colors.textPrimary
                                )
                            }

                            if (post.content.isNotBlank()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = post.content,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = colors.textSecondary,
                                    maxLines = 3,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Média : ${post.mediaType}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = colors.textMuted
                                )

                                Row {
                                    IconButton(
                                        onClick = { onToggleArchive(post.id, post.status == "archived") },
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Icon(
                                            imageVector = if (post.status == "archived") Icons.Default.Unarchive else Icons.Default.Archive,
                                            contentDescription = "Archiver",
                                            tint = colors.champagne
                                        )
                                    }
                                    IconButton(
                                        onClick = { postToDelete = post },
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Delete,
                                            contentDescription = "Supprimer",
                                            tint = PanuError
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Confirmation suppression
    postToDelete?.let { post ->
        AlertDialog(
            onDismissRequest = { postToDelete = null },
            title = {
                Text(
                    text = "Confirmer la suppression",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = PanuError
                )
            },
            text = {
                Text(
                    text = "Voulez-vous supprimer définitivement la publication de ${post.authorName ?: "cet auteur"} ? Cette action est irréversible côté Supabase.",
                    color = colors.textSecondary,
                    style = MaterialTheme.typography.bodyMedium
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onDeletePost(post.id)
                        postToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PanuError,
                        contentColor = Color.White
                    )
                ) {
                    Text("Supprimer définitivement")
                }
            },
            dismissButton = {
                TextButton(onClick = { postToDelete = null }) {
                    Text("Annuler", color = colors.textSecondary)
                }
            },
            containerColor = colors.surfaceElevated
        )
    }
}

// -----------------------------------------------------------------------------
// TAB 3: CRÉATIONS IA (Données réelles Supabase)
// -----------------------------------------------------------------------------
@Composable
fun FounderCreationsTab(
    generationsList: List<FounderAIGeneration>
) {
    val colors = PanuTheme.colors

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "${generationsList.size} génération(s) IA réelle(s) enregistrée(s)",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = colors.textPrimary
        )
        Text(
            text = "Historique réel Supabase PostgreSQL public.ai_generations",
            style = MaterialTheme.typography.bodySmall,
            color = colors.textSecondary
        )

        Spacer(modifier = Modifier.height(14.dp))

        if (generationsList.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Aucune génération IA enregistrée dans Supabase.",
                    color = colors.textSecondary,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(generationsList, key = { it.id }) { gen ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = colors.surfaceElevated),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.AutoAwesome,
                                        contentDescription = null,
                                        tint = colors.champagne,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = gen.category.uppercase(),
                                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                        color = colors.champagne
                                    )
                                }

                                Surface(
                                    color = colors.champagneSubtle,
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = "${gen.creditsConsumed} crédit(s)",
                                        color = colors.champagne,
                                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Text(
                                text = gen.prompt.ifBlank { "(Prompt vide)" },
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.textPrimary,
                                maxLines = 4,
                                overflow = TextOverflow.Ellipsis
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            Text(
                                text = "Créé le : ${gen.createdAt} • ID créateur : ${gen.userId.take(8)}...",
                                style = MaterialTheme.typography.labelSmall,
                                color = colors.textMuted
                            )
                        }
                    }
                }
            }
        }
    }
}
