package com.teamlab.orient.push

import com.teamlab.orient.auth.OrientSupabase
import com.teamlab.orient.contract.TokenReconcilePolicy
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Owner-scoped registration against public.orient_device_push_tokens under RLS.
 * No service_role. No device-management UI.
 */
class DeviceTokenRegistrar(
    private val supabase: OrientSupabase,
    private val tokenStore: FcmTokenStore,
) {
    @Serializable
    private data class TokenRow(
        @SerialName("user_id") val userId: String,
        @SerialName("fcm_token") val fcmToken: String,
        val platform: String = PLATFORM_ANDROID,
    )

    @Serializable
    private data class ExistingToken(
        @SerialName("user_id") val userId: String,
        @SerialName("fcm_token") val fcmToken: String,
    )

    /**
     * @return true when registration/refresh succeeded under the authenticated user.
     */
    suspend fun reconcile(): Boolean {
        val userId = supabase.currentUserId() ?: return false
        val token = TokenReconcilePolicy.normalizeToken(tokenStore.read()) ?: return false
        if (!TokenReconcilePolicy.shouldRegister(true, token)) return false

        val existing =
            runCatching {
                supabase.client
                    .from(TABLE)
                    .select(Columns.list("user_id", "fcm_token")) {
                        filter {
                            eq("fcm_token", token)
                        }
                    }
                    .decodeList<ExistingToken>()
                    .firstOrNull()
            }.getOrNull()

        return when {
            existing == null -> insert(userId, token)
            existing.userId == userId -> refreshOwn(userId, token)
            else -> false // foreign owner — fail closed
        }
    }

    /**
     * Best-effort delete of the current device token before session destruction.
     * Failure must not broaden authority.
     */
    suspend fun deleteCurrentTokenBestEffort() {
        val userId = supabase.currentUserId() ?: return
        val token = TokenReconcilePolicy.normalizeToken(tokenStore.read()) ?: return
        runCatching {
            supabase.client
                .from(TABLE)
                .delete {
                    filter {
                        eq("user_id", userId)
                        eq("fcm_token", token)
                        eq("platform", PLATFORM_ANDROID)
                    }
                }
        }
    }

    private suspend fun insert(userId: String, token: String): Boolean {
        return runCatching {
            supabase.client
                .from(TABLE)
                .insert(TokenRow(userId = userId, fcmToken = token))
            true
        }.getOrDefault(false)
    }

    private suspend fun refreshOwn(userId: String, token: String): Boolean {
        // Touch row so DB trigger refreshes updated_at. Client does not author updated_at.
        return runCatching {
            supabase.client
                .from(TABLE)
                .update(TokenRow(userId = userId, fcmToken = token)) {
                    filter {
                        eq("user_id", userId)
                        eq("fcm_token", token)
                    }
                }
            true
        }.getOrDefault(false)
    }

    companion object {
        const val TABLE = "orient_device_push_tokens"
        const val PLATFORM_ANDROID = "android"
    }
}
