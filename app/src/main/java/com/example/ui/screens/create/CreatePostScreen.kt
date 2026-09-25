package com.example.ui.screens.create

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Audiotrack
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.VideoFile
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
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import com.example.data.local.SessionManager
import com.example.data.model.Post
import com.example.data.repository.PostRepository
import com.example.data.repository.ProfileRepository
import com.example.ui.components.PanuBottomNav
import com.example.ui.components.PanuTopBar
import com.example.ui.navigation.PanuScreen
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
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.io.File
import java.util.UUID

data class MediaAttachment(
    val uri: Uri,
    val type: String, // "image", "video", "audio"
    val name: String = "",
    val sizeText: String = ""
)

@Composable
fun CreatePostScreen(
    postRepository: PostRepository,
    profileRepository: ProfileRepository,
    sessionManager: SessionManager,
    isFounder: Boolean,
    onNavigate: (String) -> Unit,
    onNavigateToHome: () -> Unit,
    onNavigateToFounder: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var isPublic by remember { mutableStateOf(true) }

    // Media attachments list
    var attachments by remember { mutableStateOf<List<MediaAttachment>>(emptyList()) }

    var isSubmitting by remember { mutableStateOf(false) }
    var uploadStatusMessage by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    // Permission explanation dialog states
    var showCameraPermissionDialog by remember { mutableStateOf(false) }
    var showAudioPermissionDialog by remember { mutableStateOf(false) }
    var pendingCameraAction by remember { mutableStateOf<(() -> Unit)?>(null) }

    // Temporary URIs for Camera
    var tempCameraImageUri by remember { mutableStateOf<Uri?>(null) }
    var tempCameraVideoUri by remember { mutableStateOf<Uri?>(null) }

    // Activity Result Launchers
    // 1. Take Photo
    val takePhotoLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && tempCameraImageUri != null) {
            val att = MediaAttachment(
                uri = tempCameraImageUri!!,
                type = "image",
                name = "Photo caméra"
            )
            attachments = attachments + att
            errorMessage = null
        }
    }

    // 2. Record Video
    val recordVideoLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CaptureVideo()
    ) { success ->
        if (success && tempCameraVideoUri != null) {
            val att = MediaAttachment(
                uri = tempCameraVideoUri!!,
                type = "video",
                name = "Vidéo caméra"
            )
            attachments = attachments + att
            errorMessage = null
        }
    }

    // 3. Multi-Photo Local Gallery Picker (Sélecteur natif galerie locale)
    val multiPhotoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris ->
        if (uris.isNotEmpty()) {
            val newItems = uris.map { uri ->
                MediaAttachment(
                    uri = uri,
                    type = "image",
                    name = getFileName(context, uri) ?: "Image"
                )
            }
            attachments = attachments + newItems
            if (errorMessage != null) errorMessage = null
        }
    }

    // 4. Video Local Gallery Picker (Sélecteur natif vidéos locales)
    val videoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            val att = MediaAttachment(
                uri = uri,
                type = "video",
                name = getFileName(context, uri) ?: "Vidéo"
            )
            attachments = attachments + att
            if (errorMessage != null) errorMessage = null
        }
    }

    // 5. Audio / Music Picker
    val audioPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            val att = MediaAttachment(
                uri = uri,
                type = "audio",
                name = getFileName(context, uri) ?: "Piste audio"
            )
            attachments = attachments + att
            errorMessage = null
        }
    }

    // 6. Generic File Storage Picker (Fallback for empty emulator photo picker)
    val storageFilePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            val name = getFileName(context, uri) ?: "Fichier média"
            val type = when {
                name.endsWith(".mp4", true) || name.endsWith(".mov", true) || name.endsWith(".mkv", true) -> "video"
                name.endsWith(".mp3", true) || name.endsWith(".wav", true) || name.endsWith(".aac", true) -> "audio"
                else -> "image"
            }
            attachments = attachments + MediaAttachment(uri = uri, type = type, name = name)
            errorMessage = null
        }
    }

    // Camera permission request launcher
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            pendingCameraAction?.invoke()
        } else {
            errorMessage = "L'accès à la caméra est requis pour capturer des photos et vidéos."
        }
        pendingCameraAction = null
    }

    // Record audio permission request launcher
    val recordAudioPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            pendingCameraAction?.invoke()
        } else {
            errorMessage = "L'accès au microphone est requis pour enregistrer une vidéo avec le son."
        }
        pendingCameraAction = null
    }

    // Helper functions for triggering camera safely
    fun launchCameraPhoto() {
        val hasCam = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        if (hasCam) {
            val uri = createTempFileUri(context, "photo_", ".jpg")
            tempCameraImageUri = uri
            takePhotoLauncher.launch(uri)
        } else {
            pendingCameraAction = {
                val uri = createTempFileUri(context, "photo_", ".jpg")
                tempCameraImageUri = uri
                takePhotoLauncher.launch(uri)
            }
            showCameraPermissionDialog = true
        }
    }

    fun launchCameraVideo() {
        val hasCam = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        val hasMic = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

        if (!hasCam) {
            pendingCameraAction = { launchCameraVideo() }
            showCameraPermissionDialog = true
            return
        }
        if (!hasMic) {
            pendingCameraAction = { launchCameraVideo() }
            showAudioPermissionDialog = true
            return
        }

        val uri = createTempFileUri(context, "video_", ".mp4")
        tempCameraVideoUri = uri
        recordVideoLauncher.launch(uri)
    }

    // Permission Dialogs
    if (showCameraPermissionDialog) {
        AlertDialog(
            onDismissRequest = { showCameraPermissionDialog = false },
            title = { Text("Autoriser l'appareil photo") },
            text = { Text("PANU utilise votre appareil photo pour vous permettre de capturer directement des photos et des vidéos pour vos publications.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showCameraPermissionDialog = false
                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                ) {
                    Text("Autoriser", color = PanuGold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCameraPermissionDialog = false }) {
                    Text("Annuler", color = PanuTextSecondaryDark)
                }
            },
            containerColor = PanuSurfaceDark,
            titleContentColor = PanuTextPrimaryDark,
            textContentColor = PanuTextSecondaryDark
        )
    }

    if (showAudioPermissionDialog) {
        AlertDialog(
            onDismissRequest = { showAudioPermissionDialog = false },
            title = { Text("Autoriser le microphone") },
            text = { Text("PANU a besoin de l'accès au microphone pour capturer le son de vos vidéos enregistrées.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showAudioPermissionDialog = false
                        recordAudioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    }
                ) {
                    Text("Autoriser", color = PanuGold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAudioPermissionDialog = false }) {
                    Text("Annuler", color = PanuTextSecondaryDark)
                }
            },
            containerColor = PanuSurfaceDark,
            titleContentColor = PanuTextPrimaryDark,
            textContentColor = PanuTextSecondaryDark
        )
    }

    Scaffold(
        topBar = {
            PanuTopBar(
                title = "Créer",
                subtitle = "Caméra, Galerie & Publication",
                isFounder = isFounder,
                onFounderClick = onNavigateToFounder,
                onSettingsClick = onNavigateToSettings
            )
        },
        bottomBar = {
            PanuBottomNav(
                currentRoute = PanuScreen.Create.route,
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
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            Text(
                text = "Nouvelle publication",
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black),
                color = PanuTextPrimaryDark
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Capturez ou sélectionnez vos médias réels, rédigez votre contenu et publiez directement.",
                style = MaterialTheme.typography.bodyMedium,
                color = PanuTextSecondaryDark
            )

            Spacer(modifier = Modifier.height(18.dp))

            if (errorMessage != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.error.copy(alpha = 0.15f), RoundedCornerShape(10.dp))
                        .border(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
                        .padding(12.dp)
                        .testTag("create_error_box")
                ) {
                    Text(
                        text = errorMessage ?: "",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                Spacer(modifier = Modifier.height(14.dp))
            }

            if (successMessage != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(PanuGold.copy(alpha = 0.15f), RoundedCornerShape(10.dp))
                        .border(1.dp, PanuGold.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                        .padding(12.dp)
                        .testTag("create_success_box")
                ) {
                    Text(
                        text = successMessage ?: "",
                        color = PanuGold,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                Spacer(modifier = Modifier.height(14.dp))
            }

            // Title Input
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Titre de la création (optionnel)") },
                placeholder = { Text("Ex: Coulisses de mon atelier de fabrication") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("create_title_input"),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = PanuTerracotta,
                    unfocusedBorderColor = PanuSurfaceBorder,
                    focusedLabelColor = PanuTerracotta,
                    unfocusedLabelColor = PanuTextSecondaryDark,
                    focusedTextColor = PanuTextPrimaryDark,
                    unfocusedTextColor = PanuTextPrimaryDark,
                    focusedContainerColor = PanuSurfaceDark,
                    unfocusedContainerColor = PanuSurfaceDark
                )
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Content Input
            OutlinedTextField(
                value = content,
                onValueChange = {
                    content = it
                    if (errorMessage != null) errorMessage = null
                },
                label = { Text("Texte / Légende de la publication *") },
                placeholder = { Text("Décrivez votre création, partagez une histoire ou vos actualités...") },
                minLines = 4,
                maxLines = 8,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("create_content_input"),
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = PanuTerracotta,
                    unfocusedBorderColor = PanuSurfaceBorder,
                    focusedLabelColor = PanuTerracotta,
                    unfocusedLabelColor = PanuTextSecondaryDark,
                    focusedTextColor = PanuTextPrimaryDark,
                    unfocusedTextColor = PanuTextPrimaryDark,
                    focusedContainerColor = PanuSurfaceDark,
                    unfocusedContainerColor = PanuSurfaceDark
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            // MEDIA SOURCES SECTION (Caméra, Galerie Photos, Vidéo, Audio)
            Text(
                text = "Ajouter des médias",
                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                color = PanuGoldDark
            )
            Spacer(modifier = Modifier.height(8.dp))

            // Action Buttons Row for Media Capture / Picking
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // 1. Camera Photo
                MediaActionButton(
                    icon = Icons.Default.CameraAlt,
                    label = "Photo Caméra",
                    testTag = "create_btn_camera_photo",
                    onClick = { launchCameraPhoto() }
                )

                // 2. Gallery Photos (Single or Multiple depuis stockage interne local)
                MediaActionButton(
                    icon = Icons.Default.Image,
                    label = "Galerie Photos",
                    testTag = "create_btn_gallery_photos",
                    onClick = {
                        multiPhotoPickerLauncher.launch("image/*")
                    }
                )

                // 3. Record Video
                MediaActionButton(
                    icon = Icons.Default.Videocam,
                    label = "Filmer Vidéo",
                    testTag = "create_btn_camera_video",
                    onClick = { launchCameraVideo() }
                )

                // 4. Video from Gallery (Depuis stockage interne local)
                MediaActionButton(
                    icon = Icons.Default.VideoFile,
                    label = "Galerie Vidéo",
                    testTag = "create_btn_gallery_video",
                    onClick = {
                        videoPickerLauncher.launch("video/*")
                    }
                )

                // 5. Audio / Music File
                MediaActionButton(
                    icon = Icons.Default.Audiotrack,
                    label = "Audio / Musique",
                    testTag = "create_btn_pick_audio",
                    onClick = {
                        audioPickerLauncher.launch("audio/*")
                    }
                )

                // 6. Generic File Storage (Bypasses emulator gallery limitation)
                MediaActionButton(
                    icon = Icons.Default.FolderOpen,
                    label = "Stockage / Fichiers",
                    testTag = "create_btn_pick_storage",
                    onClick = {
                        storageFilePickerLauncher.launch("*/*")
                    }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // MEDIA PREVIEWS LIST
            if (attachments.isNotEmpty()) {
                Text(
                    text = "Fichiers sélectionnés (${attachments.size}) :",
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                    color = PanuTextSecondaryDark
                )
                Spacer(modifier = Modifier.height(8.dp))

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    itemsIndexed(attachments) { index, item ->
                        MediaPreviewItem(
                            item = item,
                            index = index,
                            total = attachments.size,
                            onRemove = {
                                attachments = attachments.toMutableList().also { it.removeAt(index) }
                            }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Visibility toggle (Public / Private)
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = PanuSurfaceDark,
                border = androidx.compose.foundation.BorderStroke(1.dp, PanuSurfaceBorder)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (isPublic) Icons.Default.Public else Icons.Default.Lock,
                            contentDescription = null,
                            tint = if (isPublic) PanuGold else PanuTextSecondaryDark,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = if (isPublic) "Visibilité publique" else "Visibilité privée",
                                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                                color = PanuTextPrimaryDark
                            )
                            Text(
                                text = if (isPublic) "Visible par toute la communauté PANU" else "Enregistré uniquement pour vous",
                                style = MaterialTheme.typography.labelSmall,
                                color = PanuTextSecondaryDark
                            )
                        }
                    }
                    Switch(
                        checked = isPublic,
                        onCheckedChange = { isPublic = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = PanuTerracotta,
                            checkedTrackColor = PanuTerracotta.copy(alpha = 0.3f),
                            uncheckedThumbColor = PanuTextSecondaryDark,
                            uncheckedTrackColor = PanuSurfaceElevated
                        ),
                        modifier = Modifier.testTag("create_visibility_switch")
                    )
                }
            }

            if (uploadStatusMessage != null) {
                Spacer(modifier = Modifier.height(14.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(PanuSurfaceElevated, RoundedCornerShape(8.dp))
                        .padding(12.dp)
                ) {
                    CircularProgressIndicator(
                        color = PanuTerracotta,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = uploadStatusMessage ?: "",
                        color = PanuGoldLight,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Action Buttons: Save Draft or Publish
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Save Draft
                OutlinedButton(
                    onClick = {
                        submitCompletePost(
                            status = "draft",
                            title = title,
                            content = content,
                            isPublic = isPublic,
                            attachments = attachments,
                            postRepository = postRepository,
                            profileRepository = profileRepository,
                            sessionManager = sessionManager,
                            scope = scope,
                            onProgress = { uploadStatusMessage = it },
                            onStart = {
                                isSubmitting = true
                                uploadStatusMessage = "Enregistrement du brouillon..."
                                errorMessage = null
                            },
                            onSuccess = {
                                isSubmitting = false
                                uploadStatusMessage = null
                                successMessage = "Brouillon sauvegardé avec succès dans Mes créations."
                            },
                            onError = { err ->
                                isSubmitting = false
                                uploadStatusMessage = null
                                errorMessage = err
                            }
                        )
                    },
                    enabled = !isSubmitting && (content.isNotBlank() || attachments.isNotEmpty()),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(50.dp)
                        .testTag("create_save_draft_btn"),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = PanuTextPrimaryDark),
                    border = androidx.compose.foundation.BorderStroke(1.dp, PanuSurfaceBorder)
                ) {
                    Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Brouillon")
                }

                // Publish Live
                Button(
                    onClick = {
                        submitCompletePost(
                            status = "published",
                            title = title,
                            content = content,
                            isPublic = isPublic,
                            attachments = attachments,
                            postRepository = postRepository,
                            profileRepository = profileRepository,
                            sessionManager = sessionManager,
                            scope = scope,
                            onProgress = { uploadStatusMessage = it },
                            onStart = {
                                isSubmitting = true
                                uploadStatusMessage = "Préparation de la publication..."
                                errorMessage = null
                            },
                            onSuccess = {
                                isSubmitting = false
                                uploadStatusMessage = null
                                successMessage = "Votre création est publiée sur PANU !"
                                onNavigateToHome()
                            },
                            onError = { err ->
                                isSubmitting = false
                                uploadStatusMessage = null
                                errorMessage = err
                            }
                        )
                    },
                    enabled = !isSubmitting && (content.isNotBlank() || attachments.isNotEmpty()),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(50.dp)
                        .testTag("create_publish_btn"),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PanuTerracotta,
                        contentColor = PanuTextPrimaryDark
                    )
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(
                            color = PanuTextPrimaryDark,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(20.dp)
                        )
                    } else {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Publier", fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Espacement de défilement avec clavier actif
            Spacer(modifier = Modifier.height(120.dp))
        }
    }
}

@Composable
private fun MediaActionButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    testTag: String,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .clickable { onClick() }
            .testTag(testTag),
        shape = RoundedCornerShape(12.dp),
        color = PanuSurfaceDark,
        border = androidx.compose.foundation.BorderStroke(1.dp, PanuSurfaceBorder)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = PanuGold,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                color = PanuTextPrimaryDark
            )
        }
    }
}

@Composable
private fun MediaPreviewItem(
    item: MediaAttachment,
    index: Int,
    total: Int,
    onRemove: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(130.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(PanuSurfaceElevated)
            .border(1.dp, PanuSurfaceBorder, RoundedCornerShape(12.dp))
    ) {
        when (item.type) {
            "image" -> {
                AsyncImage(
                    model = item.uri,
                    contentDescription = "Aperçu image",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }
            "video" -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(PanuObsidian.copy(alpha = 0.8f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.PlayArrow,
                            contentDescription = null,
                            tint = PanuGold,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Vidéo",
                        style = MaterialTheme.typography.labelSmall,
                        color = PanuTextPrimaryDark,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            "audio" -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(PanuTerracotta.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Audiotrack,
                            contentDescription = null,
                            tint = PanuTerracotta,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = item.name.take(12),
                        style = MaterialTheme.typography.labelSmall,
                        color = PanuTextPrimaryDark,
                        maxLines = 1
                    )
                }
            }
        }

        // Indicator badge
        if (total > 1) {
            Surface(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(6.dp),
                shape = RoundedCornerShape(4.dp),
                color = PanuObsidian.copy(alpha = 0.75f)
            ) {
                Text(
                    text = "${index + 1}/$total",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                    color = PanuTextPrimaryDark,
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                )
            }
        }

        // Remove button
        IconButton(
            onClick = onRemove,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(4.dp)
                .size(26.dp)
                .background(PanuObsidian.copy(alpha = 0.8f), CircleShape)
        ) {
            Icon(
                Icons.Default.Close,
                contentDescription = "Supprimer",
                tint = PanuTextPrimaryDark,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

private fun submitCompletePost(
    status: String,
    title: String,
    content: String,
    isPublic: Boolean,
    attachments: List<MediaAttachment>,
    postRepository: PostRepository,
    profileRepository: ProfileRepository,
    sessionManager: SessionManager,
    scope: kotlinx.coroutines.CoroutineScope,
    onProgress: (String) -> Unit,
    onStart: () -> Unit,
    onSuccess: () -> Unit,
    onError: (String) -> Unit
) {
    val userId = sessionManager.currentUserId.value.takeIf { !it.isNullOrBlank() } ?: "creator_local_user"

    onStart()
    scope.launch {
        try {
            var mediaUrl: String? = null
            var mediaType = "none"

            if (attachments.isNotEmpty()) {
                val uploadedUrls = mutableListOf<String>()
                val uploadedTypes = mutableListOf<String>()

                for ((idx, att) in attachments.withIndex()) {
                    onProgress("Téléversement ${idx + 1}/${attachments.size} (${att.name})...")
                    val isVideo = att.type == "video"
                    val isAudio = att.type == "audio"
                    val forcedType = if (isVideo) "video" else if (isAudio) "audio" else "image"

                    val uploadRes = postRepository.uploadMediaFile(userId, att.uri, forcedType)
                    if (uploadRes.isSuccess) {
                        val (url, resolvedType, _) = uploadRes.getOrThrow()
                        uploadedUrls.add(url)
                        uploadedTypes.add(resolvedType)
                    } else {
                        onError("Échec du téléversement (${att.name}) : ${uploadRes.exceptionOrNull()?.localizedMessage}")
                        return@launch
                    }
                }

                if (uploadedUrls.size == 1) {
                    mediaUrl = uploadedUrls[0]
                    mediaType = uploadedTypes[0]
                } else if (uploadedUrls.isNotEmpty()) {
                    mediaUrl = uploadedUrls.joinToString(";")
                    mediaType = if (uploadedTypes.all { it == "image" }) "carousel" else uploadedTypes[0]
                }
            }

            onProgress("Enregistrement dans Supabase...")
            val profile = profileRepository.getProfileFlow(userId).first()

            val post = Post(
                id = UUID.randomUUID().toString(),
                authorId = userId,
                authorName = profile?.fullName ?: profile?.username ?: "Auteur",
                authorUsername = profile?.username,
                authorAvatarUrl = profile?.avatarUrl,
                title = title.takeIf { it.isNotBlank() },
                content = content.trim(),
                mediaUrl = mediaUrl,
                mediaType = mediaType,
                status = status,
                visibility = if (isPublic) "public" else "private"
            )

            val saveRes = postRepository.savePost(post)
            if (saveRes.isSuccess) {
                onSuccess()
            } else {
                onError("Erreur de sauvegarde : ${saveRes.exceptionOrNull()?.localizedMessage}")
            }
        } catch (e: Exception) {
            onError("Erreur inattendue : ${e.localizedMessage}")
        }
    }
}

private fun createTempFileUri(context: Context, prefix: String, extension: String): Uri {
    val tempFile = File.createTempFile(prefix, extension, context.cacheDir).apply {
        createNewFile()
    }
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", tempFile)
}

private fun getFileName(context: Context, uri: Uri): String? {
    return try {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (nameIndex != -1 && cursor.moveToFirst()) {
                cursor.getString(nameIndex)
            } else null
        }
    } catch (_: Exception) {
        null
    }
}
