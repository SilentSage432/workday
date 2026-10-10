package com.teamlab.orient.wear

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.wear.contract.ExpressionClaimResult
import com.teamlab.orient.wear.contract.PulseOccurrenceId
import org.junit.Test
import java.util.concurrent.atomic.AtomicInteger

class WearPulsePerceptionPipelineTest {
    private val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!
    private val payload = id.value.toByteArray(Charsets.UTF_8)

    @Test
    fun correctPathValidUuidNewClaimExpressesOnce() {
        val haptics = AtomicInteger(0)
        var claimed = false
        val pipeline =
            WearPulsePerceptionPipeline(
                tryClaim = {
                    if (claimed) return@WearPulsePerceptionPipeline ExpressionClaimResult.AlreadyClaimed
                    claimed = true
                    ExpressionClaimResult.Claimed
                },
                express = { haptics.incrementAndGet() },
            )
        assertThat(pipeline.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Expressed)
        assertThat(haptics.get()).isEqualTo(1)
    }

    @Test
    fun duplicateOccurrenceDoesNotHapticAgain() {
        val haptics = AtomicInteger(0)
        val claimed = mutableSetOf<String>()
        val pipeline =
            WearPulsePerceptionPipeline(
                tryClaim = { occ ->
                    if (!claimed.add(occ.value)) ExpressionClaimResult.AlreadyClaimed
                    else ExpressionClaimResult.Claimed
                },
                express = { haptics.incrementAndGet() },
            )
        assertThat(pipeline.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Expressed)
        assertThat(pipeline.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Duplicate)
        assertThat(haptics.get()).isEqualTo(1)
    }

    @Test
    fun malformedUuidRemainsSilent() {
        val haptics = AtomicInteger(0)
        val pipeline =
            WearPulsePerceptionPipeline(
                tryClaim = { ExpressionClaimResult.Claimed },
                express = { haptics.incrementAndGet() },
            )
        assertThat(pipeline.onMessage(WearPulseMessage.PATH, "nope".toByteArray()))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Malformed)
        assertThat(haptics.get()).isEqualTo(0)
    }

    @Test
    fun wrongPathRemainsSilent() {
        val haptics = AtomicInteger(0)
        val pipeline =
            WearPulsePerceptionPipeline(
                tryClaim = { ExpressionClaimResult.Claimed },
                express = { haptics.incrementAndGet() },
            )
        assertThat(pipeline.onMessage("/other", payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.WrongPath)
        assertThat(haptics.get()).isEqualTo(0)
    }

    @Test
    fun claimOccursBeforeExpression() {
        val order = mutableListOf<String>()
        val pipeline =
            WearPulsePerceptionPipeline(
                tryClaim = {
                    order += "claim"
                    ExpressionClaimResult.Claimed
                },
                express = { order += "express" },
            )
        pipeline.onMessage(WearPulseMessage.PATH, payload)
        assertThat(order).containsExactly("claim", "express").inOrder()
    }

    @Test
    fun localDedupeSemanticsSurviveStoreReopen() {
        // Mirrors SQLite INSERT OR IGNORE durability across process death.
        val durable = mutableSetOf<String>()
        fun store(): (PulseOccurrenceId) -> ExpressionClaimResult =
            { occ ->
                if (!durable.add(occ.value)) ExpressionClaimResult.AlreadyClaimed
                else ExpressionClaimResult.Claimed
            }
        val haptics = AtomicInteger(0)
        val first =
            WearPulsePerceptionPipeline(
                tryClaim = store(),
                express = { haptics.incrementAndGet() },
            )
        assertThat(first.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Expressed)
        val afterReopen =
            WearPulsePerceptionPipeline(
                tryClaim = store(),
                express = { haptics.incrementAndGet() },
            )
        assertThat(afterReopen.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Duplicate)
        assertThat(haptics.get()).isEqualTo(1)
    }
}
