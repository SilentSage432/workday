package com.teamlab.orient.contract

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class PerceptionAuthorityTest {
    private val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!

    @Test
    fun noSessionMeansSilence() {
        val decision =
            PerceptionAuthority.decide(
                hasSession = false,
                reread = OccurrenceRereadResult.Visible(id),
            )
        assertThat(decision).isEqualTo(PerceptionDecision.SilenceNoSession)
    }

    @Test
    fun missingOccurrenceMeansSilence() {
        val decision =
            PerceptionAuthority.decide(
                hasSession = true,
                reread = OccurrenceRereadResult.NotVisible,
            )
        assertThat(decision).isEqualTo(PerceptionDecision.SilenceOccurrenceNotVisible)
    }

    @Test
    fun transientFailureRequestsRetryWithinBounds() {
        val decision =
            PerceptionAuthority.decide(
                hasSession = true,
                reread = OccurrenceRereadResult.TransientFailure,
            )
        assertThat(decision).isEqualTo(PerceptionDecision.RetryTransientFailure)
        assertThat(PerceptionAuthority.shouldRetryTransient(0)).isTrue()
        assertThat(PerceptionAuthority.shouldRetryTransient(4)).isTrue()
        assertThat(PerceptionAuthority.shouldRetryTransient(5)).isFalse()
    }

    @Test
    fun visibleOccurrenceOpensExpressionPath() {
        val decision =
            PerceptionAuthority.decide(
                hasSession = true,
                reread = OccurrenceRereadResult.Visible(id),
            )
        assertThat(decision).isEqualTo(PerceptionDecision.Express(id))
    }
}
