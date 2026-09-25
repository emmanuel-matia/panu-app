package com.example.ui.screens.profile

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Save
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.SessionManager
import com.example.data.model.SocialLinks
import com.example.data.model.UserProfile
import com.example.data.repository.ProfileRepository
import com.example.ui.components.AvatarSelectionDialog
import com.example.ui.components.PanuAvatar
import com.example.ui.components.PanuRoleBadge
import com.example.ui.components.PanuTopBar
import com.example.ui.theme.PanuEmerald
import com.example.ui.theme.PanuError
import com.example.ui.theme.PanuTheme
import kotlinx.coroutines.launch

@Composable
fun EditProfileScreen(
    profileRepository: ProfileRepository,
    sessionManager: SessionManager,
    isFounder: Boolean,
    onNavigateBack: () -> Unit,
    onSavedSuccess: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    val colors = PanuTheme.colors
    val currentUserId by sessionManager.currentUserId.collectAsState()
    val profile by profileRepository.getProfileFlow(currentUserId ?: "").collectAsState(initial = null)
    val scope = rememberCoroutineScope()

    var fullName by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var avatarUrl by remember { mutableStateOf<String?>(null) }

    // Social links
    var youtube by remember { mutableStateOf("") }
    var instagram by remember { mutableStateOf("") }
    var tiktok by remember { mutableStateOf("") }
    var website by remember { mutableStateOf("") }

    var isSaving by remember { mutableStateOf(false) }
    var isUploadingAvatar by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var isError by remember { mutableStateOf(false) }

    var isInitialized by remember { mutableStateOf(false) }
    var isSocialInitialized by remember { mutableStateOf(false) }

    // Synchronize form when profile loads (only once to avoid resetting user input during typing)
    LaunchedEffect(profile) {
        if (!isInitialized && profile != null) {
            profile?.let { p ->
                fullName = p.fullName ?: ""
                username = p.username ?: ""
                bio = p.bio ?: ""
                location = p.location ?: ""
                category = p.category ?: "Créateur de contenu"
                avatarUrl = p.avatarUrl
            }
            isInitialized = true
        }
    }

    LaunchedEffect(currentUserId) {
        if (!isSocialInitialized) {
            currentUserId?.let { uid ->
                val res = profileRepository.refreshSocialLinks(uid)
                if (res.isSuccess) {
                    val links = res.getOrNull()
                    youtube = links?.youtube ?: ""
                    instagram = links?.instagram ?: ""
                    tiktok = links?.tiktok ?: ""
                    website = links?.website ?: ""
                    isSocialInitialized = true
                }
            }
        }
    }

    var showAvatarDialog by remember { mutableStateOf(false) }

    AvatarSelectionDialog(
        isOpen = showAvatarDialog,
        onDismiss = { showAvatarDialog = false },
        onImageSelected = { uri ->
            val effectiveUserId = currentUserId ?: "creator_default"
            isUploadingAvatar = true
            statusMessage = "Téléversement de la photo vers Supabase Storage..."
            isError = false
            scope.launch {
                val uploadResult = profileRepository.uploadAvatar(effectiveUserId, uri)
                if (uploadResult.isSuccess) {
                    val newUrl = uploadResult.getOrNull()
                    avatarUrl = newUrl
                    statusMessage = "Photo de profil mise à jour avec succès."
                    isError = false
                } else {
                    statusMessage = "Erreur de téléversement : ${uploadResult.exceptionOrNull()?.message}"
                    isError = true
                }
                isUploadingAvatar = false
            }
        }
    )

    Scaffold(
        topBar = {
            PanuTopBar(
                title = "Modifier mon profil",
                subtitle = "Compte & Identité Supabase",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack,
                isFounder = isFounder,
                onSettingsClick = onNavigateToSettings
            )
        },
        containerColor = colors.background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Avatar card with direct photo picker
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colors.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Photo de profil",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = colors.textPrimary
                    )
                    Spacer(modifier = Modifier.height(14.dp))

                    Box(contentAlignment = Alignment.BottomEnd) {
                        PanuAvatar(
                            avatarUrl = avatarUrl,
                            fullName = fullName.ifBlank { username.ifBlank { "Créateur" } },
                            size = 96.dp
                        )

                        if (isUploadingAvatar) {
                            Box(
                                modifier = Modifier
                                    .size(96.dp)
                                    .clip(CircleShape)
                                    .background(colors.background.copy(alpha = 0.7f)),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(
                                    color = colors.champagne,
                                    modifier = Modifier.size(32.dp),
                                    strokeWidth = 2.dp
                                )
                            }
                        }

                        // Pick photo button
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(CircleShape)
                                .background(colors.champagne)
                                .border(2.dp, colors.surface, CircleShape)
                                .clickable {
                                    showAvatarDialog = true
                                }
                                .testTag("edit_avatar_camera_btn"),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.CameraAlt,
                                contentDescription = "Changer la photo",
                                tint = if (colors.isDark) colors.background else androidx.compose.ui.graphics.Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                showAvatarDialog = true
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.surfaceElevated,
                                contentColor = colors.champagne
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.testTag("choose_photo_btn")
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Choisir une image", style = MaterialTheme.typography.labelMedium)
                        }

                        if (!avatarUrl.isNullOrBlank()) {
                            OutlinedButton(
                                onClick = {
                                    avatarUrl = null
                                    profile?.copy(avatarUrl = null)?.let { updated ->
                                        scope.launch { profileRepository.updateProfile(updated) }
                                    }
                                },
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = PanuError),
                                border = androidx.compose.foundation.BorderStroke(1.dp, PanuError.copy(alpha = 0.5f)),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.testTag("delete_photo_btn")
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Retirer", style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Status message banner
            if (statusMessage != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(
                            if (isError) PanuError.copy(alpha = 0.15f) else PanuEmerald.copy(alpha = 0.15f)
                        )
                        .border(
                            1.dp,
                            if (isError) PanuError.copy(alpha = 0.5f) else PanuEmerald.copy(alpha = 0.5f),
                            RoundedCornerShape(8.dp)
                        )
                        .padding(12.dp)
                        .testTag("edit_profile_status_banner")
                ) {
                    Text(
                        text = statusMessage ?: "",
                        color = if (isError) PanuError else colors.champagne,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Personal Information Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colors.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Text(
                        text = "Informations personnelles",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = colors.textPrimary
                    )
                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedTextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        label = { Text("Nom complet ou Nom de marque") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_edit_fullname"),
                        shape = RoundedCornerShape(10.dp),
                        colors = editFieldColors()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = username,
                        onValueChange = { username = it.replace(" ", "_").lowercase() },
                        label = { Text("Identifiant unique (@username)") },
                        prefix = { Text("@", color = colors.champagne) },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_edit_username"),
                        shape = RoundedCornerShape(10.dp),
                        colors = editFieldColors()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = bio,
                        onValueChange = { bio = it },
                        label = { Text("Biographie / Présentation") },
                        placeholder = { Text("Décrivez votre univers créatif...", color = colors.textSecondary) },
                        minLines = 3,
                        maxLines = 5,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_edit_bio"),
                        shape = RoundedCornerShape(10.dp),
                        colors = editFieldColors()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = location,
                        onValueChange = { location = it },
                        label = { Text("Localisation (ex: Abidjan, Côte d'Ivoire)") },
                        leadingIcon = {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = colors.textSecondary)
                        },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_edit_location"),
                        shape = RoundedCornerShape(10.dp),
                        colors = editFieldColors()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = category,
                        onValueChange = { category = it },
                        label = { Text("Catégorie de créateur") },
                        placeholder = { Text("ex: Réalisateur, Styliste, Podcasteur...", color = colors.textSecondary) },
                        leadingIcon = {
                            Icon(Icons.Default.Category, contentDescription = null, tint = colors.textSecondary)
                        },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_edit_category"),
                        shape = RoundedCornerShape(10.dp),
                        colors = editFieldColors()
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Social Links Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colors.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Text(
                        text = "Liens & Réseaux sociaux",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = colors.textPrimary
                    )
                    Text(
                        text = "Ces liens seront affichés sur votre page de profil public.",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.textSecondary
                    )
                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedTextField(
                        value = youtube,
                        onValueChange = { youtube = it },
                        label = { Text("Lien chaîne YouTube") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("input_social_youtube"),
                        shape = RoundedCornerShape(10.dp),
                        colors = editFieldColors()
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = instagram,
                        onValueChange = { instagram = it },
                        label = { Text("Lien compte Instagram") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("input_social_instagram"),
                        shape = RoundedCornerShape(10.dp),
                        colors = editFieldColors()
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = tiktok,
                        onValueChange = { tiktok = it },
                        label = { Text("Lien compte TikTok") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("input_social_tiktok"),
                        shape = RoundedCornerShape(10.dp),
                        colors = editFieldColors()
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = website,
                        onValueChange = { website = it },
                        label = { Text("Site Web ou Portfolio") },
                        leadingIcon = { Icon(Icons.Default.Language, contentDescription = null, tint = colors.textSecondary) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("input_social_website"),
                        shape = RoundedCornerShape(10.dp),
                        colors = editFieldColors()
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Save Action Button
            Button(
                onClick = {
                    if (currentUserId == null) return@Button
                    isSaving = true
                    statusMessage = null
                    isError = false
                    scope.launch {
                        val currentProfile = profile ?: UserProfile(
                            id = currentUserId!!,
                            email = sessionManager.getUserEmail()
                        )
                        val updatedProfile = currentProfile.copy(
                            fullName = fullName.trim(),
                            username = username.trim().lowercase(),
                            bio = bio.trim(),
                            location = location.trim(),
                            category = category.trim().ifBlank { "Créateur de contenu" },
                            avatarUrl = avatarUrl
                        )

                        val profileResult = profileRepository.updateProfile(updatedProfile)
                        if (profileResult.isSuccess) {
                            val links = SocialLinks(
                                userId = currentUserId!!,
                                youtube = youtube.trim().takeIf { it.isNotBlank() },
                                instagram = instagram.trim().takeIf { it.isNotBlank() },
                                tiktok = tiktok.trim().takeIf { it.isNotBlank() },
                                website = website.trim().takeIf { it.isNotBlank() }
                            )
                            profileRepository.saveSocialLinks(currentUserId!!, links)
                            statusMessage = "Profil enregistré dans Supabase avec succès !"
                            isError = false
                            onSavedSuccess()
                        } else {
                            statusMessage = "Erreur Supabase : ${profileResult.exceptionOrNull()?.message}"
                            isError = true
                        }
                        isSaving = false
                    }
                },
                enabled = !isSaving,
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.champagne,
                    contentColor = if (colors.isDark) colors.background else androidx.compose.ui.graphics.Color.White
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("save_profile_button")
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        color = if (colors.isDark) colors.background else androidx.compose.ui.graphics.Color.White,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("Enregistrement...", fontWeight = FontWeight.Bold)
                } else {
                    Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("Enregistrer les modifications", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedButton(
                onClick = onNavigateBack,
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.textSecondary),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag("cancel_edit_profile_button")
            ) {
                Text("Annuler")
            }

            Spacer(modifier = Modifier.height(24.dp))
            // Espacement bas généreux pour défilement avec clavier actif
            Spacer(modifier = Modifier.height(120.dp))
        }
    }
}

@Composable
private fun editFieldColors(): androidx.compose.material3.TextFieldColors {
    val colors = PanuTheme.colors
    return OutlinedTextFieldDefaults.colors(
        focusedBorderColor = colors.champagne,
        unfocusedBorderColor = colors.surfaceBorder,
        focusedLabelColor = colors.champagne,
        unfocusedLabelColor = colors.textSecondary,
        focusedTextColor = colors.textPrimary,
        unfocusedTextColor = colors.textPrimary,
        focusedContainerColor = colors.surfaceElevated,
        unfocusedContainerColor = colors.surfaceElevated,
        cursorColor = colors.champagne
    )
}
