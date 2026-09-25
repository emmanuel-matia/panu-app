package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.remote.AuthResult
import com.example.data.remote.SupabaseAuthService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AuthViewModel(
    private val authService: SupabaseAuthService
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.LoggedOut)
    val authState: StateFlow<AuthState> = _authState

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    fun loginWithEmail(email: String, pass: String) = performAuth { authService.signIn(email, pass) }
    fun registerWithEmail(email: String, pass: String, fullName: String) = performAuth { authService.signUp(email, pass, fullName) }
    fun loginWithGoogleAccount(googleEmail: String, fullName: String? = null) = performAuth { authService.signInWithGoogleEmail(googleEmail, fullName) }
    fun loginWithGoogle() = performAuth { authService.signInWithGoogle(); Result.success(AuthResult("", "", "", "")) }
    fun sendOtp(phone: String) = performAuth { authService.sendOtpSms(phone) }
    fun verifyOtp(phone: String, token: String) = performAuth { authService.verifyOtp(phone, token) }

    private fun performAuth(action: suspend () -> Result<*>) {
        viewModelScope.launch {
            _loading.value = true
            val result = action()
            if (result.isSuccess) {
                _authState.value = AuthState.LoggedIn
            } else {
                _authState.value = AuthState.Error(result.exceptionOrNull()?.message ?: "Erreur")
            }
            _loading.value = false
        }
    }
}

sealed class AuthState {
    object LoggedOut : AuthState()
    object LoggedIn : AuthState()
    data class Error(val message: String) : AuthState()
}
