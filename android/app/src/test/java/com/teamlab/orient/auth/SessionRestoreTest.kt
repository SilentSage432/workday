package com.teamlab.orient.auth

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.pulse.PerceptionTrace
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Test

class SessionRestoreTest {
    private val lines = mutableListOf<String>()

    @After
    fun resetSink() {
        PerceptionTrace.sink = PerceptionTrace.Sink { }
    }

    @Test
    fun initializingToAuthenticated_awaitsThenRefreshes() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onAwait = {
                gateway.statusClass = "Authenticated"
                gateway.authenticated = true
            }

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.awaitCount).isEqualTo(1)
            assertThat(gateway.refreshCount).isEqualTo(1)
            assertThat(captured).contains("stage=session event=initialization_wait_entered")
            assertThat(captured)
                .contains("stage=session event=initialization_resolved class=Authenticated")
            assertThat(captured).contains("stage=session event=refresh_attempted")
            assertThat(captured).contains("stage=session event=refresh_result ok=yes")
            assertNoSecrets(captured)
        }

    @Test
    fun initializingToNotAuthenticated_awaitsWithoutRefresh() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onAwait = {
                gateway.statusClass = "NotAuthenticated"
                gateway.notAuthenticated = true
            }

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.awaitCount).isEqualTo(1)
            assertThat(gateway.refreshCount).isEqualTo(0)
            assertThat(captured).contains("stage=session event=initialization_wait_entered")
            assertThat(captured)
                .contains("stage=session event=initialization_resolved class=NotAuthenticated")
            assertThat(captured.none { it.contains("refresh_attempted") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun initializingTimeout_failsClosedWithoutRefresh() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onAwait = {
                delay(SessionRestore.INITIALIZATION_TIMEOUT_MS + 1_000)
            }

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.awaitCount).isEqualTo(1)
            assertThat(gateway.refreshCount).isEqualTo(0)
            assertThat(captured).contains("stage=session event=initialization_wait_entered")
            assertThat(captured).contains("stage=session event=initialization_timed_out")
            assertThat(captured.none { it.contains("refresh_attempted") }).isTrue()
            assertThat(captured.none { it.contains("initialization_resolved") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun alreadyAuthenticated_preservesEarlyReturnWithoutRefresh() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "Authenticated",
                    authenticated = true,
                    notAuthenticated = false,
                )

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.awaitCount).isEqualTo(0)
            assertThat(gateway.refreshCount).isEqualTo(0)
            assertThat(captured).contains("stage=session event=status_class class=Authenticated")
            assertThat(captured.none { it.contains("initialization_wait_entered") }).isTrue()
            assertThat(captured.none { it.contains("refresh_attempted") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun alreadyNotAuthenticated_noRefresh() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "NotAuthenticated",
                    authenticated = false,
                    notAuthenticated = true,
                )

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.awaitCount).isEqualTo(0)
            assertThat(gateway.refreshCount).isEqualTo(0)
            assertThat(captured.none { it.contains("refresh_attempted") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun refreshNeverInvokedWhileStatusRemainsInitializing() =
        runTest {
            val captured = installCapture()
            val stillInitializing = CompletableDeferred<Unit>()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onAwait = {
                stillInitializing.await()
            }
            gateway.onRefresh = {
                error("refreshCurrentSession must not run while Initializing")
            }

            SessionRestore.ensureLoaded(gateway)
            stillInitializing.complete(Unit)

            assertThat(gateway.refreshCount).isEqualTo(0)
            assertThat(gateway.statusClass).isEqualTo("Initializing")
            assertThat(captured).contains("stage=session event=initialization_timed_out")
            assertNoSecrets(captured)
        }

    private fun installCapture(): List<String> {
        lines.clear()
        PerceptionTrace.sink = PerceptionTrace.Sink { line -> lines += line }
        return lines
    }

    private fun assertNoSecrets(captured: List<String>) {
        val joined = captured.joinToString("\n")
        assertThat(joined.lowercase()).doesNotContain("bearer")
        assertThat(joined.lowercase()).doesNotContain("refresh_token")
        assertThat(joined.lowercase()).doesNotContain("access_token")
        assertThat(joined.lowercase()).doesNotContain("password")
    }

    private class FakeGateway(
        var statusClass: String,
        var authenticated: Boolean,
        var notAuthenticated: Boolean,
    ) : SessionRestore.Gateway {
        var awaitCount = 0
        var refreshCount = 0
        var onAwait: suspend () -> Unit = {}
        var onRefresh: suspend () -> Unit = {}

        override fun currentStatusClass(): String = statusClass

        override fun isAuthenticated(): Boolean = authenticated

        override fun isNotAuthenticated(): Boolean = notAuthenticated

        override suspend fun awaitInitialization() {
            awaitCount += 1
            onAwait()
        }

        override suspend fun refreshCurrentSession() {
            refreshCount += 1
            check(authenticated) {
                "refreshCurrentSession reached without Authenticated status"
            }
            check(statusClass != "Initializing") {
                "refreshCurrentSession reached while Initializing"
            }
            onRefresh()
        }
    }
}
