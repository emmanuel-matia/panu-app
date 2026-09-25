package com.example.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.data.repository.AuthRepository
import com.example.ui.components.PanuTopBar
import com.example.ui.theme.PanuGold
import com.example.ui.theme.PanuObsidian
import com.example.ui.theme.PanuSurfaceBorder
import com.example.ui.theme.PanuTerracotta
import com.example.ui.theme.PanuTextPrimaryDark
import com.example.ui.theme.PanuTextSecondaryDark
import kotlinx.coroutines.launch

@Composable
fun ForgotPasswordScreen(
    authRepository: AuthRepository,
    onNavigateBack: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var isSuccess by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            PanuTopBar(
                title = "PANU",
                subtitle = "Récupération du compte",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack
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
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Mot de passe oublié",
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black),
                color = PanuTextPrimaryDark
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Entrez votre email pour recevoir les instructions de réinitialisation sécurisées via Supabase.",
                style = MaterialTheme.typography.bodyMedium,
                color = PanuTextSecondaryDark,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )

            Spacer(modifier = Modifier.height(32.dp))

            if (message != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            if (isSuccess) PanuGold.copy(alpha = 0.2f) else MaterialTheme.colorScheme.error.copy(alpha = 0.15f),
                            RoundedCornerShape(8.dp)
                        )
                        .padding(12.dp)
                ) {
                    Text(
                        text = message ?: "",
                        color = if (isSuccess) PanuGold else MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Adresse email de votre compte") },
                leadingIcon = {
                    Icon(Icons.Default.Email, contentDescription = null, tint = PanuGold)
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Done
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("forgot_password_email_input"),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = PanuTerracotta,
                    unfocusedBorderColor = PanuSurfaceBorder,
                    focusedLabelColor = PanuTerracotta,
                    unfocusedLabelColor = PanuTextSecondaryDark,
                    focusedTextColor = PanuTextPrimaryDark,
                    unfocusedTextColor = PanuTextPrimaryDark
                )
            )

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    if (email.isBlank()) {
                        message = "Veuillez renseigner votre adresse email."
                        isSuccess = false
                        return@Button
                    }
                    isLoading = true
                    message = null
                    scope.launch {
                        // TODO: Implement password reset via AuthViewModel
                        isLoading = false
                        isSuccess = false
                        message = "Fonctionnalité temporairement désactivée."
                    }
                },
                enabled = !isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("forgot_password_submit_btn"),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = PanuTerracotta,
                    contentColor = PanuTextPrimaryDark
                )
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = PanuTextPrimaryDark,
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.5.dp
                    )
                } else {
                    Text(
                        text = "Envoyer le lien de réinitialisation",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }
        }
    }
}
