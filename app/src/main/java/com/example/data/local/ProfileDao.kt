package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.model.UserProfile
import kotlinx.coroutines.flow.Flow

@Dao
interface ProfileDao {
    @Query("SELECT * FROM profiles WHERE id = :id LIMIT 1")
    fun getProfileById(id: String): Flow<UserProfile?>

    @Query("SELECT * FROM profiles WHERE id = :id LIMIT 1")
    suspend fun getProfileByIdSync(id: String): UserProfile?

    @Query("SELECT * FROM profiles WHERE username = :username LIMIT 1")
    suspend fun getProfileByUsername(username: String): UserProfile?

    @Query("SELECT * FROM profiles ORDER BY createdAt DESC")
    fun getAllProfiles(): Flow<List<UserProfile>>

    @Query("SELECT COUNT(*) FROM profiles")
    fun getProfileCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProfile(profile: UserProfile)

    @Update
    suspend fun updateProfile(profile: UserProfile)

    @Query("DELETE FROM profiles WHERE id = :id")
    suspend fun deleteProfile(id: String)
}
