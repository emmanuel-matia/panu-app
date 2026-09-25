package com.example.ui.screens.studio

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.data.repository.GeminiRepository
import com.example.data.repository.ai.CreativeMediaService
import com.example.data.repository.ai.GroundingService
import com.example.ui.viewmodel.StudioViewModel

@Composable
fun StudioScreen(
    mediaService: CreativeMediaService,
    groundingService: GroundingService,
    geminiRepository: GeminiRepository? = null
) {
    if (geminiRepository != null) {
        var topStudioTab by remember { mutableStateOf(0) } // 0: Séries & Académie, 1: Média Rapide

        Column(modifier = Modifier.fillMaxSize()) {
            TabRow(
                selectedTabIndex = topStudioTab,
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.primary
            ) {
                Tab(
                    selected = topStudioTab == 0,
                    onClick = { topStudioTab = 0 },
                    text = { Text("Séries & Académie IA") },
                    icon = { Icon(Icons.Default.MovieFilter, contentDescription = null, modifier = Modifier.size(18.dp)) }
                )
                Tab(
                    selected = topStudioTab == 1,
                    onClick = { topStudioTab = 1 },
                    text = { Text("Studio Média") },
                    icon = { Icon(Icons.Default.AutoFixHigh, contentDescription = null, modifier = Modifier.size(18.dp)) }
                )
            }

            Box(modifier = Modifier.fillMaxSize().weight(1f)) {
                if (topStudioTab == 0) {
                    SeriesGeneratorScreen(repository = geminiRepository)
                } else {
                    MediaStudioContent(mediaService = mediaService, groundingService = groundingService)
                }
            }
        }
    } else {
        MediaStudioContent(mediaService = mediaService, groundingService = groundingService)
    }
}

@Composable
private fun MediaStudioContent(
    mediaService: CreativeMediaService,
    groundingService: GroundingService
) {
    val viewModel = remember { StudioViewModel(mediaService, groundingService) }
    val result by viewModel.result.collectAsState()
    val loading by viewModel.loading.collectAsState()

    var prompt by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Studio Média Créatif", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = prompt,
            onValueChange = { prompt = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Décrivez votre création...") },
            minLines = 3
        )

        if (loading) {
            Box(modifier = Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        result?.let {
            Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Text(text = "Résultat:\n$it", modifier = Modifier.padding(16.dp), style = MaterialTheme.typography.bodyMedium)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        Text("Générateurs Créatifs :", style = MaterialTheme.typography.titleSmall)
        Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { viewModel.generateImage(prompt) }, modifier = Modifier.weight(1f)) { Text("Image") }
            Button(onClick = { viewModel.generateVideo(prompt) }, modifier = Modifier.weight(1f)) { Text("Vidéo") }
            Button(onClick = { viewModel.generateMusic(prompt) }, modifier = Modifier.weight(1f)) { Text("Musique") }
        }

        Spacer(modifier = Modifier.height(12.dp))
        Text("Recherche & Contexte :", style = MaterialTheme.typography.titleSmall)
        Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { viewModel.search(prompt) }, modifier = Modifier.weight(1f)) { Text("Recherche") }
            OutlinedButton(onClick = { viewModel.getMapData(prompt) }, modifier = Modifier.weight(1f)) { Text("Maps") }
        }
    }
}
