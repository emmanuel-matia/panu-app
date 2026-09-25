package com.example.ui.screens.auth

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.repository.AuthRepository
import com.example.data.repository.ProfileRepository
import com.example.ui.components.GoogleAccountChooserDialog
import com.example.ui.theme.PanuTheme
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    authRepository: AuthRepository,
    profileRepository: ProfileRepository? = null,
    initialTab: Int = 1, // 0 = S'inscrire, 1 = Se connecter
    onLoginSuccess: () -> Unit,
    onNavigateToForgotPassword: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    onContinueAsGuest: () -> Unit = {}
) {
    val colors = PanuTheme.colors
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // 0: S'inscrire, 1: Se connecter
    var selectedTab by remember { mutableIntStateOf(initialTab) }

    // Form fields
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var isPasswordVisible by remember { mutableStateOf(false) }

    // Loading & Error states
    var isLoading by remember { mutableStateOf(false) }
    var loadingMessage by remember { mutableStateOf("Veuillez patienter...") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    fun validateRegisterForm(): Boolean {
        if (fullName.trim().isBlank()) {
            errorMessage = "Veuillez renseigner votre nom complet ou marque."
            Toast.makeText(context, errorMessage, Toast.LENGTH_SHORT).show()
            return false
        }
        if (email.trim().isBlank()) {
            errorMessage = "Veuillez renseigner votre adresse email."
            Toast.makeText(context, errorMessage, Toast.LENGTH_SHORT).show()
            return false
        }
        if (!email.contains("@") || !email.contains(".")) {
            errorMessage = "Veuillez saisir une adresse email valide."
            Toast.makeText(context, errorMessage, Toast.LENGTH_SHORT).show()
            return false
        }
        if (password.length < 6) {
            errorMessage = "Le mot de passe doit comporter au moins 6 caractères."
            Toast.makeText(context, errorMessage, Toast.LENGTH_SHORT).show()
            return false
        }
        if (password != confirmPassword) {
            errorMessage = "Les deux mots de passe ne correspondent pas."
            Toast.makeText(context, errorMessage, Toast.LENGTH_SHORT).show()
            return false
        }
        return true
    }

    fun validateLoginForm(): Boolean {
        if (email.trim().isBlank()) {
            errorMessage = "Veuillez renseigner votre adresse email."
            Toast.makeText(context, errorMessage, Toast.LENGTH_SHORT).show()
            return false
        }
        if (password.isBlank()) {
            errorMessage = "Veuillez renseigner votre mot de passe."
            Toast.makeText(context, errorMessage, Toast.LENGTH_SHORT).show()
            return false
        }
        return true
    }

    fun handleRegister() {
        if (!validateRegisterForm() || isLoading) return
        isLoading = true
        loadingMessage = "Création du compte en cours..."
        errorMessage = null

        scope.launch {
            try {
                val result = authRepository.register(
                    email = email.trim(),
                    pass = password,
                    fullName = fullName.trim()
                )
                isLoading = false
                if (result.isSuccess) {
                    val auth = result.getOrNull()
                    Toast.makeText(
                        context,
                        "🎉 Compte créé avec succès ! Bienvenue sur PANU.",
                        Toast.LENGTH_LONG
                    ).show()
                    // Redirection immédiate vers le fil d'actualité
                    onLoginSuccess()
                } else {
                    val err = result.exceptionOrNull()?.localizedMessage ?: "Échec de l'inscription"
                    errorMessage = err
                    Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                isLoading = false
                errorMessage = e.localizedMessage ?: "Une erreur inattendue est survenue"
                Toast.makeText(context, errorMessage, Toast.LENGTH_LONG).show()
            }
        }
    }

    fun handleLogin() {
        if (!validateLoginForm() || isLoading) return
        isLoading = true
        loadingMessage = "Connexion en cours..."
        errorMessage = null

        scope.launch {
            try {
                val result = authRepository.login(
                    email = email.trim(),
                    pass = password
                )
                isLoading = false
                if (result.isSuccess) {
                    Toast.makeText(
                        context,
                        "👋 Connexion réussie ! Bon retour sur PANU.",
                        Toast.LENGTH_SHORT
                    ).show()
                    onLoginSuccess()
                } else {
                    val err = result.exceptionOrNull()?.localizedMessage ?: "Identifiants incorrects"
                    errorMessage = err
                    Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                isLoading = false
                errorMessage = e.localizedMessage ?: "Une erreur inattendue est survenue"
                Toast.makeText(context, errorMessage, Toast.LENGTH_LONG).show()
            }
        }
    }

    var showGoogleAccountDialog by remember { mutableStateOf(false) }

    fun processGoogleAccountLogin(accountName: String) {
        if (accountName.isBlank()) return
        isLoading = true
        loadingMessage = "Connexion avec $accountName..."
        errorMessage = null
        scope.launch {
            try {
                val authResult = authRepository.signInWithGoogleAccount(accountName)
                isLoading = false
                if (authResult.isSuccess) {
                    Toast.makeText(
                        context,
                        "👋 Connexion réussie avec Google ($accountName) !",
                        Toast.LENGTH_SHORT
                    ).show()
                    onLoginSuccess()
                } else {
                    val err = authResult.exceptionOrNull()?.localizedMessage ?: "Échec de l'authentification Google"
                    errorMessage = err
                    Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                isLoading = false
                errorMessage = e.localizedMessage ?: "Erreur de connexion Google"
                Toast.makeText(context, errorMessage, Toast.LENGTH_LONG).show()
            }
        }
    }

    // Sélecteur natif Google du système Android
    val googleAccountLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK && result.data != null) {
            val accountName = result.data?.getStringExtra(android.accounts.AccountManager.KEY_ACCOUNT_NAME)
            if (!accountName.isNullOrBlank()) {
                processGoogleAccountLogin(accountName)
            } else {
                showGoogleAccountDialog = true
            }
        } else {
            // Si la boîte de dialogue système est fermée sans sélection ou non supportée, ouvrir la boîte de dialogue native PANU
            showGoogleAccountDialog = true
        }
    }

    fun handleGoogleSignIn() {
        if (isLoading) return
        errorMessage = null
        try {
            val intent = android.accounts.AccountManager.newChooseAccountIntent(
                null,
                null,
                arrayOf("com.google"),
                null,
                null,
                null,
                null
            )
            googleAccountLauncher.launch(intent)
        } catch (_: Exception) {
            // Boîte de dialogue native Android en cas d'absence du sélecteur système d'intention
            showGoogleAccountDialog = true
        }
    }

    // Boîte de dialogue native Android Google One-Tap
    GoogleAccountChooserDialog(
        isOpen = showGoogleAccountDialog,
        onDismiss = { showGoogleAccountDialog = false },
        onAccountSelected = { accountEmail ->
            processGoogleAccountLogin(accountEmail)
        }
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(colors.champagneSubtle)
                                .border(1.dp, colors.champagne.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "P",
                                color = colors.champagne,
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "PANU Studio",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = colors.textPrimary
                        )
                    }
                },
                actions = {
                    TextButton(onClick = onContinueAsGuest) {
                        Text(
                            text = "Mode Invité",
                            color = colors.champagne,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = colors.background
                )
            )
        },
        containerColor = colors.background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Text(
                text = if (selectedTab == 0) "Créer un compte" else "Bienvenue sur PANU",
                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Black),
                color = colors.textPrimary,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = if (selectedTab == 0)
                    "Rejoignez le studio créatif et publiez vos créations"
                else
                    "Accédez à vos vidéos, flux et outils créatifs",
                style = MaterialTheme.typography.bodySmall,
                color = colors.textSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(20.dp))

            // ==============================================================
            // 1. COMMUTATEUR D'ONGLETS CLAIR : "S'INSCRIRE" / "SE CONNECTER"
            // ==============================================================
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp)),
                color = colors.surfaceElevated,
                shape = RoundedCornerShape(14.dp)
            ) {
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = colors.surfaceElevated,
                    contentColor = colors.champagne,
                    indicator = { tabPositions ->
                        TabRowDefaults.SecondaryIndicator(
                            Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                            color = colors.champagne,
                            height = 3.dp
                        )
                    },
                    divider = {}
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = {
                            selectedTab = 0
                            errorMessage = null
                        },
                        text = {
                            Text(
                                text = "S'inscrire",
                                fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Medium,
                                fontSize = 15.sp,
                                color = if (selectedTab == 0) colors.champagne else colors.textSecondary
                            )
                        },
                        modifier = Modifier.testTag("auth_tab_register")
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = {
                            selectedTab = 1
                            errorMessage = null
                        },
                        text = {
                            Text(
                                text = "Se connecter",
                                fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Medium,
                                fontSize = 15.sp,
                                color = if (selectedTab == 1) colors.champagne else colors.textSecondary
                            )
                        },
                        modifier = Modifier.testTag("auth_tab_login")
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Bannière d'erreur animée en français
            AnimatedVisibility(
                visible = errorMessage != null,
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                Surface(
                    color = MaterialTheme.colorScheme.errorContainer,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                        .testTag("auth_error_banner")
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.ErrorOutline,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = errorMessage ?: "",
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // ==============================================================
            // FORMULAIRE DYNAMIQUE SELON L'ONGLET SÉLECTIONNÉ
            // ==============================================================

            // Champ Nom (uniquement pour S'inscrire)
            if (selectedTab == 0) {
                OutlinedTextField(
                    value = fullName,
                    onValueChange = {
                        fullName = it
                        errorMessage = null
                    },
                    label = { Text("Nom complet ou Nom de créateur") },
                    leadingIcon = {
                        Icon(Icons.Default.Person, contentDescription = null, tint = colors.champagne)
                    },
                    singleLine = true,
                    enabled = !isLoading,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("register_fullname_input"),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.champagne,
                        unfocusedBorderColor = colors.surfaceBorder,
                        focusedLabelColor = colors.champagne,
                        unfocusedLabelColor = colors.textSecondary,
                        focusedTextColor = colors.textPrimary,
                        unfocusedTextColor = colors.textPrimary,
                        focusedContainerColor = colors.surface,
                        unfocusedContainerColor = colors.surface
                    )
                )
                Spacer(modifier = Modifier.height(14.dp))
            }

            // Champ Adresse Email
            OutlinedTextField(
                value = email,
                onValueChange = {
                    email = it
                    errorMessage = null
                },
                label = { Text("Adresse email") },
                leadingIcon = {
                    Icon(Icons.Default.Email, contentDescription = null, tint = colors.champagne)
                },
                singleLine = true,
                enabled = !isLoading,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(if (selectedTab == 0) "register_email_input" else "login_email_input"),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = colors.champagne,
                    unfocusedBorderColor = colors.surfaceBorder,
                    focusedLabelColor = colors.champagne,
                    unfocusedLabelColor = colors.textSecondary,
                    focusedTextColor = colors.textPrimary,
                    unfocusedTextColor = colors.textPrimary,
                    focusedContainerColor = colors.surface,
                    unfocusedContainerColor = colors.surface
                )
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Champ Mot de passe
            OutlinedTextField(
                value = password,
                onValueChange = {
                    password = it
                    errorMessage = null
                },
                label = { Text(if (selectedTab == 0) "Mot de passe (min. 6 caractères)" else "Mot de passe") },
                leadingIcon = {
                    Icon(Icons.Default.Lock, contentDescription = null, tint = colors.champagne)
                },
                trailingIcon = {
                    IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                        Icon(
                            imageVector = if (isPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = if (isPasswordVisible) "Masquer" else "Afficher",
                            tint = colors.textSecondary
                        )
                    }
                },
                visualTransformation = if (isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                singleLine = true,
                enabled = !isLoading,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = if (selectedTab == 0) ImeAction.Next else ImeAction.Done
                ),
                keyboardActions = KeyboardActions(
                    onDone = {
                        if (selectedTab == 1) handleLogin()
                    }
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(if (selectedTab == 0) "register_password_input" else "login_password_input"),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = colors.champagne,
                    unfocusedBorderColor = colors.surfaceBorder,
                    focusedLabelColor = colors.champagne,
                    unfocusedLabelColor = colors.textSecondary,
                    focusedTextColor = colors.textPrimary,
                    unfocusedTextColor = colors.textPrimary,
                    focusedContainerColor = colors.surface,
                    unfocusedContainerColor = colors.surface
                )
            )

            // Confirmation mot de passe (uniquement pour S'inscrire)
            if (selectedTab == 0) {
                Spacer(modifier = Modifier.height(14.dp))
                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = {
                        confirmPassword = it
                        errorMessage = null
                    },
                    label = { Text("Confirmer le mot de passe") },
                    leadingIcon = {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = colors.champagne)
                    },
                    visualTransformation = if (isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    singleLine = true,
                    enabled = !isLoading,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(onDone = { handleRegister() }),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("register_confirm_password_input"),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.champagne,
                        unfocusedBorderColor = colors.surfaceBorder,
                        focusedLabelColor = colors.champagne,
                        unfocusedLabelColor = colors.textSecondary,
                        focusedTextColor = colors.textPrimary,
                        unfocusedTextColor = colors.textPrimary,
                        focusedContainerColor = colors.surface,
                        unfocusedContainerColor = colors.surface
                    )
                )
            } else {
                // Lien mot de passe oublié
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onNavigateToForgotPassword) {
                        Text(
                            text = "Mot de passe oublié ?",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.champagne
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ==============================================================
            // BOUTON PRINCIPAL D'ACTION : "S'INSCRIRE" OU "SE CONNECTER"
            // ==============================================================
            Button(
                onClick = {
                    if (selectedTab == 0) {
                        handleRegister()
                    } else {
                        handleLogin()
                    }
                },
                enabled = !isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag(if (selectedTab == 0) "register_submit_button" else "login_submit_button"),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.champagne,
                    contentColor = if (colors.isDark) colors.background else Color.White,
                    disabledContainerColor = colors.champagne.copy(alpha = 0.5f),
                    disabledContentColor = Color.White.copy(alpha = 0.7f)
                )
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = if (colors.isDark) colors.background else Color.White,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = loadingMessage,
                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold)
                    )
                } else {
                    Text(
                        text = if (selectedTab == 0) "S'inscrire" else "Se connecter",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // ==============================================================
            // BOUTON NATIVE AUTHENTIFICATION GOOGLE
            // ==============================================================
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .clickable(enabled = !isLoading) { handleGoogleSignIn() }
                    .testTag("auth_google_button"),
                shape = RoundedCornerShape(12.dp),
                color = colors.surfaceElevated,
                border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder)
            ) {
                Row(
                    modifier = Modifier.fillMaxSize(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    androidx.compose.foundation.Image(
                        painter = androidx.compose.ui.res.painterResource(id = com.example.R.drawable.ic_google),
                        contentDescription = "Logo Google",
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = if (selectedTab == 0) "S'inscrire avec Google" else "Continuer avec Google",
                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = colors.textPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Switcher texte alternatif
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    text = if (selectedTab == 0) "Vous avez déjà un compte ?" else "Pas encore de compte ?",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.textSecondary
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = if (selectedTab == 0) "Se connecter" else "Créer un compte",
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold),
                    color = colors.champagne,
                    modifier = Modifier
                        .clickable {
                            selectedTab = if (selectedTab == 0) 1 else 0
                            errorMessage = null
                        }
                        .padding(4.dp)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))
            HorizontalDivider(color = colors.surfaceBorder, thickness = 1.dp)
            Spacer(modifier = Modifier.height(16.dp))

            // Mode invité direct
            OutlinedButton(
                onClick = onContinueAsGuest,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp)
                    .testTag("auth_guest_btn"),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, colors.surfaceBorder)
            ) {
                Text(
                    text = "Continuer en mode invité (Découvrir le fil)",
                    color = colors.textSecondary,
                    fontSize = 13.sp
                )
            }

            // Espacement bas généreux pour défilement complet avec clavier virtuel
            Spacer(modifier = Modifier.height(120.dp))
        }
    }
}
