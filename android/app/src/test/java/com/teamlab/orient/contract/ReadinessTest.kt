package com.teamlab.orient.contract

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class ReadinessTest {
    @Test
    fun readyOnlyWhenAllFourConditionsHold() {
        assertThat(
            NativePulseReadiness(
                authenticated = true,
                notificationPermissionGranted = true,
                fcmTokenPresent = true,
                tokenRegistrationSucceeded = true,
            ).isReady,
        ).isTrue()

        assertThat(
            NativePulseReadiness(
                authenticated = true,
                notificationPermissionGranted = true,
                fcmTokenPresent = true,
                tokenRegistrationSucceeded = false,
            ).isReady,
        ).isFalse()
    }
}
