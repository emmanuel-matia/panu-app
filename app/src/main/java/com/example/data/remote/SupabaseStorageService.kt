package com.example.data.remote

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.util.UUID

class SupabaseStorageService(
    private val client: SupabaseClient,
    private val context: Context
) {
    private val httpClient = OkHttpClient()

    suspend fun uploadAvatar(userId: String, imageUri: Uri): Result<String> = withContext(Dispatchers.IO) {
        try {
            val compressedBytes = compressImage(imageUri, maxDimension = 800, quality = 80)
                ?: return@withContext Result.failure(Exception("Impossible de lire l'image sélectionnée"))

            // Max avatar size 5MB
            if (compressedBytes.size > 5 * 1024 * 1024) {
                return@withContext Result.failure(Exception("La taille de l'avatar dépasse la limite autorisée (5 Mo)"))
            }

            val filename = "${userId}/avatar_${System.currentTimeMillis()}.jpg"
            val bucket = "avatars"
            val uploadUrl = "${client.currentUrl}/storage/v1/object/$bucket/$filename"

            val body = compressedBytes.toRequestBody("image/jpeg".toMediaType())
            val request = Request.Builder()
                .url(uploadUrl)
                .addHeader("apikey", client.currentAnonKey)
                .addHeader("Authorization", "Bearer ${client.currentAnonKey}")
                .addHeader("x-upsert", "true")
                .post(body)
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                // Public URL
                val publicUrl = "${client.currentUrl}/storage/v1/object/public/$bucket/$filename"
                Result.success(publicUrl)
            } else {
                val errorMsg = response.body?.string() ?: "Erreur HTTP ${response.code}"
                Result.failure(Exception("Échec de l'envoi de la photo : $errorMsg"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Erreur lors de l'upload : ${e.localizedMessage}"))
        }
    }

    suspend fun uploadPostMedia(userId: String, mediaUri: Uri, isVideo: Boolean): Result<Pair<String, String>> =
        withContext(Dispatchers.IO) {
            val detectedType = if (isVideo) "video" else null
            val res = uploadMediaFile(userId, mediaUri, detectedType)
            if (res.isSuccess) {
                val (url, type, _) = res.getOrThrow()
                Result.success(Pair(url, type))
            } else {
                Result.failure(res.exceptionOrNull() ?: Exception("Erreur d'envoi"))
            }
        }

    suspend fun uploadMediaFile(
        userId: String,
        uri: Uri,
        forcedType: String? = null
    ): Result<Triple<String, String, Long>> = withContext(Dispatchers.IO) {
        try {
            val resolver = context.contentResolver
            val detectedMime = forcedType?.let {
                if (it == "video") "video/mp4" else if (it == "audio") "audio/mpeg" else "image/jpeg"
            } ?: resolver.getType(uri) ?: "application/octet-stream"

            val isAudio = detectedMime.startsWith("audio/") || forcedType == "audio"
            val isVideo = detectedMime.startsWith("video/") || forcedType == "video"
            val isImage = detectedMime.startsWith("image/") || (!isAudio && !isVideo)

            val mediaType = when {
                isVideo -> "video"
                isAudio -> "audio"
                else -> "image"
            }

            val maxBytes = when {
                isVideo -> 60 * 1024 * 1024L
                isAudio -> 25 * 1024 * 1024L
                else -> 15 * 1024 * 1024L
            }

            val bytes: ByteArray = if (isImage) {
                compressImage(uri, maxDimension = 1920, quality = 85)
                    ?: resolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: return@withContext Result.failure(Exception("Fichier image illisible"))
            } else {
                resolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: return@withContext Result.failure(Exception("Fichier média illisible"))
            }

            if (bytes.size > maxBytes) {
                val limitMb = maxBytes / (1024 * 1024)
                return@withContext Result.failure(Exception("Le fichier dépasse la limite autorisée ($limitMb Mo)"))
            }

            val ext = when {
                isVideo -> if (detectedMime.contains("quicktime") || detectedMime.contains("mov")) "mov" else "mp4"
                isAudio -> if (detectedMime.contains("wav")) "wav" else if (detectedMime.contains("aac") || detectedMime.contains("m4a")) "m4a" else "mp3"
                else -> if (detectedMime.contains("png")) "png" else if (detectedMime.contains("webp")) "webp" else "jpg"
            }

            val filename = "${userId}/${UUID.randomUUID()}.$ext"
            val bucket = "post-media"
            val uploadUrl = "${client.currentUrl}/storage/v1/object/$bucket/$filename"

            val body = bytes.toRequestBody(detectedMime.toMediaType())
            val request = Request.Builder()
                .url(uploadUrl)
                .addHeader("apikey", client.currentAnonKey)
                .addHeader("Authorization", "Bearer ${client.currentAnonKey}")
                .post(body)
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                val publicUrl = "${client.currentUrl}/storage/v1/object/public/$bucket/$filename"
                Result.success(Triple(publicUrl, mediaType, bytes.size.toLong()))
            } else {
                val errorMsg = response.body?.string() ?: "Erreur HTTP ${response.code}"
                Result.failure(Exception("Échec de l'envoi Supabase Storage : $errorMsg"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Erreur de transfert : ${e.localizedMessage}"))
        }
    }

    suspend fun uploadMultipleMedia(
        userId: String,
        uris: List<Uri>
    ): Result<List<Triple<String, String, Long>>> = withContext(Dispatchers.IO) {
        val results = mutableListOf<Triple<String, String, Long>>()
        for (uri in uris) {
            val res = uploadMediaFile(userId, uri)
            if (res.isSuccess) {
                results.add(res.getOrThrow())
            } else {
                return@withContext Result.failure(res.exceptionOrNull() ?: Exception("Erreur upload multiple"))
            }
        }
        Result.success(results)
    }

    suspend fun uploadBytes(
        userId: String,
        bytes: ByteArray,
        mimeType: String,
        extension: String,
        bucket: String = "generated-media"
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val filename = "${userId}/${UUID.randomUUID()}.$extension"
            val uploadUrl = "${client.currentUrl}/storage/v1/object/$bucket/$filename"

            val body = bytes.toRequestBody(mimeType.toMediaType())
            val request = Request.Builder()
                .url(uploadUrl)
                .addHeader("apikey", client.currentAnonKey)
                .addHeader("Authorization", "Bearer ${client.currentAnonKey}")
                .post(body)
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                val publicUrl = "${client.currentUrl}/storage/v1/object/public/$bucket/$filename"
                Result.success(publicUrl)
            } else {
                val errorMsg = response.body?.string() ?: "Erreur HTTP ${response.code}"
                Result.failure(Exception("Échec upload Supabase Storage ($bucket) : $errorMsg"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Erreur upload fichier : ${e.localizedMessage}"))
        }
    }

    suspend fun deleteStorageFile(publicUrl: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            // Extract bucket and path from publicUrl:
            // e.g. https://.../storage/v1/object/public/post-media/userId/uuid.jpg
            val marker = "/storage/v1/object/public/"
            if (!publicUrl.contains(marker)) return@withContext Result.success(Unit)
            val sub = publicUrl.substringAfter(marker)
            val bucket = sub.substringBefore("/")
            val path = sub.substringAfter("/")

            val deleteUrl = "${client.currentUrl}/storage/v1/object/$bucket/$path"
            val request = Request.Builder()
                .url(deleteUrl)
                .addHeader("apikey", client.currentAnonKey)
                .addHeader("Authorization", "Bearer ${client.currentAnonKey}")
                .delete()
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful || response.code == 404) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Impossible de supprimer le fichier distant (${response.code})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun compressImage(uri: Uri, maxDimension: Int, quality: Int): ByteArray? {
        return try {
            val input = context.contentResolver.openInputStream(uri) ?: return null
            val bitmap = BitmapFactory.decodeStream(input)
            input.close()

            val width = bitmap.width
            val height = bitmap.height
            val scale = if (width > maxDimension || height > maxDimension) {
                val ratio = width.toFloat() / height.toFloat()
                if (ratio > 1) {
                    val targetW = maxDimension
                    val targetH = (maxDimension / ratio).toInt()
                    Bitmap.createScaledBitmap(bitmap, targetW, targetH, true)
                } else {
                    val targetH = maxDimension
                    val targetW = (maxDimension * ratio).toInt()
                    Bitmap.createScaledBitmap(bitmap, targetW, targetH, true)
                }
            } else {
                bitmap
            }

            val baos = ByteArrayOutputStream()
            scale.compress(Bitmap.CompressFormat.JPEG, quality, baos)
            baos.toByteArray()
        } catch (e: Exception) {
            null
        }
    }
}
