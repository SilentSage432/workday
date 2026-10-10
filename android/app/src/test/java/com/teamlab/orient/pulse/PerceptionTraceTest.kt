package com.teamlab.orient.pulse

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.contract.ExpressionClaimResult
import com.teamlab.orient.contract.OccurrenceRereadResult
import com.teamlab.orient.contract.PerceptionDecision
import com.teamlab.orient.contract.PulseOccurrenceId
import com.teamlab.orient.contract.PulseRelationship
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Test

class PerceptionTraceTest {
    private val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!
    private val sourceStart = "2026-10-10T21:00:00+00:00"
    private val lines = mutableListOf<String>()

    private fun visibleRelativeBefore() =
        OccurrenceRereadResult.Visible(
            id,
            PulseRelationship.RELATIVE_BEFORE,
            sourceStart,
        )

    @After
    fun resetSink() {
        PerceptionTrace.sink = PerceptionTrace.Sink { }
    }

    @Test
    fun mapsNoSessionToSilentNoSession() =
        runTest {
            val captured = installCaptureSink()
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { false },
                    reread = { visibleRelativeBefore() },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, _ -> error("must not express") },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(captured.any { it.contains("decision=silent_no_session") }).isTrue()
            assertThat(captured.any { it.contains("occ=${id.value}") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun mapsInvisibleOccurrenceToSilentOccurrenceNotVisible() =
        runTest {
            val captured = installCaptureSink()
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.NotVisible },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, _ -> error("must not express") },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(captured.any { it.contains("decision=silent_occurrence_not_visible") })
                .isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun mapsTransientRereadFailureToRetryTransient() =
        runTest {
            val captured = installCaptureSink()
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { OccurrenceRereadResult.TransientFailure },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, _ -> error("must not express") },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Retry)
            assertThat(captured.any { it.contains("decision=retry_transient") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun mapsFirstClaimToExpressed() =
        runTest {
            val captured = installCaptureSink()
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { visibleRelativeBefore() },
                    tryClaim = { ExpressionClaimResult.Claimed },
                    express = { _, _ -> },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Expressed)
            assertThat(captured.any { it.contains("decision=expressed") }).isTrue()
            assertThat(captured.any { it.contains("result=claimed") }).isTrue()
            assertThat(captured.any { it.contains("event=available") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun mapsArrivalToTerminalSilenceWithoutExpression() =
        runTest {
            val captured = installCaptureSink()
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
                    express = { _, _ -> error("must not express") },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(captured.any { it.contains("decision=silent_arrival_no_pronunciation") })
                .isTrue()
            assertThat(captured.any { it.contains("event=unavailable") }).isTrue()
            assertThat(captured.any { it.contains("event=terminal_silence") }).isTrue()
            assertThat(captured.none { it.contains("event=notification_attempted") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun mapsDuplicateClaimToSilentAlreadyClaimed() =
        runTest {
            val captured = installCaptureSink()
            val pipeline =
                PulsePerceptionPipeline(
                    hasSession = { true },
                    reread = { visibleRelativeBefore() },
                    tryClaim = { ExpressionClaimResult.AlreadyClaimed },
                    express = { _, _ -> error("must not express") },
                )
            assertThat(pipeline.run(id, 0)).isEqualTo(PulsePerceptionPipeline.Outcome.Silent)
            assertThat(captured.any { it.contains("decision=silent_already_claimed") }).isTrue()
            assertThat(captured.any { it.contains("result=already_claimed") }).isTrue()
            assertNoSecrets(captured)
        }

    @Test
    fun formatDecisionPureMappingMatchesRequiredOutcomes() {
        assertThat(
            PerceptionTrace.formatDecision(
                PerceptionDecision.SilenceNoSession,
                PulsePerceptionPipeline.Outcome.Silent,
            ),
        ).isEqualTo("silent_no_session")
        assertThat(
            PerceptionTrace.formatDecision(
                PerceptionDecision.SilenceOccurrenceNotVisible,
                PulsePerceptionPipeline.Outcome.Silent,
            ),
        ).isEqualTo("silent_occurrence_not_visible")
        assertThat(
            PerceptionTrace.formatDecision(
                PerceptionDecision.RetryTransientFailure,
                PulsePerceptionPipeline.Outcome.Retry,
            ),
        ).isEqualTo("retry_transient")
        assertThat(
            PerceptionTrace.formatDecision(
                PerceptionDecision.Express(
                    id,
                    PulseRelationship.RELATIVE_BEFORE,
                    sourceStart,
                ),
                PulsePerceptionPipeline.Outcome.Expressed,
            ),
        ).isEqualTo("expressed")
        assertThat(
            PerceptionTrace.formatDecision(
                PerceptionDecision.Express(
                    id,
                    PulseRelationship.RELATIVE_BEFORE,
                    sourceStart,
                ),
                PulsePerceptionPipeline.Outcome.Silent,
            ),
        ).isEqualTo("silent_already_claimed")
        assertThat(
            PerceptionTrace.formatDecision(
                PerceptionDecision.SuppressWithoutPronunciation(
                    id,
                    PulseRelationship.ARRIVAL,
                    sourceStart,
                ),
                PulsePerceptionPipeline.Outcome.Silent,
            ),
        ).isEqualTo("silent_arrival_no_pronunciation")
        assertThat(
            PerceptionTrace.formatDecision(
                PerceptionDecision.SuppressUnrecognizedRelationship(id),
                PulsePerceptionPipeline.Outcome.Silent,
            ),
        ).isEqualTo("silent_unrecognized_relationship")
    }

    @Test
    fun safeErrorFieldsOmitMessagesAndTokenLikeMaterial() {
        val error =
            object : Exception("Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig password=secret fcm=abc") {}
        val fields = PerceptionTrace.safeErrorFields(error)
        assertThat(fields).contains("class=")
        assertThat(fields).doesNotContain("Bearer")
        assertThat(fields).doesNotContain("eyJ")
        assertThat(fields).doesNotContain("password")
        assertThat(fields).doesNotContain("fcm=")
        assertThat(fields).doesNotContain("secret")
    }

    @Test
    fun rereadVisibilityFormatter() {
        assertThat(PerceptionTrace.formatRereadVisibility(visibleRelativeBefore()))
            .isEqualTo("yes")
        assertThat(PerceptionTrace.formatRereadVisibility(OccurrenceRereadResult.NotVisible))
            .isEqualTo("no")
        assertThat(
            PerceptionTrace.formatRereadVisibility(OccurrenceRereadResult.TransientFailure),
        ).isEqualTo("transient_failure")
        assertThat(
            PerceptionTrace.formatRereadVisibility(
                OccurrenceRereadResult.VisibleUnrecognizedRelationship(id),
            ),
        ).isEqualTo("unrecognized_relationship")
    }

    private fun installCaptureSink(): List<String> {
        lines.clear()
        PerceptionTrace.sink = PerceptionTrace.Sink { line -> lines.add(line) }
        return lines
    }

    private fun assertNoSecrets(captured: List<String>) {
        val joined = captured.joinToString("\n")
        assertThat(joined).doesNotContain("Bearer ")
        assertThat(joined).doesNotContain("eyJ")
        assertThat(joined).doesNotContain("password")
        assertThat(joined).doesNotContain("refresh_token")
        assertThat(joined).doesNotContain("access_token")
    }
}
