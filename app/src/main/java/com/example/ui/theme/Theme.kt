package com.example.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

object PanuTheme {
    val colors: PanuColors
        @Composable
        @ReadOnlyComposable
        get() = LocalPanuColors.current
}

private val PanuDarkColorScheme = darkColorScheme(
    primary = PanuDarkChampagne,
    onPrimary = PanuDarkBackground,
    primaryContainer = PanuDarkChampagneSubtle,
    onPrimaryContainer = PanuDarkChampagneLight,
    secondary = PanuDarkChampagne,
    onSecondary = PanuDarkBackground,
    secondaryContainer = PanuDarkSurfaceElevated,
    onSecondaryContainer = PanuDarkTextPrimary,
    tertiary = PanuEmeraldLight,
    onTertiary = PanuDarkBackground,
    background = PanuDarkBackground,
    onBackground = PanuDarkTextPrimary,
    surface = PanuDarkSurface,
    onSurface = PanuDarkTextPrimary,
    surfaceVariant = PanuDarkSurfaceElevated,
    onSurfaceVariant = PanuDarkTextSecondary,
    outline = PanuDarkSurfaceBorder,
    error = PanuErrorDark
)

private val PanuLightColorScheme = lightColorScheme(
    primary = PanuLightChampagne,
    onPrimary = Color.White,
    primaryContainer = PanuLightChampagneSubtle,
    onPrimaryContainer = PanuLightChampagneDark,
    secondary = PanuLightChampagne,
    onSecondary = Color.White,
    secondaryContainer = PanuLightSurfaceElevated,
    onSecondaryContainer = PanuLightTextPrimary,
    tertiary = PanuEmerald,
    onTertiary = Color.White,
    background = PanuLightBackground,
    onBackground = PanuLightTextPrimary,
    surface = PanuLightSurface,
    onSurface = PanuLightTextPrimary,
    surfaceVariant = PanuLightSurfaceElevated,
    onSurfaceVariant = PanuLightTextSecondary,
    outline = PanuLightSurfaceBorder,
    error = PanuError
)

@Composable
fun PanuTheme(
    darkTheme: Boolean = false, // Mode clair par défaut pour les nouveaux utilisateurs
    content: @Composable () -> Unit
) {
    val panuColors = if (darkTheme) PanuDarkPalette else PanuLightPalette
    val colorScheme = if (darkTheme) PanuDarkColorScheme else PanuLightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                window.statusBarColor = colorScheme.background.toArgb()
                window.navigationBarColor = colorScheme.background.toArgb()
                val insetsController = WindowCompat.getInsetsController(window, view)
                insetsController.isAppearanceLightStatusBars = !darkTheme
                insetsController.isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    CompositionLocalProvider(LocalPanuColors provides panuColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}
