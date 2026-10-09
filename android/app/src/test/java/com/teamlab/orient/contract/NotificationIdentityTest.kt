package com.teamlab.orient.contract

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class NotificationIdentityTest {
    @Test
    fun stableIdentityFromOccurrenceUuid() {
        val a = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!
        val b = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!
        val c = PulseOccurrenceId.parse("11111111-1111-1111-1111-111111111111")!!

        assertThat(NotificationIdentity.notificationId(a))
            .isEqualTo(NotificationIdentity.notificationId(b))
        assertThat(NotificationIdentity.notificationId(a))
            .isNotEqualTo(NotificationIdentity.notificationId(c))
        assertThat(NotificationIdentity.CHANNEL_ID).isEqualTo("orient_pulse")
        assertThat(NotificationIdentity.TAG).isEqualTo("orient_pulse_occurrence")
    }
}
