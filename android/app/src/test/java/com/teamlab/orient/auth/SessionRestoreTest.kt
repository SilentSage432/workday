package com.teamlab.orient.auth

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.contract.ExpressionClaimResult
import com.teamlab.orient.contract.OccurrenceRereadResult
import com.teamlab.orient.contract.PulseOccurrenceId
import com.teamlab.orient.contract.PulseRelationship
import com.teamlab.orient.pulse.PerceptionTrace
import com.teamlab.orient.pulse.PulsePerceptionPipeline
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test

class SessionRestoreTest {
    private val lines = mutableListOf<String>()

    @Before
    fun silenceDefaultLogSink() {
        PerceptionTrace.sink = PerceptionTrace.Sink { }
    }

    @After
    fun resetSink() {
        PerceptionTrace.sink = PerceptionTrace.Sink { }
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

            assertThat(gateway.loadCount).isEqualTo(0)
            assertThat(gateway.awaitCount).isEqualTo(0)
            assertThat(gateway.refreshCount).isEqualTo(0)
            assertThat(captured).contains("stage=session event=status_class class=Authenticated")
            assertThat(captured.none { it.contains("restoration_requested") }).isTrue()
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

            assertThat(gateway.loadCount).isEqualTo(0)
            assertThat(gateway.awaitCount).isEqualTo(0)
            assertThat(gateway.refreshCount).isEqualTo(0)
            assertThat(captured.none { it.contains("refresh_attempted") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun initializingWithDurableSession_noInitInFlight_loadsThenRefreshes() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = {
                gateway.statusClass = "Authenticated"
                gateway.authenticated = true
                true
            }

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.loadCount).isEqualTo(1)
            assertThat(gateway.awaitCount).isEqualTo(0)
            assertThat(gateway.refreshCount).isEqualTo(1)
            assertThat(captured).contains("stage=session event=restoration_requested")
            assertThat(captured).contains("stage=session event=load_from_storage_started")
            assertThat(captured)
                .contains("stage=session event=load_from_storage_converged found=yes")
            assertThat(captured)
                .contains("stage=session event=initialization_resolved class=Authenticated")
            assertThat(captured).contains("stage=session event=refresh_attempted")
            assertThat(captured.none { it.contains("initialization_wait_entered") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun initializing_terminalAuthenticatedAfterWaitBegins_converges() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = {
                // Durable session present; refresh still in flight (cold-style).
                true
            }
            gateway.onAwait = {
                gateway.statusClass = "Authenticated"
                gateway.authenticated = true
            }

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.loadCount).isEqualTo(1)
            assertThat(gateway.awaitCount).isEqualTo(1)
            assertThat(gateway.refreshCount).isEqualTo(1)
            assertThat(captured).contains("stage=session event=initialization_wait_entered")
            assertThat(captured)
                .contains("stage=session event=initialization_resolved class=Authenticated")
            assertNoSecrets(captured)
        }

    @Test
    fun initializing_authenticatedCurrentBeforeAwait_skipsWaitUsesCurrentValue() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = {
                // StateFlow already terminal before await would collect.
                gateway.statusClass = "Authenticated"
                gateway.authenticated = true
                true
            }

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.awaitCount).isEqualTo(0)
            assertThat(gateway.refreshCount).isEqualTo(1)
            assertThat(captured.none { it.contains("initialization_wait_entered") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun warmBackgroundLifecycleShaped_forcedInitializing_restoresWithoutForeground() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "Authenticated",
                    authenticated = true,
                    notAuthenticated = false,
                )
            // Prior foreground Authenticated — early path.
            SessionRestore.ensureLoaded(gateway)
            assertThat(gateway.loadCount).isEqualTo(0)

            // auth-kt ProcessLifecycleOwner.onStop shape: forced Initializing,
            // no onStart / no in-flight restore.
            gateway.statusClass = "Initializing"
            gateway.authenticated = false
            gateway.onLoad = {
                gateway.statusClass = "Authenticated"
                gateway.authenticated = true
                true
            }

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.loadCount).isEqualTo(1)
            assertThat(gateway.awaitCount).isEqualTo(0)
            assertThat(gateway.refreshCount).isEqualTo(1)
            assertThat(captured).contains("stage=session event=restoration_requested")
            assertThat(captured)
                .contains("stage=session event=load_from_storage_converged found=yes")
            assertNoSecrets(captured)
        }

    @Test
    fun coldStyle_loadFindsSession_awaitCompletesAuthenticated() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = { true }
            gateway.onAwait = {
                gateway.statusClass = "Authenticated"
                gateway.authenticated = true
            }

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.loadCount).isEqualTo(1)
            assertThat(gateway.awaitCount).isEqualTo(1)
            assertThat(gateway.refreshCount).isEqualTo(1)
            assertThat(captured).contains("stage=session event=refresh_result ok=yes")
            assertNoSecrets(captured)
        }

    @Test
    fun missingDurableSession_failClosedWithoutAwaitOrRefresh() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = { false }

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.loadCount).isEqualTo(1)
            assertThat(gateway.awaitCount).isEqualTo(0)
            assertThat(gateway.refreshCount).isEqualTo(0)
            assertThat(gateway.isAuthenticated()).isFalse()
            assertThat(captured)
                .contains("stage=session event=load_from_storage_converged found=no")
            assertThat(captured.none { it.contains("initialization_wait_entered") }).isTrue()
            assertThat(captured.none { it.contains("refresh_attempted") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun invalidExpiredRestore_notAuthenticated_noRefresh() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = { true }
            gateway.onAwait = {
                gateway.statusClass = "NotAuthenticated"
                gateway.notAuthenticated = true
            }

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.refreshCount).isEqualTo(0)
            assertThat(captured)
                .contains("stage=session event=initialization_resolved class=NotAuthenticated")
            assertThat(captured.none { it.contains("refresh_attempted") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun hungRestoration_boundedTimeout_failsClosedWithoutRefresh() =
        runTest {
            val captured = installCapture()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = { true }
            gateway.onAwait = {
                delay(SessionRestore.INITIALIZATION_TIMEOUT_MS + 1_000)
            }

            SessionRestore.ensureLoaded(gateway)

            assertThat(gateway.loadCount).isEqualTo(1)
            assertThat(gateway.awaitCount).isEqualTo(1)
            assertThat(gateway.refreshCount).isEqualTo(0)
            assertThat(captured).contains("stage=session event=initialization_timed_out")
            assertThat(captured.none { it.contains("refresh_attempted") }).isTrue()
            assertThat(captured.none { it.contains("initialization_resolved") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun concurrentEnsure_singleAuthoritativeLoad() =
        runTest {
            val captured = installCapture()
            val started = CompletableDeferred<Unit>()
            val release = CompletableDeferred<Unit>()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = {
                started.complete(Unit)
                release.await()
                gateway.statusClass = "Authenticated"
                gateway.authenticated = true
                true
            }

            val first = async { SessionRestore.ensureLoaded(gateway) }
            started.await()
            val second = async { SessionRestore.ensureLoaded(gateway) }
            // Second caller must not start a parallel load while first holds mutex.
            delay(50)
            assertThat(gateway.loadCount).isEqualTo(1)
            release.complete(Unit)
            awaitAll(first, second)

            assertThat(gateway.loadCount).isEqualTo(1)
            assertThat(gateway.refreshCount).isEqualTo(1)
            assertThat(
                captured.count { it.contains("load_from_storage_started") },
            ).isEqualTo(1)
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
            gateway.onLoad = { true }
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

    @Test
    fun refreshOccursOnlyAfterAuthenticated() =
        runTest {
            val order = mutableListOf<String>()
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = {
                order += "load"
                true
            }
            gateway.onAwait = {
                order += "await"
                gateway.statusClass = "Authenticated"
                gateway.authenticated = true
            }
            gateway.onRefresh = {
                order += "refresh"
                check(gateway.authenticated)
            }

            SessionRestore.ensureLoaded(gateway)

            assertThat(order).containsExactly("load", "await", "refresh").inOrder()
            assertThat(gateway.refreshCount).isEqualTo(1)
        }

    @Test
    fun afterRestoredSession_relativeBeforePipelineCanReread() =
        runTest {
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = {
                gateway.statusClass = "Authenticated"
                gateway.authenticated = true
                true
            }
            SessionRestore.ensureLoaded(gateway)
            assertThat(gateway.isAuthenticated()).isTrue()

            var rereadCalls = 0
            var claimed = 0
            var expressed = 0
            val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { gateway.isAuthenticated() },
                    reread = {
                        rereadCalls += 1
                        OccurrenceRereadResult.Visible(
                            id,
                            PulseRelationship.RELATIVE_BEFORE,
                            "2026-10-10T21:00:00+00:00",
                        )
                    },
                    tryClaim = {
                        claimed += 1
                        ExpressionClaimResult.Claimed
                    },
                    express = { _, _ -> expressed += 1 },
                )
            assertThat(pipeline.run(id, 0))
                .isEqualTo(PulsePerceptionPipeline.Outcome.Expressed)
            assertThat(rereadCalls).isEqualTo(1)
            assertThat(claimed).isEqualTo(1)
            assertThat(expressed).isEqualTo(1)
        }

    @Test
    fun afterRestoredSession_arrivalPipelineRereadsThenSuppressesWithoutExpression() =
        runTest {
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = {
                gateway.statusClass = "Authenticated"
                gateway.authenticated = true
                true
            }
            SessionRestore.ensureLoaded(gateway)

            var rereadCalls = 0
            var claimed = 0
            val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440001")!!
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { gateway.isAuthenticated() },
                    reread = {
                        rereadCalls += 1
                        OccurrenceRereadResult.Visible(
                            id,
                            PulseRelationship.ARRIVAL,
                            "2026-10-10T21:00:00+00:00",
                        )
                    },
                    tryClaim = {
                        claimed += 1
                        ExpressionClaimResult.Claimed
                    },
                    express = { _, _ -> error("ARRIVAL must not express") },
                )
            assertThat(pipeline.run(id, 0))
                .isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(rereadCalls).isEqualTo(1)
            assertThat(claimed).isEqualTo(1)
        }

    @Test
    fun noClaimBeforeAuthoritativeReread_whenSessionMissing() =
        runTest {
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = { false }
            SessionRestore.ensureLoaded(gateway)

            var rereadCalls = 0
            var claimed = 0
            val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440002")!!
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { gateway.isAuthenticated() },
                    reread = {
                        rereadCalls += 1
                        OccurrenceRereadResult.Visible(
                            id,
                            PulseRelationship.RELATIVE_BEFORE,
                            "2026-10-10T21:00:00+00:00",
                        )
                    },
                    tryClaim = {
                        claimed += 1
                        ExpressionClaimResult.Claimed
                    },
                    express = { _, _ -> error("must not express") },
                )
            assertThat(pipeline.run(id, 0))
                .isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(rereadCalls).isEqualTo(0)
            assertThat(claimed).isEqualTo(0)
        }

    @Test
    fun noExpressionWhenSessionAuthorityCannotBeEstablished_timeout() =
        runTest {
            val gateway =
                FakeGateway(
                    statusClass = "Initializing",
                    authenticated = false,
                    notAuthenticated = false,
                )
            gateway.onLoad = { true }
            gateway.onAwait = {
                delay(SessionRestore.INITIALIZATION_TIMEOUT_MS + 1_000)
            }
            SessionRestore.ensureLoaded(gateway)

            var expressed = 0
            val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440003")!!
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { gateway.isAuthenticated() },
                    reread = {
                        OccurrenceRereadResult.Visible(
                            id,
                            PulseRelationship.RELATIVE_BEFORE,
                            "2026-10-10T21:00:00+00:00",
                        )
                    },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, _ -> expressed += 1 },
                )
            assertThat(pipeline.run(id, 0))
                .isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(expressed).isEqualTo(0)
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
        var loadCount = 0
        var awaitCount = 0
        var refreshCount = 0
        var onLoad: suspend () -> Boolean = { false }
        var onAwait: suspend () -> Unit = {}
        var onRefresh: suspend () -> Unit = {}

        private val loadGate = Mutex()

        override fun currentStatusClass(): String = statusClass

        override fun isAuthenticated(): Boolean = authenticated

        override fun isNotAuthenticated(): Boolean = notAuthenticated

        override suspend fun loadFromStorage(): Boolean {
            loadGate.withLock {
                loadCount += 1
                return onLoad()
            }
        }

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
