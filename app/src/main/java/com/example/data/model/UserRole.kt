package com.example.data.model

enum class UserRole(val value: String, val label: String) {
    USER("user", "Utilisateur"),
    CREATOR("creator", "Créateur"),
    BUSINESS("business", "Entreprise"),
    FOUNDER("founder", "Fondateur"),
    ADMIN("admin", "Administrateur");

    companion object {
        fun fromString(value: String?): UserRole {
            return entries.find { it.value.equals(value, ignoreCase = true) } ?: USER
        }
    }
}
