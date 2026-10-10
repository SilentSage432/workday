package com.teamlab.orient.contract

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class PulseRelationshipTest {
    @Test
    fun relativeBeforeParsesSuccessfully() {
        assertThat(PulseRelationship.parse("relative_before"))
            .isEqualTo(PulseRelationship.RELATIVE_BEFORE)
    }

    @Test
    fun arrivalParsesSuccessfully() {
        assertThat(PulseRelationship.parse("arrival"))
            .isEqualTo(PulseRelationship.ARRIVAL)
    }

    @Test
    fun unknownRelationshipFailsClosed() {
        assertThat(PulseRelationship.parse("approach")).isNull()
        assertThat(PulseRelationship.parse("")).isNull()
        assertThat(PulseRelationship.parse("RELATIVE_BEFORE")).isNull()
        assertThat(PulseRelationship.parse("Relative_Before")).isNull()
    }

    @Test
    fun relativeBeforePronunciationAvailable() {
        assertThat(
            PulsePronunciationGate.isPronunciationAvailable(PulseRelationship.RELATIVE_BEFORE),
        ).isTrue()
    }

    @Test
    fun arrivalPronunciationUnavailable() {
        assertThat(
            PulsePronunciationGate.isPronunciationAvailable(PulseRelationship.ARRIVAL),
        ).isFalse()
    }

    @Test
    fun unknownNeverMapsToRelativeBefore() {
        assertThat(PulseRelationship.parse("relative-before")).isNull()
        assertThat(PulseRelationship.parse("before")).isNull()
    }
}
