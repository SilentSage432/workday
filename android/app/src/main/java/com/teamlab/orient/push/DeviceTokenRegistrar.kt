package com.teamlab.orient.push

import android.util.Log
import com.teamlab.orient.auth.OrientSupabase
import com.teamlab.orient.contract.TokenReconcilePolicy
import io.github.jan.supabase.exceptions.RestException
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Owner-scoped registration against public.orient_device_push_tokens under RLS.
 * No service_role. No device-management UI.
 */
class DeviceTokenRegistrar(
    private val supabase: OrientSupabase,
    private val tokenStore: FcmTokenStore,
) {
    /**
     * Request body for authenticated insert/update.
     * [platform] is required (no Kotlin default) so PostgREST JSON with
     * encodeDefaults=false still emits platform=android on the wire.
     */
    @Serializable
    internal data class TokenRow(
        @SerialName("user_id") val userId: String,
        @SerialName("fcm_token") val fcmToken: String,
        val platform: String,
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
            }.getOrElse { error ->
                logSafeFailure("select", error)
                return false
            }

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
        }.onFailure { error ->
            logSafeFailure("delete", error)
        }
    }

    private suspend fun insert(userId: String, token: String): Boolean {
        return runCatching {
            supabase.client
                .from(TABLE)
                .insert(androidTokenRow(userId, token))
            true
        }.getOrElse { error ->
            logSafeFailure("insert", error)
            false
        }
    }

    private suspend fun refreshOwn(userId: String, token: String): Boolean {
        // Touch row so DB trigger refreshes updated_at. Client does not author updated_at.
        return runCatching {
            supabase.client
                .from(TABLE)
                .update(androidTokenRow(userId, token)) {
                    filter {
                        eq("user_id", userId)
                        eq("fcm_token", token)
                    }
                }
            true
        }.getOrElse { error ->
            logSafeFailure("update", error)
            false
        }
    }

    companion object {
        const val TABLE = "orient_device_push_tokens"
        const val PLATFORM_ANDROID = "android"

        private const val LOG_TAG = "OrientDeviceToken"

        /**
         * Same encodeDefaults=false policy used by supabase-kt PostgREST serialization.
         * Tests must use this (or equivalent) — never assert only in-memory property values.
         */
        internal val postgrestWireJson: Json =
            Json {
                encodeDefaults = false
                ignoreUnknownKeys = true
            }

        internal fun androidTokenRow(userId: String, fcmToken: String): TokenRow =
            TokenRow(
                userId = userId,
                fcmToken = fcmToken,
                platform = PLATFORM_ANDROID,
            )

        /** Production-equivalent wire body for insert/update. */
        internal fun encodeWriteBody(userId: String, fcmToken: String): String =
            postgrestWireJson.encodeToString(TokenRow.serializer(), androidTokenRow(userId, fcmToken))

        /**
         * Safe diagnostic line: operation + exception class + optional HTTP status.
         * Never includes tokens, JWTs, passwords, credentials, or request bodies.
         */
        internal fun safeFailureSummary(operation: String, error: Throwable): String {
            val cls = error::class.simpleName ?: "Throwable"
            val status = safeHttpStatus(error)
            return buildString {
                append("device_token_")
                append(operation)
                append(" failed class=")
                append(cls)
                if (status != null) {
                    append(" status=")
                    append(status)
                }
            }
        }

        private fun safeHttpStatus(error: Throwable): Int? {
            var current: Throwable? = error
            while (current != null) {
                val rest = current as? RestException
                if (rest != null) return rest.statusCode
                current = current.cause
            }
            return null
        }

        private fun logSafeFailure(operation: String, error: Throwable) {
            Log.w(LOG_TAG, safeFailureSummary(operation, error))
        }
    }
}
