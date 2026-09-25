package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.model.SocialLinks
import kotlinx.coroutines.flow.Flow

@Dao
interface SocialLinksDao {
    @Query("SELECT * FROM social_links WHERE userId = :userId LIMIT 1")
    fun getSocialLinks(userId: String): Flow<SocialLinks?>

    @Query("SELECT * FROM social_links WHERE userId = :userId LIMIT 1")
    suspend fun getSocialLinksDirect(userId: String): SocialLinks?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSocialLinks(links: SocialLinks)

    @Update
    suspend fun updateSocialLinks(links: SocialLinks)

    @Query("DELETE FROM social_links WHERE userId = :userId")
    suspend fun deleteSocialLinks(userId: String)
}
