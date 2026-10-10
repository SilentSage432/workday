package com.teamlab.orient.wear

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.wear.contract.ExpressionClaimResult
import com.teamlab.orient.wear.contract.PulseOccurrenceId
import org.junit.Test
import java.util.concurrent.atomic.AtomicInteger

class WearPulsePerceptionPipelineTest {
    private val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!
    private val payload = id.value.toByteArray(Charsets.UTF_8)

    private fun availableAuthority() =
        WearPulseNotificationAuthority.Snapshot(
            permissionGranted = true,
            notificationsEnabled = true,
        )

    private fun unavailablePermission() =
        WearPulseNotificationAuthority.Snapshot(
            permissionGranted = false,
            notificationsEnabled = true,
        )

    private fun notificationsDisabled() =
        WearPulseNotificationAuthority.Snapshot(
            permissionGranted = true,
            notificationsEnabled = false,
        )

    @Test
    fun correctPathValidUuidNewClaimExpressesOnce() {
        val posts = AtomicInteger(0)
        var claimed = false
        val pipeline =
            WearPulsePerceptionPipeline(
                notificationAuthority = { availableAuthority() },
                tryClaim = {
                    if (claimed) return@WearPulsePerceptionPipeline ExpressionClaimResult.AlreadyClaimed
                    claimed = true
                    ExpressionClaimResult.Claimed
                },
                express = { posts.incrementAndGet() },
            )
        assertThat(pipeline.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Expressed)
        assertThat(posts.get()).isEqualTo(1)
    }

    @Test
    fun duplicateOccurrenceDoesNotNotifyAgain() {
        val posts = AtomicInteger(0)
        val claimed = mutableSetOf<String>()
        val pipeline =
            WearPulsePerceptionPipeline(
                notificationAuthority = { availableAuthority() },
                tryClaim = { occ ->
                    if (!claimed.add(occ.value)) ExpressionClaimResult.AlreadyClaimed
                    else ExpressionClaimResult.Claimed
                },
                express = { posts.incrementAndGet() },
            )
        assertThat(pipeline.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Expressed)
        assertThat(pipeline.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Duplicate)
        assertThat(posts.get()).isEqualTo(1)
    }

    @Test
    fun permissionDeniedDoesNotClaimOrNotify() {
        val posts = AtomicInteger(0)
        val claims = AtomicInteger(0)
        val pipeline =
            WearPulsePerceptionPipeline(
                notificationAuthority = { unavailablePermission() },
                tryClaim = {
                    claims.incrementAndGet()
                    ExpressionClaimResult.Claimed
                },
                express = { posts.incrementAndGet() },
            )
        assertThat(pipeline.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Unavailable)
        assertThat(claims.get()).isEqualTo(0)
        assertThat(posts.get()).isEqualTo(0)
    }

    @Test
    fun notificationsDisabledDoesNotClaimOrNotify() {
        val posts = AtomicInteger(0)
        val claims = AtomicInteger(0)
        val pipeline =
            WearPulsePerceptionPipeline(
                notificationAuthority = { notificationsDisabled() },
                tryClaim = {
                    claims.incrementAndGet()
                    ExpressionClaimResult.Claimed
                },
                express = { posts.incrementAndGet() },
            )
        assertThat(pipeline.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Unavailable)
        assertThat(claims.get()).isEqualTo(0)
        assertThat(posts.get()).isEqualTo(0)
    }

    @Test
    fun claimOccursBeforeNotificationPost() {
        val order = mutableListOf<String>()
        val pipeline =
            WearPulsePerceptionPipeline(
                notificationAuthority = {
                    order += "authority"
                    availableAuthority()
                },
                tryClaim = {
                    order += "claim"
                    ExpressionClaimResult.Claimed
                },
                express = { order += "express" },
            )
        pipeline.onMessage(WearPulseMessage.PATH, payload)
        assertThat(order).containsExactly("authority", "claim", "express").inOrder()
    }

    @Test
    fun postFailureAfterClaimDoesNotRetryOrEscalate() {
        val claims = AtomicInteger(0)
        val pipeline =
            WearPulsePerceptionPipeline(
                notificationAuthority = { availableAuthority() },
                tryClaim = {
                    claims.incrementAndGet()
                    ExpressionClaimResult.Claimed
                },
                express = { error("post failed") },
            )
        assertThat(pipeline.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.PostFailed)
        assertThat(claims.get()).isEqualTo(1)
    }

    @Test
    fun malformedUuidRemainsSilent() {
        val posts = AtomicInteger(0)
        val pipeline =
            WearPulsePerceptionPipeline(
                notificationAuthority = { availableAuthority() },
                tryClaim = { ExpressionClaimResult.Claimed },
                express = { posts.incrementAndGet() },
            )
        assertThat(pipeline.onMessage(WearPulseMessage.PATH, "nope".toByteArray()))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Malformed)
        assertThat(posts.get()).isEqualTo(0)
    }

    @Test
    fun wrongPathRemainsSilent() {
        val posts = AtomicInteger(0)
        val pipeline =
            WearPulsePerceptionPipeline(
                notificationAuthority = { availableAuthority() },
                tryClaim = { ExpressionClaimResult.Claimed },
                express = { posts.incrementAndGet() },
            )
        assertThat(pipeline.onMessage("/other", payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.WrongPath)
        assertThat(posts.get()).isEqualTo(0)
    }

    @Test
    fun localDedupeSemanticsSurviveStoreReopen() {
        val durable = mutableSetOf<String>()
        fun store(): (PulseOccurrenceId) -> ExpressionClaimResult =
            { occ ->
                if (!durable.add(occ.value)) ExpressionClaimResult.AlreadyClaimed
                else ExpressionClaimResult.Claimed
            }
        val posts = AtomicInteger(0)
        val first =
            WearPulsePerceptionPipeline(
                notificationAuthority = { availableAuthority() },
                tryClaim = store(),
                express = { posts.incrementAndGet() },
            )
        assertThat(first.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Expressed)
        val afterReopen =
            WearPulsePerceptionPipeline(
                notificationAuthority = { availableAuthority() },
                tryClaim = store(),
                express = { posts.incrementAndGet() },
            )
        assertThat(afterReopen.onMessage(WearPulseMessage.PATH, payload))
            .isEqualTo(WearPulsePerceptionPipeline.Outcome.Duplicate)
        assertThat(posts.get()).isEqualTo(1)
    }
}
