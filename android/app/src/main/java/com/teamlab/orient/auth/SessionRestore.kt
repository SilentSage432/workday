package com.teamlab.orient.auth

import com.teamlab.orient.pulse.PerceptionTrace
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Worker-time session establishment ordering against auth-kt.
 *
 * Persisted-session restoration remains owned by Auth autoLoadFromStorage.
 * This type only awaits terminal initialization, then refreshes only from
 * Authenticated — never while Initializing.
 */
internal object SessionRestore {
    const val INITIALIZATION_TIMEOUT_MS = 8_000L

    internal interface Gateway {
        fun currentStatusClass(): String

        fun isAuthenticated(): Boolean

        fun isNotAuthenticated(): Boolean

        suspend fun awaitInitialization()

        suspend fun refreshCurrentSession()
    }

    suspend fun ensureLoaded(gateway: Gateway) {
        PerceptionTrace.sessionRestoreEntered()
        PerceptionTrace.sessionStatusClass(gateway.currentStatusClass())

        // Already terminal: preserve prior early-return (no refresh).
        if (gateway.isAuthenticated() || gateway.isNotAuthenticated()) {
            return
        }

        PerceptionTrace.initializationWaitEntered()
        val initialized =
            withTimeoutOrNull(INITIALIZATION_TIMEOUT_MS) {
                gateway.awaitInitialization()
            }
        if (initialized == null) {
            PerceptionTrace.initializationTimedOut()
            return
        }

        PerceptionTrace.initializationResolved(gateway.currentStatusClass())

        if (!gateway.isAuthenticated()) {
            // NotAuthenticated, RefreshFailure, or any non-Authenticated terminal.
            return
        }

        PerceptionTrace.refreshAttempted()
        val refresh = runCatching { gateway.refreshCurrentSession() }
        PerceptionTrace.refreshResult(refresh.isSuccess, refresh.exceptionOrNull())
    }
}
