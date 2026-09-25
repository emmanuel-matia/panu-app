package com.example.ui.screens.chat

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.data.model.ChatMessage
import java.util.UUID

@Composable
fun ChatScreen(
    // viewModel: ChatViewModel // À connecter ultérieurement
) {
    var messageText by remember { mutableStateOf("") }
    val messages = remember { mutableStateListOf<ChatMessage>() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        LazyColumn(modifier = Modifier.weight(1f)) {
            items(messages) { message ->
                Text(
                    text = "${message.role}: ${message.text}",
                    modifier = Modifier.padding(8.dp)
                )
            }
        }
        
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { /* Lancer transcription */ }) {
                Icon(Icons.Default.Mic, contentDescription = "Enregistrer audio")
            }
            TextField(
                value = messageText,
                onValueChange = { messageText = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("Écrivez un message...") }
            )
            IconButton(onClick = {
                if (messageText.isNotBlank()) {
                    messages.add(ChatMessage(UUID.randomUUID().toString(), "user", messageText))
                    messageText = ""
                }
            }) {
                Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Envoyer")
            }
        }
    }
}
