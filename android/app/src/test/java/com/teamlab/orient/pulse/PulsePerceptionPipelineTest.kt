package com.teamlab.orient.pulse

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.contract.ExpressionClaimResult
import com.teamlab.orient.contract.OccurrenceRereadResult
import com.teamlab.orient.contract.PulseOccurrenceId
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.test.runTest
import org.junit.Test
import java.util.concurrent.atomic.AtomicInteger

class PulsePerceptionPipelineTest {
    private val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!

    @Test
    fun noSessionRemainsSilentWithoutReread() =
        runTest {
            var rereadCalls = 0
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { false },
                    reread = {
                        rereadCalls += 1
                        OccurrenceRereadResult.Visible(id)
                    },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { error("must not express") },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(rereadCalls).isEqualTo(0)
        }

    @Test
    fun missingOccurrenceRemainsSilent() =
        runTest {
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.NotVisible },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { error("must not express") },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
        }

    @Test
    fun transientFailureRetriesWhileBounded() =
        runTest {
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.TransientFailure },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { error("must not express") },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Retry)
            assertThat(pipeline.run(id, 5)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
        }

    @Test
    fun successfulRereadAndClaimExpressesOnce() =
        runTest {
            val expressions = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.Visible(id) },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { expressions.incrementAndGet() },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Expressed)
            assertThat(expressions.get()).isEqualTo(1)
        }

    @Test
    fun concurrentDeliveriesYieldExactlyOneExpressionClaim() =
        runTest {
            val mutex = Mutex()
            var claimed = false
            val expressions = AtomicInteger(0)

            suspend fun tryClaim(): ExpressionClaimResult =
                mutex.withLock {
                    if (claimed) return ExpressionClaimResult.AlreadyClaimed
                    claimed = true
                    ExpressionClaimResult.Claimed
                }

            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.Visible(id) },
                    tryClaim = { tryClaim() },
                    express = { expressions.incrementAndGet() },
                )

            val results =
                (1..8)
                    .map {
                        async { pipeline.run(id, 0) }
                    }
                    .awaitAll()

            assertThat(results.count { it == PulsePerceptionPipeline.Outcome.Expressed }).isEqualTo(1)
            assertThat(results.count { it == PulsePerceptionPipeline.Outcome.Silent }).isEqualTo(7)
            assertThat(expressions.get()).isEqualTo(1)
        }

    @Test
    fun duplicateAfterDurableClaimDoesNotExpressAgain() =
        runTest {
            val expressions = AtomicInteger(0)
            var claimState: ExpressionClaimResult = ExpressionClaimResult.Claimed
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.Visible(id) },
                    tryClaim = { claimState },
                    express = { expressions.incrementAndGet() },
                )

            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Expressed)
            claimState = ExpressionClaimResult.AlreadyClaimed
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(expressions.get()).isEqualTo(1)
        }

    @Test
    fun fcmPayloadNeverTreatedAsTruthWithoutReread() =
        runTest {
            // Even with a well-formed occurrence id, visibility must come from reread.
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.NotVisible },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { error("FCM alone must not express") },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
        }
}
