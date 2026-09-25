package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.data.model.AiCredit
import com.example.data.model.AiCreditTransaction
import com.example.data.model.AiGeneration
import com.example.data.model.Post
import com.example.data.model.SocialLinks
import com.example.data.model.UserProfile

@Database(
    entities = [
        UserProfile::class,
        SocialLinks::class,
        Post::class,
        AiCredit::class,
        AiCreditTransaction::class,
        AiGeneration::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun profileDao(): ProfileDao
    abstract fun postDao(): PostDao
    abstract fun socialLinksDao(): SocialLinksDao
    abstract fun creditDao(): CreditDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "panu_app.db"
                ).fallbackToDestructiveMigration(true).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
