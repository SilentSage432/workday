package com.teamlab.orient.wear

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.wear.contract.PulseOccurrenceId
import org.junit.Test

class WearNotificationIdentityTest {
    @Test
    fun sameOccurrenceSameIdDifferentOccurrenceDifferentId() {
        val a = PulseOccurrenceId.parse("11111111-1111-1111-1111-111111111111")!!
        val b = PulseOccurrenceId.parse("11111111-1111-1111-1111-111111111111")!!
        val c = PulseOccurrenceId.parse("22222222-2222-2222-2222-222222222222")!!
        assertThat(WearNotificationIdentity.notificationId(a))
            .isEqualTo(WearNotificationIdentity.notificationId(b))
        assertThat(WearNotificationIdentity.notificationId(a))
            .isNotEqualTo(WearNotificationIdentity.notificationId(c))
    }
}
