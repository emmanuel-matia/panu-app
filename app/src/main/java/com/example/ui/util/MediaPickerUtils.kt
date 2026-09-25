package com.example.ui.util

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.core.content.FileProvider
import java.io.File

object MediaPickerUtils {
    fun createTempFileUri(context: Context, prefix: String, extension: String): Uri {
        val tempFile = File.createTempFile(prefix, extension, context.cacheDir).apply {
            createNewFile()
        }
        return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", tempFile)
    }

    fun getFileName(context: Context, uri: Uri): String? {
        return try {
            context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameIndex != -1 && cursor.moveToFirst()) {
                    cursor.getString(nameIndex)
                } else null
            }
        } catch (_: Exception) {
            null
        }
    }
}
