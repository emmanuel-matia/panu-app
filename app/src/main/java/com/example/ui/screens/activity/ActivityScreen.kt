package com.example.ui.screens.activity

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Audiotrack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DynamicFeed
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.VideoFile
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.local.SessionManager
import com.example.data.model.Post
import com.example.data.repository.PostRepository
import com.example.ui.components.PanuBottomNav
import com.example.ui.components.PanuEmptyState
import com.example.ui.components.PanuTopBar
import com.example.ui.navigation.PanuScreen
import com.example.ui.theme.PanuChampagne
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
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

enum class CreationFilter(val label: String) {
    ALL("Tous"),
    PHOTOS("📸 Photos"),
    VIDEOS("📹 Vidéos"),
    AUDIOS("🎙️ Audios"),
    TEXTS("📝 Textes"),
    STUDIO_IA("✨ Studio IA"),
    DRAFTS("Brouillons")
}

@Composable
fun ActivityScreen(
    postRepository: PostRepository,
    sessionManager: SessionManager,
    isFounder: Boolean,
    onNavigate: (String) -> Unit,
    onMenuClick: (() -> Unit)? = null,
    onNavigateToCreate: () -> Unit,
    onNavigateToFounder: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    val currentUserId by sessionManager.currentUserId.collectAsState()
    val userPosts by postRepository.getUserPosts(currentUserId ?: "").collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()

    var activeFilter by remember { mutableStateOf(CreationFilter.ALL) }
    var selectedPostForPreview by remember { mutableStateOf<Post?>(null) }
    var postToEdit by remember { mutableStateOf<Post?>(null) }
    var postToDelete by remember { mutableStateOf<Post?>(null) }
    var operationError by remember { mutableStateOf<String?>(null) }
    var operationSuccess by remember { mutableStateOf<String?>(null) }
    var isOperating by remember { mutableStateOf(false) }

    LaunchedEffect(currentUserId) {
        currentUserId?.let { postRepository.refreshUserPosts(it) }
    }

    val filteredPosts = userPosts.filter { post ->
        when (activeFilter) {
            CreationFilter.ALL -> true
            CreationFilter.PHOTOS -> post.mediaType == "image" || post.mediaType == "carousel"
            CreationFilter.VIDEOS -> post.mediaType == "video"
            CreationFilter.AUDIOS -> post.mediaType == "audio"
            CreationFilter.TEXTS -> post.mediaType == "none" || post.mediaType == "text"
            CreationFilter.STUDIO_IA -> post.mediaType == "ai_generated"
            CreationFilter.DRAFTS -> post.status == "draft"
        }
    }

    // Dialog for Editing Post (Titre / Légende)
    if (postToEdit != null) {
        var editTitle by remember(postToEdit) { mutableStateOf(postToEdit?.title ?: "") }
        var editContent by remember(postToEdit) { mutableStateOf(postToEdit?.content ?: "") }

        AlertDialog(
            onDismissRequest = { postToEdit = null },
            title = { Text("Modifier la création") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = editTitle,
                        onValueChange = { editTitle = it },
                        label = { Text("Titre") },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PanuTerracotta,
                            focusedTextColor = PanuTextPrimaryDark,
                            unfocusedTextColor = PanuTextPrimaryDark
                        )
                    )
                    OutlinedTextField(
                        value = editContent,
                        onValueChange = { editContent = it },
                        label = { Text("Légende / Contenu *") },
                        minLines = 4,
                        maxLines = 8,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PanuTerracotta,
                            focusedTextColor = PanuTextPrimaryDark,
                            unfocusedTextColor = PanuTextPrimaryDark
                        )
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val current = postToEdit ?: return@Button
                        val updated = current.copy(
                            title = editTitle.takeIf { it.isNotBlank() },
                            content = editContent.trim(),
                            updatedAt = System.currentTimeMillis()
                        )
                        isOperating = true
                        scope.launch {
                            val res = postRepository.updatePost(updated)
                            isOperating = false
                            postToEdit = null
                            if (res.isSuccess) {
                                operationSuccess = "Modification enregistrée avec succès."
                            } else {
                                operationError = "Erreur de mise à jour : ${res.exceptionOrNull()?.localizedMessage}"
                            }
                        }
                    },
                    enabled = !isOperating && editContent.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = PanuTerracotta)
                ) {
                    Text("Enregistrer")
                }
            },
            dismissButton = {
                TextButton(onClick = { postToEdit = null }) {
                    Text("Annuler", color = PanuTextSecondaryDark)
                }
            },
            containerColor = PanuSurfaceDark,
            titleContentColor = PanuTextPrimaryDark,
            textContentColor = PanuTextPrimaryDark
        )
    }

    // Dialog for Delete Confirmation
    if (postToDelete != null) {
        val target = postToDelete!!
        AlertDialog(
            onDismissRequest = { postToDelete = null },
            title = { Text("Supprimer cette création ?") },
            text = {
                Text(
                    "Cette action supprimera définitivement le contenu de PANU ainsi que son média associé dans Supabase. Cette action est irréversible."
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        isOperating = true
                        scope.launch {
                            val res = postRepository.deletePost(target)
                            isOperating = false
                            postToDelete = null
                            if (res.isSuccess) {
                                operationSuccess = "Création supprimée avec succès."
                            } else {
                                operationError = "Erreur de suppression : ${res.exceptionOrNull()?.localizedMessage}"
                            }
                        }
                    },
                    enabled = !isOperating,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Supprimer définitivement")
                }
            },
            dismissButton = {
                TextButton(onClick = { postToDelete = null }) {
                    Text("Annuler", color = PanuTextSecondaryDark)
                }
            },
            containerColor = PanuSurfaceDark,
            titleContentColor = PanuTextPrimaryDark,
            textContentColor = PanuTextSecondaryDark
        )
    }

    // Dialog for Full Preview
    if (selectedPostForPreview != null) {
        val preview = selectedPostForPreview!!
        AlertDialog(
            onDismissRequest = { selectedPostForPreview = null },
            title = {
                Text(
                    text = preview.title ?: "Aperçu de la création",
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (!preview.mediaUrl.isNullOrBlank()) {
                        when (preview.mediaType) {
                            "image", "carousel" -> {
                                AsyncImage(
                                    model = preview.mediaUrl.substringBefore(";"),
                                    contentDescription = null,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(220.dp)
                                        .clip(RoundedCornerShape(12.dp)),
                                    contentScale = ContentScale.Crop
                                )
                            }
                            "video" -> {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(180.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(PanuSurfaceElevated),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(
                                            Icons.Default.VideoFile,
                                            contentDescription = null,
                                            tint = PanuGold,
                                            modifier = Modifier.size(48.dp)
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text("Fichier vidéo Supabase", color = PanuTextSecondaryDark, style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }
                            "audio" -> {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(120.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(PanuSurfaceElevated),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.Audiotrack,
                                            contentDescription = null,
                                            tint = PanuTerracotta,
                                            modifier = Modifier.size(36.dp)
                                        )
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Text("Piste audio PANU", color = PanuTextPrimaryDark, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }

                    Text(
                        text = preview.content,
                        style = MaterialTheme.typography.bodyMedium,
                        color = PanuTextPrimaryDark
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Statut : ${if (preview.status == "published") "Publié" else "Brouillon"}",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (preview.status == "published") PanuGold else PanuTextSecondaryDark
                        )
                        val date = SimpleDateFormat("dd MMM yyyy HH:mm", Locale.FRENCH).format(Date(preview.createdAt))
                        Text(
                            text = date,
                            style = MaterialTheme.typography.labelSmall,
                            color = PanuTextMutedDark
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedPostForPreview = null }) {
                    Text("Fermer", color = PanuGold)
                }
            },
            containerColor = PanuSurfaceDark,
            titleContentColor = PanuTextPrimaryDark,
            textContentColor = PanuTextPrimaryDark
        )
    }

    Scaffold(
        topBar = {
            PanuTopBar(
                title = "Mes créations",
                subtitle = "Gestion et galerie de vos contenus",
                onMenuClick = onMenuClick,
                isFounder = isFounder,
                onFounderClick = onNavigateToFounder,
                onSettingsClick = onNavigateToSettings
            )
        },
        bottomBar = {
            PanuBottomNav(
                currentRoute = PanuScreen.Creations.route,
                isFounder = isFounder,
                onNavigate = onNavigate
            )
        },
        containerColor = PanuObsidian
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Horizontal Filter Chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CreationFilter.values().forEach { filter ->
                    val isSelected = activeFilter == filter
                    val count = when (filter) {
                        CreationFilter.ALL -> userPosts.size
                        CreationFilter.PHOTOS -> userPosts.count { it.mediaType == "image" || it.mediaType == "carousel" }
                        CreationFilter.VIDEOS -> userPosts.count { it.mediaType == "video" }
                        CreationFilter.AUDIOS -> userPosts.count { it.mediaType == "audio" }
                        CreationFilter.TEXTS -> userPosts.count { it.mediaType == "none" || it.mediaType == "text" }
                        CreationFilter.STUDIO_IA -> userPosts.count { it.mediaType == "ai_generated" }
                        CreationFilter.DRAFTS -> userPosts.count { it.status == "draft" }
                    }

                    Surface(
                        modifier = Modifier
                            .clickable { activeFilter = filter }
                            .testTag("filter_${filter.name.lowercase()}"),
                        shape = RoundedCornerShape(10.dp),
                        color = if (isSelected) PanuTerracotta else PanuSurfaceDark,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) PanuTerracotta else PanuSurfaceBorder
                        )
                    ) {
                        Text(
                            text = "${filter.label} ($count)",
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            ),
                            color = if (isSelected) PanuTextPrimaryDark else PanuTextSecondaryDark,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }
                }
            }

            // Notification banners
            if (operationSuccess != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                        .background(PanuGold.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                        .padding(10.dp)
                ) {
                    Text(text = operationSuccess ?: "", color = PanuGold, style = MaterialTheme.typography.bodySmall)
                }
            }

            if (operationError != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                        .background(MaterialTheme.colorScheme.error.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                        .padding(10.dp)
                ) {
                    Text(text = operationError ?: "", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }

            // Posts list
            if (filteredPosts.isEmpty()) {
                PanuEmptyState(
                    title = "Aucune création trouvée",
                    subtitle = "Créez du contenu réel depuis la caméra, la galerie ou le Studio IA.",
                    actionText = "Créer du contenu",
                    onActionClick = onNavigateToCreate,
                    icon = Icons.Default.DynamicFeed
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    items(filteredPosts, key = { it.id }) { post ->
                        CreationCard(
                            post = post,
                            onPreview = { selectedPostForPreview = post },
                            onEdit = { postToEdit = post },
                            onDelete = { postToDelete = post },
                            onPublishNow = {
                                isOperating = true
                                scope.launch {
                                    val res = postRepository.publishDraft(post)
                                    isOperating = false
                                    if (res.isSuccess) {
                                        operationSuccess = "Brouillon publié en direct sur PANU !"
                                    } else {
                                        operationError = "Erreur de publication : ${res.exceptionOrNull()?.localizedMessage}"
                                    }
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
private fun CreationCard(
    post: Post,
    onPreview: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onPublishNow: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("creation_card_${post.id}"),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = PanuSurfaceDark),
        border = androidx.compose.foundation.BorderStroke(1.dp, PanuSurfaceBorder)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Status row + Media tag
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Published / Draft Badge
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (post.status == "published") PanuGold.copy(alpha = 0.2f) else PanuSurfaceElevated
                    ) {
                        Text(
                            text = if (post.status == "published") "En ligne" else "Brouillon",
                            color = if (post.status == "published") PanuGold else PanuTextSecondaryDark,
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // Media Type Badge
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = PanuSurfaceElevated
                    ) {
                        Text(
                            text = when (post.mediaType) {
                                "image" -> "📸 Photo"
                                "carousel" -> "📸 Photos multiples"
                                "video" -> "📹 Vidéo"
                                "audio" -> "🎙️ Audio"
                                "ai_generated" -> "✨ Studio IA"
                                else -> "📝 Texte"
                            },
                            color = PanuTextPrimaryDark,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
                        )
                    }
                }

                // Public / Private Icon
                Icon(
                    imageVector = if (post.visibility == "public") Icons.Default.Public else Icons.Default.Lock,
                    contentDescription = null,
                    tint = if (post.visibility == "public") PanuGoldLight else PanuTextSecondaryDark,
                    modifier = Modifier.size(16.dp)
                )
            }

            if (!post.title.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = post.title,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = PanuTextPrimaryDark
                )
            }

            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = post.content,
                style = MaterialTheme.typography.bodyMedium,
                color = PanuTextSecondaryDark,
                maxLines = 3
            )

            // Thumbnail if media exists
            if (!post.mediaUrl.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                if (post.mediaType == "image" || post.mediaType == "carousel") {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(PanuSurfaceElevated)
                            .clickable { onPreview() }
                    ) {
                        AsyncImage(
                            model = post.mediaUrl.substringBefore(";"),
                            contentDescription = null,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }
                } else if (post.mediaType == "video") {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(100.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(PanuSurfaceElevated)
                            .clickable { onPreview() },
                        contentAlignment = Alignment.Center
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, tint = PanuGold, modifier = Modifier.size(28.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Aperçu de la vidéo", color = PanuTextPrimaryDark, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                } else if (post.mediaType == "audio") {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(60.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(PanuSurfaceElevated)
                            .clickable { onPreview() },
                        contentAlignment = Alignment.Center
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Audiotrack, contentDescription = null, tint = PanuTerracotta, modifier = Modifier.size(22.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Écouter la piste audio", color = PanuTextPrimaryDark, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Actions row: Preview, Edit, Publish now (if draft), Delete
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                val dateStr = SimpleDateFormat("dd/MM/yyyy", Locale.FRENCH).format(Date(post.createdAt))
                Text(
                    text = dateStr,
                    style = MaterialTheme.typography.labelSmall,
                    color = PanuTextMutedDark
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Preview button
                    IconButton(onClick = onPreview, modifier = Modifier.size(32.dp)) {
                        Icon(
                            Icons.Default.Visibility,
                            contentDescription = "Prévisualiser",
                            tint = PanuTextSecondaryDark,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    // Edit button
                    IconButton(onClick = onEdit, modifier = Modifier.size(32.dp)) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Modifier",
                            tint = PanuTextSecondaryDark,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    // Publish draft button
                    if (post.status == "draft") {
                        IconButton(onClick = onPublishNow, modifier = Modifier.size(32.dp)) {
                            Icon(
                                Icons.AutoMirrored.Filled.Send,
                                contentDescription = "Publier le brouillon",
                                tint = PanuGold,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    // Delete button
                    IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Supprimer",
                            tint = MaterialTheme.colorScheme.error.copy(alpha = 0.8f),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}
