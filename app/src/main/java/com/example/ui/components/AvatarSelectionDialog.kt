package com.example.ui.components

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.ui.theme.PanuTheme
import com.example.ui.util.MediaPickerUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AvatarSelectionDialog(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    onImageSelected: (Uri) -> Unit
) {
    if (!isOpen) return

    val context = LocalContext.current
    var tempCameraUri by remember { mutableStateOf<Uri?>(null) }
    var showCameraPermissionNotice by remember { mutableStateOf(false) }

    // 1. Sélecteur natif Galerie Photos locale
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            onImageSelected(uri)
            onDismiss()
        }
    }

    // 2. Parcourir la mémoire du téléphone / Fichiers (Fallback direct stockage)
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            onImageSelected(uri)
            onDismiss()
        }
    }

    // 3. Capture photo caméra native (Appareil photo physique)
    val takePhotoLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success: Boolean ->
        if (success && tempCameraUri != null) {
            onImageSelected(tempCameraUri!!)
            onDismiss()
        }
    }

    // Gestion de la permission caméra
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            val uri = MediaPickerUtils.createTempFileUri(context, "panu_avatar_camera_", ".jpg")
            tempCameraUri = uri
            takePhotoLauncher.launch(uri)
        } else {
            showCameraPermissionNotice = true
        }
    }

    fun launchCamera() {
        val hasCamPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED

        if (hasCamPermission) {
            val uri = MediaPickerUtils.createTempFileUri(context, "panu_avatar_camera_", ".jpg")
            tempCameraUri = uri
            takePhotoLauncher.launch(uri)
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = PanuTheme.colors.surface,
        dragHandle = { BottomSheetDefaults.DragHandle(color = PanuTheme.colors.champagne.copy(alpha = 0.5f)) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Choisir une photo de profil",
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                    color = PanuTheme.colors.textPrimary
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Fermer", tint = PanuTheme.colors.textSecondary)
                }
            }

            if (showCameraPermissionNotice) {
                Surface(
                    color = MaterialTheme.colorScheme.errorContainer,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Permission appareil photo requise. Veuillez l'activer dans les paramètres système de l'appareil.",
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }

            Text(
                text = "Sélectionnez votre photo réelle depuis votre téléphone pour mettre à jour votre profil :",
                style = MaterialTheme.typography.bodyMedium,
                color = PanuTheme.colors.textSecondary
            )

            // Source 1: Galerie native du téléphone
            SourceActionCard(
                icon = Icons.Default.PhotoLibrary,
                title = "Galerie Photos (Sélecteur natif)",
                description = "Ouvrir directement la galerie et les photos de votre appareil",
                testTag = "picker_btn_gallery",
                onClick = {
                    photoPickerLauncher.launch("image/*")
                }
            )

            // Source 2: Appareil photo physique
            SourceActionCard(
                icon = Icons.Default.CameraAlt,
                title = "Appareil photo (Prendre une photo)",
                description = "Capturer une nouvelle photo avec la caméra du smartphone",
                testTag = "picker_btn_camera",
                onClick = { launchCamera() }
            )

            // Source 3: Parcourir les fichiers & stockage du téléphone
            SourceActionCard(
                icon = Icons.Default.FolderOpen,
                title = "Mémoire du téléphone (Stockage / Fichiers)",
                description = "Accéder à l'explorateur de fichiers, Téléchargements ou Drive",
                testTag = "picker_btn_storage",
                onClick = {
                    filePickerLauncher.launch("image/*")
                }
            )
        }
    }
}

@Composable
private fun SourceActionCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    description: String,
    testTag: String = "",
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .testTag(testTag),
        shape = RoundedCornerShape(12.dp),
        color = PanuTheme.colors.surfaceElevated,
        border = androidx.compose.foundation.BorderStroke(1.dp, PanuTheme.colors.surfaceBorder)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(PanuTheme.colors.champagne.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = PanuTheme.colors.champagne, modifier = Modifier.size(22.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                    color = PanuTheme.colors.textPrimary
                )
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = PanuTheme.colors.textSecondary
                )
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = PanuTheme.colors.textSecondary)
        }
    }
}
