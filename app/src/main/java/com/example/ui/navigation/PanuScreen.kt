package com.example.ui.navigation

sealed class PanuScreen(val route: String) {
    data object Home : PanuScreen("home")
    data object Studio : PanuScreen("studio")
    data object Create : PanuScreen("create")
    data object Activity : PanuScreen("activity") // Alias for backwards compatibility
    data object Creations : PanuScreen("creations")
    data object Profile : PanuScreen("profile")
    data object EditProfile : PanuScreen("edit_profile")
    data object PublicProfile : PanuScreen("public_profile/{username}") {
        fun createRoute(username: String): String = "public_profile/${username.removePrefix("@")}"
    }
    data object Founder : PanuScreen("founder?tab={tab}") {
        fun createRoute(tab: String = "dashboard"): String = "founder?tab=$tab"
    }
    data object Settings : PanuScreen("settings")
    data object Login : PanuScreen("login")
    data object Register : PanuScreen("register")
    data object ForgotPassword : PanuScreen("forgot_password")
    data object VodHome : PanuScreen("vod_home")
    data object LiveSports : PanuScreen("live_sports")
    data object VodPlayer : PanuScreen("vod_player/{url}") {
        fun createRoute(url: String): String = "vod_player/${java.net.URLEncoder.encode(url, "UTF-8")}"
    }
}
