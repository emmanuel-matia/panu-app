package com.example.ui.screens.auth

import androidx.compose.runtime.Composable
import com.example.data.repository.AuthRepository

@Composable
fun RegisterScreen(
    authRepository: AuthRepository,
    onRegisterSuccess: () -> Unit,
    onNavigateToLogin: () -> Unit,
    onNavigateToSettings: () -> Unit = {}
) {
    LoginScreen(
        authRepository = authRepository,
        initialTab = 0, // Onglet "S'inscrire"
        onLoginSuccess = onRegisterSuccess,
        onNavigateToForgotPassword = onNavigateToLogin,
        onNavigateToSettings = onNavigateToSettings,
        onContinueAsGuest = onNavigateToLogin
    )
}
