package com.teamlab.orient.wear

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.contract.ExpressionClaimResult
import com.teamlab.orient.contract.OccurrenceRereadResult
import com.teamlab.orient.contract.PulseOccurrenceId
import com.teamlab.orient.pulse.PulsePerceptionPipeline
import kotlinx.coroutines.test.runTest
import org.junit.Test
import java.util.concurrent.atomic.AtomicInteger

class WearPulseForwardPolicyTest {
    private val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!

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
    fun pipelineDoesNotReachExpressBeforeAuthoritativeSuccess() =
        runTest {
            val wearForwards = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.NotVisible },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = {
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
                    reread = { OccurrenceRereadResult.Visible(id) },
                    tryClaim = { ExpressionClaimResult.AlreadyClaimed },
                    express = {
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
    fun claimedRunMayForwardWithoutAlteringExpressedOutcome() =
        runTest {
            val wearForwards = AtomicInteger(0)
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.Visible(id) },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = {
                        // Mirrors worker: phone express then best-effort wear forward.
                        assertThat(WearPulseForwardPolicy.mayForwardAfterPhoneClaim(ExpressionClaimResult.Claimed))
                            .isTrue()
                        wearForwards.incrementAndGet()
                        // Simulated disconnected/no-node: forward is a no-op success for phone.
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
                    reread = { OccurrenceRereadResult.Visible(id) },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { wearForwards.incrementAndGet() },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(wearForwards.get()).isEqualTo(0)
        }
}
