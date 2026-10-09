package com.teamlab.orient.pulse

import android.os.VibrationAttributes
import android.os.VibrationEffect
import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.contract.NotificationIdentity
import org.junit.Test

/**
 * BRIDGE-008: Pulse haptic must declare notification-class vibration usage
 * so background WorkManager expression is not ignored as TOUCH feedback.
 *
 * Framework Builder construction is not exercised on the JVM unit classpath;
 * the bound constant is the production usage passed to VibrationAttributes.
 */
class PulseHapticContractTest {
    @Test
    fun usageIsNotificationClassNotTouchOrAlarm() {
        assertThat(PulseHaptic.USAGE).isEqualTo(VibrationAttributes.USAGE_NOTIFICATION)
        assertThat(PulseHaptic.USAGE).isNotEqualTo(VibrationAttributes.USAGE_TOUCH)
        assertThat(PulseHaptic.USAGE).isNotEqualTo(VibrationAttributes.USAGE_ALARM)
        assertThat(PulseHaptic.USAGE).isNotEqualTo(VibrationAttributes.USAGE_UNKNOWN)
    }

    @Test
    fun durationAndAmplitudeUnchanged() {
        assertThat(PulseHaptic.DURATION_MS).isEqualTo(40L)
        assertThat(PulseHaptic.AMPLITUDE).isEqualTo(VibrationEffect.DEFAULT_AMPLITUDE)
    }

    @Test
    fun singleExplicitHapticContractUnchanged() {
        // One duration constant + one usage constant — no pattern / multi-pulse surface.
        assertThat(PulseHaptic.DURATION_MS).isGreaterThan(0L)
        assertThat(PulseHaptic.USAGE).isEqualTo(VibrationAttributes.USAGE_NOTIFICATION)
    }

    @Test
    fun notificationChannelIdentityUnchanged() {
        // Haptic correction must not alter silent notification identity.
        assertThat(NotificationIdentity.CHANNEL_ID).isEqualTo("orient_pulse")
        assertThat(NotificationIdentity.TAG).isEqualTo("orient_pulse_occurrence")
    }
}
