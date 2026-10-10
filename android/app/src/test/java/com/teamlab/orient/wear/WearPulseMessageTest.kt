package com.teamlab.orient.wear

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.contract.PulseOccurrenceId
import org.junit.Test
import java.nio.charset.StandardCharsets

class WearPulseMessageTest {
    private val id = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!

    @Test
    fun pathIsFixedOrientPulseExpress() {
        assertThat(WearPulseMessage.PATH).isEqualTo("/orient/pulse/express")
        assertThat(WearPulseMessage.isExpressPath(WearPulseMessage.PATH)).isTrue()
        assertThat(WearPulseMessage.isExpressPath("/other")).isFalse()
    }

    @Test
    fun encodeContainsOnlyCanonicalUuidUtf8() {
        val bytes = WearPulseMessage.encode(id)
        assertThat(String(bytes, StandardCharsets.UTF_8)).isEqualTo(id.value)
        assertThat(bytes.decodeToString()).doesNotContain("{")
        assertThat(bytes.decodeToString()).doesNotContain("jwt")
    }

    @Test
    fun decodeRejectsMalformedPayload() {
        assertThat(WearPulseMessage.decode(null)).isNull()
        assertThat(WearPulseMessage.decode(ByteArray(0))).isNull()
        assertThat(WearPulseMessage.decode("not-a-uuid".toByteArray())).isNull()
        assertThat(WearPulseMessage.decode("550e8400-e29b-41d4-a716-446655440000".toByteArray()))
            .isEqualTo(id)
    }

    @Test
    fun capabilityIsNarrowOrientPulsePerception() {
        assertThat(WearPulseMessage.CAPABILITY).isEqualTo("orient_pulse_perception")
    }
}
