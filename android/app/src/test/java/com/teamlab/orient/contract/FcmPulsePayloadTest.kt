package com.teamlab.orient.contract

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class FcmPulsePayloadTest {
    @Test
    fun parsesValidOccurrenceId() {
        val id = "550e8400-e29b-41d4-a716-446655440000"
        val parsed =
            FcmPulsePayload.parseOccurrenceId(
                mapOf(FcmPulsePayload.OCCURRENCE_ID_KEY to id),
            )
        assertThat(parsed?.value).isEqualTo(id)
    }

    @Test
    fun rejectsMissingKey() {
        assertThat(FcmPulsePayload.parseOccurrenceId(emptyMap())).isNull()
    }

    @Test
    fun rejectsMalformedId() {
        assertThat(
            FcmPulsePayload.parseOccurrenceId(
                mapOf(FcmPulsePayload.OCCURRENCE_ID_KEY to "not-a-uuid"),
            ),
        ).isNull()
    }

    @Test
    fun ignoresNonAuthoritativeExtraFields() {
        val id = "550e8400-e29b-41d4-a716-446655440000"
        val parsed =
            FcmPulsePayload.parseOccurrenceId(
                mapOf(
                    FcmPulsePayload.OCCURRENCE_ID_KEY to id,
                    "title" to "URGENT!!!",
                    "body" to "do something now",
                    "urgency" to "critical",
                ),
            )
        assertThat(parsed?.value).isEqualTo(id)
        // Extra fields are not part of the returned authority surface.
        assertThat(parsed).isInstanceOf(PulseOccurrenceId::class.java)
    }
}
