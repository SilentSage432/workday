package com.teamlab.orient.wear

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.contract.ExpressionClaimResult
import com.teamlab.orient.contract.OccurrenceRereadResult
import com.teamlab.orient.contract.PulseOccurrenceId
import com.teamlab.orient.contract.PulseRelationship
import com.teamlab.orient.pulse.PulsePerceptionPipeline
import kotlinx.coroutines.test.runTest
import org.junit.Test
import java.util.concurrent.atomic.AtomicInteger

class WearPulseForwardPolicyTest {
    private val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!
    private val sourceStart = "2026-10-10T21:00:00+00:00"

    private fun visibleRelativeBefore() =
        OccurrenceRereadResult.Visible(
            id,
            PulseRelationship.RELATIVE_BEFORE,
            sourceStart,
        )

    @Test
    fun mayForwardOnlyWhenPhoneClaimed() {
        assertThat(
            WearPulseForwardPolicy.mayForwardAfterPhoneClaim(ExpressionClaimResult.Claimed),
        ).isTrue()
        assertThat(
            WearPulseForwardPolicy.mayForwardAfterPhoneClaim(ExpressionClaimResult.AlreadyClaimed),
        ).isFalse()
    }

    @Test
    fun mayForwardRequiresPronunciationAvailableRelationship() {
        assertThat(
            WearPulseForwardPolicy.mayForward(
                ExpressionClaimResult.Claimed,
                PulseRelationship.RELATIVE_BEFORE,
            ),
        ).isTrue()
        assertThat(
            WearPulseForwardPolicy.mayForward(
                ExpressionClaimResult.Claimed,
                PulseRelationship.ARRIVAL,
            ),
        ).isFalse()
    }

    @Test
    fun arrivalPipelineNeverReachesExpressOrWearForward() =
        runTest {
            val wearForwards = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = {
                        OccurrenceRereadResult.Visible(
                            id,
                            PulseRelationship.ARRIVAL,
                            sourceStart,
                        )
                    },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, _ -> wearForwards.incrementAndGet() },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(wearForwards.get()).isEqualTo(0)
            assertThat(
                WearPulseForwardPolicy.mayForward(
                    ExpressionClaimResult.Claimed,
                    PulseRelationship.ARRIVAL,
                ),
            ).isFalse()
        }

    @Test
    fun pipelineDoesNotReachExpressBeforeAuthoritativeSuccess() =
        runTest {
            val wearForwards = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.NotVisible },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, _ ->
                        if (WearPulseForwardPolicy.mayForwardAfterPhoneClaim(ExpressionClaimResult.Claimed)) {
                            wearForwards.incrementAndGet()
                        }
                    },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(wearForwards.get()).isEqualTo(0)
        }

    @Test
    fun alreadyClaimedDoesNotForward() =
        runTest {
            val wearForwards = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { visibleRelativeBefore() },
                    tryClaim = { ExpressionClaimResult.AlreadyClaimed },
                    express = { _, _ ->
                        wearForwards.incrementAndGet()
                        error("express must not run when already claimed")
                    },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(wearForwards.get()).isEqualTo(0)
            assertThat(
                WearPulseForwardPolicy.mayForwardAfterPhoneClaim(ExpressionClaimResult.AlreadyClaimed),
            ).isFalse()
        }

    @Test
    fun claimedRelativeBeforeMayForwardWithoutAlteringExpressedOutcome() =
        runTest {
            val wearForwards = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { visibleRelativeBefore() },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, relationship ->
                        assertThat(
                            WearPulseForwardPolicy.mayForward(
                                ExpressionClaimResult.Claimed,
                                relationship,
                            ),
                        ).isTrue()
                        wearForwards.incrementAndGet()
                    },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Expressed)
            assertThat(wearForwards.get()).isEqualTo(1)
        }

    @Test
    fun noSessionNeverForwards() =
        runTest {
            val wearForwards = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { false },
                    reread = { visibleRelativeBefore() },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, _ -> wearForwards.incrementAndGet() },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(wearForwards.get()).isEqualTo(0)
        }
}
