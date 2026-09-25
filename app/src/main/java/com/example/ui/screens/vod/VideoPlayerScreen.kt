package com.example.ui.screens.vod

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.ActivityInfo
import android.os.Build
import android.util.Rational
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackParameters
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView

@Composable
fun VideoPlayerScreen(videoUrl: String) {
    val context = LocalContext.current
    val activity = context as? Activity
    
    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(videoUrl))
            prepare()
            playWhenReady = true
        }
    }

    var isLocked by remember { mutableStateOf(false) }
    var playbackSpeed by remember { mutableFloatStateOf(1f) }
    var showSettings by remember { mutableStateOf(false) }

    DisposableEffect(Unit) {
        onDispose { exoPlayer.release() }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = !isLocked
                }
            },
            modifier = Modifier.fillMaxSize(),
            update = { it.useController = !isLocked }
        )

        // Overlay de contrôles avancés
        if (!isLocked) {
            Row(modifier = Modifier.align(Alignment.TopEnd).padding(16.dp)) {
                // Bouton PiP
                IconButton(onClick = {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val params = PictureInPictureParams.Builder()
                            .setAspectRatio(Rational(16, 9))
                            .build()
                        activity?.enterPictureInPictureMode(params)
                    }
                }) {
                    Text("PiP", color = MaterialTheme.colorScheme.onSurface)
                }
                
                // Sélecteur de vitesse
                TextButton(onClick = {
                    playbackSpeed = if (playbackSpeed >= 2f) 0.5f else playbackSpeed + 0.5f
                    exoPlayer.playbackParameters = PlaybackParameters(playbackSpeed)
                }) {
                    Text("${playbackSpeed}x")
                }
                
                // Bouton Paramètres (Qualité/Audio/S-T)
                IconButton(onClick = { showSettings = true }) {
                    Text("⚙️", color = MaterialTheme.colorScheme.onSurface)
                    DropdownMenu(expanded = showSettings, onDismissRequest = { showSettings = false }) {
                        DropdownMenuItem(text = { Text("Qualité") }, onClick = { /* TODO: Implement */ })
                        DropdownMenuItem(text = { Text("Audio") }, onClick = { /* TODO: Implement */ })
                        DropdownMenuItem(text = { Text("Sous-titres") }, onClick = { /* TODO: Implement */ })
                    }
                }
            }
        }

        // Bouton de verrouillage
        IconButton(
            onClick = { isLocked = !isLocked },
            modifier = Modifier.align(Alignment.BottomStart).padding(16.dp)
        ) {
            Text(if (isLocked) "🔒" else "🔓", style = MaterialTheme.typography.headlineMedium)
        }
    }
}
