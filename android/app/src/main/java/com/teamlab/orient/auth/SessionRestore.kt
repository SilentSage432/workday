package com.teamlab.orient.auth

import com.teamlab.orient.pulse.PerceptionTrace
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Worker-time session establishment ordering against auth-kt.
 *
 * Durable session material remains in Auth session storage
 * (`SettingsSessionManager` / EncryptedSharedPreferences). Auth auto-load and
 * ProcessLifecycleOwner onStart may restore it, but background WorkManager can
 * observe Initializing after lifecycle onStop with **no** restoration in
 * flight. This type initiates durable restore when needed, awaits terminal
 * status, then refreshes only from Authenticated — never while Initializing.
 *
 * Concurrent [ensureLoaded] callers share one process-wide restore mutex so
 * multiple consumers converge on one authoritative restoration result.
 */
internal object SessionRestore {
    const val INITIALIZATION_TIMEOUT_MS = 8_000L

    /**
     * Bounds the single-flight restore critical section: explicit
     * [Gateway.loadFromStorage] plus any subsequent await of an in-flight
     * terminal transition (for example storage-backed refresh).
     */
    private val restoreMutex = Mutex()

    internal interface Gateway {
        fun currentStatusClass(): String

        fun isAuthenticated(): Boolean

        fun isNotAuthenticated(): Boolean

        /**
         * Restores durable session material into the shared Auth client.
         * @return true if storage held a session document; false if absent.
         */
        suspend fun loadFromStorage(): Boolean

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

        PerceptionTrace.sessionRestorationRequested()
        // true = this caller performed restore under the mutex (may refresh).
        // false = peer already converged while waiting (early-return semantics).
        val performedRestore =
            withTimeoutOrNull(INITIALIZATION_TIMEOUT_MS) {
                restoreMutex.withLock {
                    if (gateway.isAuthenticated() || gateway.isNotAuthenticated()) {
                        false
                    } else {
                        establishWhileInitializing(gateway)
                        true
                    }
                }
            }
        if (performedRestore == null) {
            PerceptionTrace.initializationTimedOut()
            return
        }
        if (!performedRestore) {
            // Peer established terminal authority; do not refresh again.
            return
        }

        PerceptionTrace.initializationResolved(gateway.currentStatusClass())

        if (!gateway.isAuthenticated()) {
            // NotAuthenticated, RefreshFailure, still Initializing after
            // absent storage, or any non-Authenticated terminal.
            return
        }

        PerceptionTrace.refreshAttempted()
        val refresh = runCatching { gateway.refreshCurrentSession() }
        PerceptionTrace.refreshResult(refresh.isSuccess, refresh.exceptionOrNull())
    }

    /**
     * Must run under [restoreMutex]. Caller has already observed non-terminal
     * status before acquiring the lock; re-check after acquire for convergence.
     */
    private suspend fun establishWhileInitializing(gateway: Gateway) {
        if (gateway.isAuthenticated() || gateway.isNotAuthenticated()) {
            return
        }

        PerceptionTrace.loadFromStorageStarted()
        val loadResult = runCatching { gateway.loadFromStorage() }
        val found = loadResult.getOrNull()
        PerceptionTrace.loadFromStorageConverged(found, loadResult.exceptionOrNull())

        if (gateway.isAuthenticated() || gateway.isNotAuthenticated()) {
            return
        }

        if (found == false) {
            // No durable session. Do not wait for ProcessLifecycleOwner.onStart
            // (initDone) — that may never run while backgrounded.
            return
        }

        // Session document present (refresh may still be in flight), or load
        // threw while Auth init/lifecycle restore may still complete.
        PerceptionTrace.initializationWaitEntered()
        gateway.awaitInitialization()
    }
}
