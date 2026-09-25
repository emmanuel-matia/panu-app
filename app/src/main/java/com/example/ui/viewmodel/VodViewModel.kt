package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.Content
import com.example.data.repository.ContentRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class VodViewModel(
    private val repository: ContentRepository,
    private val userId: String?
) : ViewModel() {

    private val _contents = MutableStateFlow<List<Content>>(emptyList())
    val contents: StateFlow<List<Content>> = _contents

    init {
        loadContents()
    }

    private fun loadContents() {
        viewModelScope.launch {
            _contents.value = repository.getContents()
        }
    }
    
    fun toggleFavorite(userId: String, content: Content) {
        viewModelScope.launch {
            repository.toggleFavorite(userId, content.id, !content.isFavorite)
            loadContents()
        }
    }

    fun saveHistory(userId: String, contentId: String, position: Int) {
        viewModelScope.launch {
            repository.saveHistory(userId, contentId, position)
        }
    }
}
