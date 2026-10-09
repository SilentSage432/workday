package com.teamlab.orient.auth

import android.content.Context
import com.teamlab.orient.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.SettingsSessionManager
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Normal Orient user auth only — publishable key + user JWT.
 * Never service_role, dispatch secret, or Firebase Admin.
 */
class OrientSupabase private constructor(
    val client: SupabaseClient,
) {
    val auth: Auth get() = client.auth

    suspend fun signIn(email: String, password: String) {
        auth.signInWith(Email) {
            this.email = email.trim()
            this.password = password
        }
    }

    suspend fun signOut() {
        auth.signOut()
    }

    suspend fun hasAuthenticatedSession(): Boolean {
        ensureSessionLoaded()
        return currentUserId() != null
    }

    suspend fun currentUserId(): String? {
        ensureSessionLoaded()
        return auth.currentUserOrNull()?.id
    }

    suspend fun ensureSessionLoaded() {
        when (auth.sessionStatus.value) {
            is SessionStatus.Authenticated,
            is SessionStatus.NotAuthenticated,
            -> return
            else -> {
                withTimeoutOrNull(8_000) {
                    auth.sessionStatus.first {
                        it is SessionStatus.Authenticated || it is SessionStatus.NotAuthenticated
                    }
                }
            }
        }
        // Refresh when a persisted session may be stale.
        runCatching { auth.refreshCurrentSession() }
    }

    companion object {
        @Volatile
        private var instance: OrientSupabase? = null

        fun get(context: Context): OrientSupabase {
            return instance ?: synchronized(this) {
                instance ?: create(context.applicationContext).also { instance = it }
            }
        }

        fun createForTests(client: SupabaseClient): OrientSupabase = OrientSupabase(client)

        private fun create(context: Context): OrientSupabase {
            val url = BuildConfig.SUPABASE_URL.trim()
            val key = BuildConfig.SUPABASE_PUBLISHABLE_KEY.trim()
            require(url.isNotEmpty()) { "ORIENT_SUPABASE_URL missing from local.properties" }
            require(key.isNotEmpty()) {
                "ORIENT_SUPABASE_PUBLISHABLE_KEY missing from local.properties"
            }

            val settings = EncryptedSettingsFactory.create(context)
            val client =
                createSupabaseClient(supabaseUrl = url, supabaseKey = key) {
                    install(Auth) {
                        sessionManager = SettingsSessionManager(settings)
                        autoLoadFromStorage = true
                        autoSaveToStorage = true
                        alwaysAutoRefresh = true
                    }
                    install(Postgrest)
                }
            return OrientSupabase(client)
        }
    }
}
