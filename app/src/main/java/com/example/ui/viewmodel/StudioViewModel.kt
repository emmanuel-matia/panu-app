package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.repository.ai.CreativeMediaService
import com.example.data.repository.ai.GroundingService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class StudioViewModel(
    private val mediaService: CreativeMediaService,
    private val groundingService: GroundingService
) : ViewModel() {

    private val _result = MutableStateFlow<String?>(null)
    val result: StateFlow<String?> = _result

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    fun generateImage(prompt: String) = performAction { mediaService.generateImage(prompt) }
    fun generateVideo(prompt: String) = performAction { mediaService.generateVideo(prompt) }
    fun generateMusic(prompt: String) = performAction { mediaService.generateMusic(prompt) }
    fun search(prompt: String) = performAction { groundingService.search(prompt) }
    fun getMapData(prompt: String) = performAction { groundingService.getMapData(prompt) }

    private fun performAction(action: suspend () -> Result<String>) {
        viewModelScope.launch {
            _loading.value = true
            val result = action()
            _result.value = result.getOrElse { it.message ?: "Erreur" }
            _loading.value = false
        }
    }
}
