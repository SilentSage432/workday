package com.teamlab.orient.wear

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.wear.contract.PulseOccurrenceId
import org.junit.Test

class WearPulseMessageTest {
    @Test
    fun pathAndCapabilityMatchPhoneContract() {
        assertThat(WearPulseMessage.PATH).isEqualTo("/orient/pulse/express")
        assertThat(WearPulseMessage.CAPABILITY).isEqualTo("orient_pulse_perception")
    }

    @Test
    fun decodeCanonicalUuid() {
        val id = PulseOccurrenceId.parse("550E8400-E29B-41D4-A716-446655440000")!!
        assertThat(WearPulseMessage.decode(id.value.toByteArray())).isEqualTo(
            PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000"),
        )
    }
}
