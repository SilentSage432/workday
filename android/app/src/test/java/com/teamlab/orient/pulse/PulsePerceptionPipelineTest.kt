package com.teamlab.orient.pulse

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.contract.ExpressionClaimResult
import com.teamlab.orient.contract.OccurrenceRereadResult
import com.teamlab.orient.contract.PulseOccurrenceId
import com.teamlab.orient.contract.PulseRelationship
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.test.runTest
import org.junit.Test
import java.util.concurrent.atomic.AtomicInteger

class PulsePerceptionPipelineTest {
    private val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!
    private val sourceStart = "2026-10-10T21:00:00+00:00"

    private fun visibleRelativeBefore() =
        OccurrenceRereadResult.Visible(
            id,
            PulseRelationship.RELATIVE_BEFORE,
            sourceStart,
        )

    private fun visibleArrival() =
        OccurrenceRereadResult.Visible(
            id,
            PulseRelationship.ARRIVAL,
            sourceStart,
        )

    @Test
    fun noSessionRemainsSilentWithoutReread() =
        runTest {
            var rereadCalls = 0
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { false },
                    reread = {
                        rereadCalls += 1
                        visibleRelativeBefore()
                    },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, _ -> error("must not express") },
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
                    express = { _, _ -> error("must not express") },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
        }

    @Test
    fun transientFailureRetriesWhileBounded() =
        runTest {
            var claims = 0
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.TransientFailure },
                    tryClaim = {
                        claims += 1
                        ExpressionClaimResult.Claimed
                    },
                    express = { _, _ -> error("must not express") },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Retry)
            assertThat(pipeline.run(id, 5)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(claims).isEqualTo(0)
        }

    @Test
    fun relativeBeforeSuccessfulRereadAndClaimExpressesOnce() =
        runTest {
            val expressions = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { visibleRelativeBefore() },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, relationship ->
                        assertThat(relationship).isEqualTo(PulseRelationship.RELATIVE_BEFORE)
                        expressions.incrementAndGet()
                    },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Expressed)
            assertThat(expressions.get()).isEqualTo(1)
        }

    @Test
    fun arrivalTerminallyConsumesAndDoesNotExpress() =
        runTest {
            val claims = AtomicInteger(0)
            val expressions = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { visibleArrival() },
                    tryClaim = {
                        claims.incrementAndGet()
                        ExpressionClaimResult.Claimed
                    },
                    express = { _, _ -> expressions.incrementAndGet() },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(claims.get()).isEqualTo(1)
            assertThat(expressions.get()).isEqualTo(0)
        }

    @Test
    fun arrivalDoesNotReachExpressWearPath() =
        runTest {
            val wearForwards = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { visibleArrival() },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, _ -> wearForwards.incrementAndGet() },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(wearForwards.get()).isEqualTo(0)
        }

    @Test
    fun unrecognizedRelationshipDoesNotExpress() =
        runTest {
            val claims = AtomicInteger(0)
            val expressions = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.VisibleUnrecognizedRelationship(id) },
                    tryClaim = {
                        claims.incrementAndGet()
                        ExpressionClaimResult.Claimed
                    },
                    express = { _, _ -> expressions.incrementAndGet() },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(claims.get()).isEqualTo(1)
            assertThat(expressions.get()).isEqualTo(0)
        }

    @Test
    fun alreadyClaimedRelativeBeforeRemainsSilent() =
        runTest {
            val expressions = AtomicInteger(0)
            var claimState: ExpressionClaimResult = ExpressionClaimResult.Claimed
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { visibleRelativeBefore() },
                    tryClaim = { claimState },
                    express = { _, _ -> expressions.incrementAndGet() },
                )

            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Expressed)
            claimState = ExpressionClaimResult.AlreadyClaimed
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(expressions.get()).isEqualTo(1)
        }

    @Test
    fun alreadyClaimedArrivalRemainsSilent() =
        runTest {
            val expressions = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { visibleArrival() },
                    tryClaim = { ExpressionClaimResult.AlreadyClaimed },
                    express = { _, _ -> expressions.incrementAndGet() },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(expressions.get()).isEqualTo(0)
        }

    @Test
    fun restartCannotReplayTerminallySuppressedArrival() =
        runTest {
            val expressions = AtomicInteger(0)
            var claimed = false
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { visibleArrival() },
                    tryClaim = {
                        if (claimed) return@PulsePerceptionPipeline ExpressionClaimResult.AlreadyClaimed
                        claimed = true
                        ExpressionClaimResult.Claimed
                    },
                    express = { _, _ -> expressions.incrementAndGet() },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(expressions.get()).isEqualTo(0)
            assertThat(claimed).isTrue()
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
                    reread = { visibleRelativeBefore() },
                    tryClaim = { tryClaim() },
                    express = { _, _ -> expressions.incrementAndGet() },
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
    fun fcmPayloadNeverTreatedAsTruthWithoutReread() =
        runTest {
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.NotVisible },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, _ -> error("FCM alone must not express") },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
        }
}
