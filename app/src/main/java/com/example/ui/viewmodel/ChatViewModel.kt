package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.ChatMessage
import com.example.data.repository.ai.GeminiAIProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.util.UUID

class ChatViewModel(
    private val aiProvider: GeminiAIProvider
) : ViewModel() {

    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages

    fun sendMessage(text: String) {
        val userMessage = ChatMessage(UUID.randomUUID().toString(), "user", text)
        _messages.value = _messages.value + userMessage

        viewModelScope.launch {
            // Note: In a real app, integrate multi-turn history here
            val result = aiProvider.generateCreativeContent(
                com.example.data.repository.ai.AICreativeCategory.PUBLICATION,
                text,
                emptyMap()
            )
            
            result.onSuccess { generatedResult ->
                val modelMessage = ChatMessage(UUID.randomUUID().toString(), "model", generatedResult.content)
                _messages.value = _messages.value + modelMessage
            }
        }
    }
}
