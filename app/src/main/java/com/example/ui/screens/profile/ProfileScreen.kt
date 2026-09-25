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
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Settings
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
import com.example.ui.components.AvatarSelectionDialog
import com.example.data.model.UserProfile
import com.example.data.repository.AuthRepository
import com.example.data.repository.ProfileRepository
import com.example.ui.components.PanuAvatar
import com.example.ui.components.PanuBottomNav
import com.example.ui.components.PanuRoleBadge
import com.example.ui.components.PanuTopBar
import com.example.ui.navigation.PanuScreen
import com.example.ui.theme.PanuTheme
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(
    profileRepository: ProfileRepository,
    authRepository: AuthRepository,
    sessionManager: SessionManager,
    isFounder: Boolean,
    onNavigate: (String) -> Unit,
    onMenuClick: (() -> Unit)? = null,
    onOpenPublicProfile: (String) -> Unit,
    onLogout: () -> Unit,
    onNavigateToFounder: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    val colors = PanuTheme.colors
    val currentUserId by sessionManager.currentUserId.collectAsState()
    val profile by profileRepository.getProfileFlow(currentUserId ?: "").collectAsState(initial = null)
    val socialLinks by profileRepository.getSocialLinksFlow(currentUserId ?: "").collectAsState(initial = null)

    var fullName by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var avatarUrl by remember { mutableStateOf<String?>(null) }

    // Social links
    var facebook by remember { mutableStateOf("") }
    var youtube by remember { mutableStateOf("") }
    var tiktok by remember { mutableStateOf("") }
    var instagram by remember { mutableStateOf("") }
    var x by remember { mutableStateOf("") }
    var whatsapp by remember { mutableStateOf("") }
    var website by remember { mutableStateOf("") }

    var isSaving by remember { mutableStateOf(false) }
    var isUploadingAvatar by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var isError by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    var isProfileInitialized by remember { mutableStateOf(false) }
    var isSocialInitialized by remember { mutableStateOf(false) }

    // Load initial values when profile changes (only once to avoid resetting user input while typing)
    LaunchedEffect(profile) {
        if (!isProfileInitialized && profile != null) {
            profile?.let { p ->
                fullName = p.fullName ?: ""
                username = p.username ?: ""
                bio = p.bio ?: ""
                location = p.location ?: ""
                category = p.category ?: "Créateur de contenu"
                avatarUrl = p.avatarUrl
            }
            isProfileInitialized = true
        }
    }

    LaunchedEffect(socialLinks) {
        if (!isSocialInitialized && socialLinks != null) {
            socialLinks?.let { s ->
                facebook = s.facebook ?: ""
                youtube = s.youtube ?: ""
                tiktok = s.tiktok ?: ""
                instagram = s.instagram ?: ""
                x = s.x ?: ""
                whatsapp = s.whatsapp ?: ""
                website = s.website ?: ""
            }
            isSocialInitialized = true
        }
    }

    LaunchedEffect(currentUserId) {
        currentUserId?.let {
            profileRepository.refreshProfile(it)
            profileRepository.refreshSocialLinks(it)
        }
    }

    // Native Avatar Selection Dialog (Camera, Gallery, Files, Presets)
    var showAvatarDialog by remember { mutableStateOf(false) }

    AvatarSelectionDialog(
        isOpen = showAvatarDialog,
        onDismiss = { showAvatarDialog = false },
        onImageSelected = { uri ->
            val effectiveUserId = currentUserId ?: "creator_default"
            isUploadingAvatar = true
            message = "Envoi de la photo vers Supabase Storage..."
            isError = false
            scope.launch {
                val res = profileRepository.uploadAvatar(effectiveUserId, uri)
                isUploadingAvatar = false
                if (res.isSuccess) {
                    val newUrl = res.getOrThrow()
                    avatarUrl = newUrl
                    val targetProfile = profile ?: UserProfile(
                        id = effectiveUserId,
                        email = "createur@panu.app",
                        fullName = fullName.ifBlank { "Créateur PANU" }
                    )
                    profileRepository.updateProfile(targetProfile.copy(avatarUrl = newUrl))
                    message = "Photo de profil mise à jour avec succès !"
                    isError = false
                } else {
                    message = "Échec upload : ${res.exceptionOrNull()?.localizedMessage}"
                    isError = true
                }
            }
        }
    )

    Scaffold(
        topBar = {
            PanuTopBar(
                title = "Mon profil",
                subtitle = "Compte utilisateur PANU",
                onMenuClick = onMenuClick,
                isFounder = isFounder,
                onFounderClick = onNavigateToFounder,
                onSettingsClick = onNavigateToSettings
            )
        },
        bottomBar = {
            PanuBottomNav(
                currentRoute = PanuScreen.Profile.route,
                isFounder = isFounder,
                onNavigate = onNavigate
            )
        },
        containerColor = colors.background
    ) { padding ->
        if (currentUserId.isNullOrBlank()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(colors.champagneSubtle),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = colors.champagne,
                        modifier = Modifier.size(44.dp)
                    )
                }
                Spacer(modifier = Modifier.height(20.dp))
                Text(
                    text = "Compte Invité",
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                    color = colors.textPrimary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Créez un compte ou connectez-vous pour interagir et publier vos vidéos.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.textSecondary,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = { onNavigate(PanuScreen.Login.route) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.champagne,
                        contentColor = if (colors.isDark) colors.background else androidx.compose.ui.graphics.Color.White
                    ),
                    modifier = Modifier
                        .fillMaxWidth(0.85f)
                        .height(50.dp)
                ) {
                    Text("Se connecter / S'inscrire", fontWeight = FontWeight.Bold)
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .imePadding()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
            // Profile Header Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colors.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Avatar with upload & delete buttons
                    Box(contentAlignment = Alignment.BottomEnd) {
                        PanuAvatar(
                            avatarUrl = avatarUrl,
                            fullName = fullName.ifBlank { "PANU" },
                            size = 88.dp,
                            borderWidth = 2.dp
                        )
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(colors.champagne)
                                .clickable {
                                    showAvatarDialog = true
                                }
                                .testTag("profile_change_avatar_btn"),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isUploadingAvatar) {
                                CircularProgressIndicator(
                                    color = if (colors.isDark) colors.background else androidx.compose.ui.graphics.Color.White,
                                    strokeWidth = 2.dp,
                                    modifier = Modifier.size(16.dp)
                                )
                            } else {
                                Icon(
                                    Icons.Default.CameraAlt,
                                    contentDescription = "Changer la photo",
                                    tint = if (colors.isDark) colors.background else androidx.compose.ui.graphics.Color.White,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }

                    if (!avatarUrl.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        TextButtonAction(
                            label = "Supprimer la photo",
                            icon = Icons.Default.Delete,
                            color = MaterialTheme.colorScheme.error,
                            onClick = {
                                avatarUrl = null
                                profile?.copy(avatarUrl = null)?.let { updated ->
                                    scope.launch { profileRepository.updateProfile(updated) }
                                }
                            }
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = fullName.ifBlank { "Créateur PANU" },
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Black),
                        color = colors.textPrimary
                    )
                    Text(
                        text = if (username.isNotBlank()) "@$username" else "@votre_username",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.champagne
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    profile?.let { PanuRoleBadge(it.userRole) }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Button to edit profile directly
                    Button(
                        onClick = { onNavigate(PanuScreen.EditProfile.route) },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("profile_edit_nav_btn"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = colors.champagne,
                            contentColor = if (colors.isDark) colors.background else androidx.compose.ui.graphics.Color.White
                        )
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Modifier mon profil", fontWeight = FontWeight.Bold)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Button to view public profile
                    OutlinedButton(
                        onClick = {
                            val handle = username.ifBlank { currentUserId ?: "" }
                            onOpenPublicProfile(handle)
                        },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("profile_view_public_btn"),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.champagne),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.champagne)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Voir mon profil public partageable", fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (message != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            if (isError) MaterialTheme.colorScheme.error.copy(alpha = 0.15f) else colors.champagneSubtle,
                            RoundedCornerShape(8.dp)
                        )
                        .padding(12.dp)
                        .testTag("profile_status_msg")
                ) {
                    Text(
                        text = message ?: "",
                        color = if (isError) MaterialTheme.colorScheme.error else colors.champagne,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Edit Profile Fields
            Text(
                text = "Informations générales",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
            )

            OutlinedTextField(
                value = fullName,
                onValueChange = { fullName = it },
                label = { Text("Nom complet ou Marque") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("profile_name_input"),
                shape = RoundedCornerShape(12.dp),
                colors = textFieldColors()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = username,
                onValueChange = { username = it.replace(" ", "_").lowercase() },
                label = { Text("Nom d'utilisateur (URL @username)") },
                singleLine = true,
                prefix = { Text("@", color = colors.champagne) },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("profile_username_input"),
                shape = RoundedCornerShape(12.dp),
                colors = textFieldColors()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = bio,
                onValueChange = { bio = it },
                label = { Text("Biographie") },
                minLines = 3,
                maxLines = 5,
                placeholder = { Text("Parlez de vous ou de votre activité...") },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("profile_bio_input"),
                shape = RoundedCornerShape(12.dp),
                colors = textFieldColors()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = location,
                onValueChange = { location = it },
                label = { Text("Localisation (Ville, Pays)") },
                leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null, tint = colors.champagne) },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("profile_location_input"),
                shape = RoundedCornerShape(12.dp),
                colors = textFieldColors()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = category,
                onValueChange = { category = it },
                label = { Text("Catégorie d'activité") },
                leadingIcon = { Icon(Icons.Default.Category, contentDescription = null, tint = colors.champagne) },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("profile_category_input"),
                shape = RoundedCornerShape(12.dp),
                colors = textFieldColors()
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Social links
            Text(
                text = "Liens sociaux & Canaux",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
            )

            OutlinedTextField(
                value = facebook,
                onValueChange = { facebook = it },
                label = { Text("Facebook URL") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("profile_link_facebook"),
                shape = RoundedCornerShape(12.dp),
                colors = textFieldColors()
            )
            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = youtube,
                onValueChange = { youtube = it },
                label = { Text("YouTube URL") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("profile_link_youtube"),
                shape = RoundedCornerShape(12.dp),
                colors = textFieldColors()
            )
            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = tiktok,
                onValueChange = { tiktok = it },
                label = { Text("TikTok URL ou @handle") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("profile_link_tiktok"),
                shape = RoundedCornerShape(12.dp),
                colors = textFieldColors()
            )
            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = instagram,
                onValueChange = { instagram = it },
                label = { Text("Instagram URL ou @handle") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("profile_link_instagram"),
                shape = RoundedCornerShape(12.dp),
                colors = textFieldColors()
            )
            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = x,
                onValueChange = { x = it },
                label = { Text("X (Twitter) URL ou @handle") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("profile_link_x"),
                shape = RoundedCornerShape(12.dp),
                colors = textFieldColors()
            )
            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = whatsapp,
                onValueChange = { whatsapp = it },
                label = { Text("WhatsApp (Numéro international ou wa.me)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("profile_link_whatsapp"),
                shape = RoundedCornerShape(12.dp),
                colors = textFieldColors()
            )
            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = website,
                onValueChange = { website = it },
                label = { Text("Site web officiel") },
                leadingIcon = { Icon(Icons.Default.Language, contentDescription = null, tint = colors.champagne) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("profile_link_website"),
                shape = RoundedCornerShape(12.dp),
                colors = textFieldColors()
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Save Button
            Button(
                onClick = {
                    val uid = currentUserId ?: return@Button
                    isSaving = true
                    message = null
                    scope.launch {
                        val current = profile ?: UserProfile(id = uid)
                        val updated = current.copy(
                            fullName = fullName.trim(),
                            username = username.trim().removePrefix("@"),
                            bio = bio.trim(),
                            location = location.trim(),
                            category = category.trim(),
                            avatarUrl = avatarUrl
                        )
                        val saveProfileRes = profileRepository.updateProfile(updated)

                        val links = SocialLinks(
                            userId = uid,
                            facebook = facebook.trim().takeIf { it.isNotBlank() },
                            youtube = youtube.trim().takeIf { it.isNotBlank() },
                            tiktok = tiktok.trim().takeIf { it.isNotBlank() },
                            instagram = instagram.trim().takeIf { it.isNotBlank() },
                            x = x.trim().takeIf { it.isNotBlank() },
                            whatsapp = whatsapp.trim().takeIf { it.isNotBlank() },
                            website = website.trim().takeIf { it.isNotBlank() }
                        )
                        profileRepository.saveSocialLinks(uid, links)

                        isSaving = false
                        if (saveProfileRes.isSuccess) {
                            message = "Profil et liens sociaux enregistrés avec succès !"
                            isError = false
                        } else {
                            message = saveProfileRes.exceptionOrNull()?.localizedMessage ?: "Erreur de sauvegarde"
                            isError = true
                        }
                    }
                },
                enabled = !isSaving,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("profile_save_btn"),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.champagne,
                    contentColor = if (colors.isDark) colors.background else androidx.compose.ui.graphics.Color.White
                )
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        color = if (colors.isDark) colors.background else androidx.compose.ui.graphics.Color.White,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(20.dp)
                    )
                } else {
                    Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Enregistrer les modifications", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Paramètres & Apparence Button
            OutlinedButton(
                onClick = onNavigateToSettings,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("profile_settings_btn"),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.textPrimary),
                border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder)
            ) {
                Icon(
                    Icons.Default.Settings,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = colors.champagne
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Paramètres & Apparence", fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Logout Button
            OutlinedButton(
                onClick = {
                    scope.launch {
                        authRepository.logout()
                        onLogout()
                    }
                },
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("profile_logout_btn"),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.5f))
            ) {
                Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Se déconnecter", fontWeight = FontWeight.Bold)
            }

            // Espacement de défilement avec clavier actif
            Spacer(modifier = Modifier.height(120.dp))
        }
        }
    }
}

@Composable
fun TextButtonAction(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, color: androidx.compose.ui.graphics.Color, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .clickable { onClick() }
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(14.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text(label, color = color, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun textFieldColors(): androidx.compose.material3.TextFieldColors {
    val colors = PanuTheme.colors
    return OutlinedTextFieldDefaults.colors(
        focusedBorderColor = colors.champagne,
        unfocusedBorderColor = colors.surfaceBorder,
        focusedLabelColor = colors.champagne,
        unfocusedLabelColor = colors.textSecondary,
        focusedTextColor = colors.textPrimary,
        unfocusedTextColor = colors.textPrimary,
        focusedContainerColor = colors.surfaceElevated,
        unfocusedContainerColor = colors.surfaceElevated
    )
}
