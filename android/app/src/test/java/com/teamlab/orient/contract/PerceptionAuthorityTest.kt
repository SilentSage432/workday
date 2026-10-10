package com.teamlab.orient.contract

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class PerceptionAuthorityTest {
    private val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!
    private val sourceStart = "2026-10-10T21:00:00+00:00"

    @Test
    fun noSessionMeansSilence() {
        val decision =
            PerceptionAuthority.decide(
                hasSession = false,
                reread =
                    OccurrenceRereadResult.Visible(
                        id,
                        PulseRelationship.RELATIVE_BEFORE,
                        sourceStart,
                    ),
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
    fun relativeBeforeOpensExpressionPath() {
        val decision =
            PerceptionAuthority.decide(
                hasSession = true,
                reread =
                    OccurrenceRereadResult.Visible(
                        id,
                        PulseRelationship.RELATIVE_BEFORE,
                        sourceStart,
                    ),
            )
        assertThat(decision)
            .isEqualTo(
                PerceptionDecision.Express(
                    occurrenceId = id,
                    relationship = PulseRelationship.RELATIVE_BEFORE,
                    sourceStartAt = sourceStart,
                ),
            )
    }

    @Test
    fun arrivalSuppressesWithoutPronunciation() {
        val decision =
            PerceptionAuthority.decide(
                hasSession = true,
                reread =
                    OccurrenceRereadResult.Visible(
                        id,
                        PulseRelationship.ARRIVAL,
                        sourceStart,
                    ),
            )
        assertThat(decision)
            .isEqualTo(
                PerceptionDecision.SuppressWithoutPronunciation(
                    occurrenceId = id,
                    relationship = PulseRelationship.ARRIVAL,
                    sourceStartAt = sourceStart,
                ),
            )
    }

    @Test
    fun unrecognizedRelationshipSuppressesFailClosed() {
        val decision =
            PerceptionAuthority.decide(
                hasSession = true,
                reread = OccurrenceRereadResult.VisibleUnrecognizedRelationship(id),
            )
        assertThat(decision)
            .isEqualTo(PerceptionDecision.SuppressUnrecognizedRelationship(id))
    }
}
