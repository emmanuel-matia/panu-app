package com.example.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// ==============================================================================
// PALETTE DU THÈME PANU (MODES CLAIR ET SOMBRE)
// ==============================================================================

// --- MODE CLAIR (☀️ Défaut pour les nouveaux utilisateurs) ---
// Fond clair blanc/crème
val PanuLightBackground = Color(0xFFFAF8F5)
// Cartes légèrement contrastées (blanc pur élégant)
val PanuLightSurface = Color(0xFFFFFFFF)
// Cartes surélevées et fonds de champs
val PanuLightSurfaceElevated = Color(0xFFF1ECE3)
// Bordures douces
val PanuLightSurfaceBorder = Color(0xFFE4DFD5)
// Texte noir / anthracite profond
val PanuLightTextPrimary = Color(0xFF191B1F)
// Texte gris doux
val PanuLightTextSecondary = Color(0xFF636672)
val PanuLightTextMuted = Color(0xFF8E919D)
// Couleur d'accent doré / champagne
val PanuLightChampagne = Color(0xFFB58A38)
val PanuLightChampagneLight = Color(0xFFD4AF67)
val PanuLightChampagneDark = Color(0xFF8F6820)
val PanuLightChampagneSubtle = Color(0xFFF7EEDD)

// --- MODE SOMBRE (🌙 Anthracite / Noir doux — JAMAIS de noir pur #000000) ---
// Fond anthracite / noir doux (élégant et agréable pour les yeux)
val PanuDarkBackground = Color(0xFF121418)
// Cartes légèrement plus claires que le fond
val PanuDarkSurface = Color(0xFF181B22)
// Cartes surélevées et fonds de champs
val PanuDarkSurfaceElevated = Color(0xFF222630)
// Bordures subtiles
val PanuDarkSurfaceBorder = Color(0xFF2D323E)
// Texte blanc cassé
val PanuDarkTextPrimary = Color(0xFFF4F2ED)
// Texte gris doux
val PanuDarkTextSecondary = Color(0xFF9E9FA8)
val PanuDarkTextMuted = Color(0xFF656772)
// Couleur d'accent doré / champagne discret
val PanuDarkChampagne = Color(0xFFD4AF67)
val PanuDarkChampagneLight = Color(0xFFE5C88E)
val PanuDarkChampagneDark = Color(0xFFA68542)
val PanuDarkChampagneSubtle = Color(0xFF282318)

// Couleurs d'accent partagées
val PanuEmerald = Color(0xFF237356)
val PanuEmeraldLight = Color(0xFF389270)
val PanuEmeraldSubtleLight = Color(0xFFE8F5F0)
val PanuEmeraldSubtleDark = Color(0xFF183025)
val PanuError = Color(0xFFBA1A1A)
val PanuErrorDark = Color(0xFFC85A6A)

// ==============================================================================
// MODÈLE DE COULEURS DYNAMIQUES PANU
// ==============================================================================

@Immutable
data class PanuColors(
    val background: Color,
    val surface: Color,
    val surfaceElevated: Color,
    val surfaceBorder: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val champagne: Color,
    val champagneLight: Color,
    val champagneDark: Color,
    val champagneSubtle: Color,
    val emerald: Color,
    val emeraldSubtle: Color,
    val error: Color,
    val isDark: Boolean
)

val PanuLightPalette = PanuColors(
    background = PanuLightBackground,
    surface = PanuLightSurface,
    surfaceElevated = PanuLightSurfaceElevated,
    surfaceBorder = PanuLightSurfaceBorder,
    textPrimary = PanuLightTextPrimary,
    textSecondary = PanuLightTextSecondary,
    textMuted = PanuLightTextMuted,
    champagne = PanuLightChampagne,
    champagneLight = PanuLightChampagneLight,
    champagneDark = PanuLightChampagneDark,
    champagneSubtle = PanuLightChampagneSubtle,
    emerald = PanuEmerald,
    emeraldSubtle = PanuEmeraldSubtleLight,
    error = PanuError,
    isDark = false
)

val PanuDarkPalette = PanuColors(
    background = PanuDarkBackground,
    surface = PanuDarkSurface,
    surfaceElevated = PanuDarkSurfaceElevated,
    surfaceBorder = PanuDarkSurfaceBorder,
    textPrimary = PanuDarkTextPrimary,
    textSecondary = PanuDarkTextSecondary,
    textMuted = PanuDarkTextMuted,
    champagne = PanuDarkChampagne,
    champagneLight = PanuDarkChampagneLight,
    champagneDark = PanuDarkChampagneDark,
    champagneSubtle = PanuDarkChampagneSubtle,
    emerald = PanuEmeraldLight,
    emeraldSubtle = PanuEmeraldSubtleDark,
    error = PanuErrorDark,
    isDark = true
)

val LocalPanuColors = staticCompositionLocalOf { PanuLightPalette }

// ==============================================================================
// COMPATIBILITÉ RÉTROACTIVE DYNAMIQUE
// Permet à tous les composants existants d'adopter immédiatement le thème sélectionné
// (Clair, Sombre, Système) sans hardcoder les teintes sombres.
// ==============================================================================
val PanuObsidian: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.background

val PanuSurfaceDark: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.surface

val PanuSurfaceElevated: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.surfaceElevated

val PanuSurfaceBorder: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.surfaceBorder

val PanuTextPrimaryDark: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.textPrimary

val PanuTextSecondaryDark: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.textSecondary

val PanuTextMutedDark: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.textMuted

val PanuChampagne: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.champagne

val PanuChampagneLight: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.champagneLight

val PanuChampagneDark: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.champagneDark

val PanuChampagneSubtle: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.champagneSubtle

val PanuGold: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.champagne

val PanuGoldLight: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.champagneLight

val PanuGoldDark: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.champagneDark

val PanuTerracotta: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.champagne

val PanuTerracottaLight: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.champagneLight

val PanuTerracottaDark: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.champagneDark

val PanuSoftGrey: Color
    @Composable
    @ReadOnlyComposable
    get() = PanuTheme.colors.textSecondary
