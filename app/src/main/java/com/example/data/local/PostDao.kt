package com.example.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.model.Post
import kotlinx.coroutines.flow.Flow

@Dao
interface PostDao {
    @Query("SELECT * FROM posts ORDER BY createdAt DESC")
    fun getAllPosts(): Flow<List<Post>>

    @Query("SELECT * FROM posts WHERE status = 'published' AND visibility = 'public' ORDER BY createdAt DESC")
    fun getPublishedPosts(): Flow<List<Post>>

    @Query("SELECT * FROM posts WHERE authorId = :authorId ORDER BY createdAt DESC")
    fun getPostsByAuthor(authorId: String): Flow<List<Post>>

    @Query("SELECT * FROM posts WHERE authorId = :authorId AND status = 'published' AND visibility = 'public' ORDER BY createdAt DESC")
    fun getPublishedPostsByAuthor(authorId: String): Flow<List<Post>>

    @Query("SELECT * FROM posts WHERE id = :id LIMIT 1")
    suspend fun getPostById(id: String): Post?

    @Query("SELECT COUNT(*) FROM posts")
    fun getTotalPostCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM posts WHERE status = 'published'")
    fun getPublishedPostCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPost(post: Post)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPosts(posts: List<Post>)

    @Update
    suspend fun updatePost(post: Post)

    @Delete
    suspend fun deletePost(post: Post)

    @Query("DELETE FROM posts WHERE id = :id")
    suspend fun deletePostById(id: String)
}
