package com.teamlab.orient.push

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.fcmTokenDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "orient_fcm_token",
)

/**
 * Latest FCM registration token on this device. Not Pulse authority.
 */
class FcmTokenStore(private val context: Context) {
    private val key = stringPreferencesKey("fcm_token")

    suspend fun save(token: String) {
        val normalized = token.trim()
        if (normalized.isEmpty()) return
        context.fcmTokenDataStore.edit { prefs ->
            prefs[key] = normalized
        }
    }

    suspend fun read(): String? {
        return context.fcmTokenDataStore.data
            .map { it[key] }
            .first()
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
    }

    suspend fun clear() {
        context.fcmTokenDataStore.edit { it.remove(key) }
    }
}
