package com.teamlab.orient.wear

import android.app.NotificationManager
import androidx.core.app.NotificationCompat
import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.wear.contract.PulseOccurrenceId
import org.junit.Test

class WearPulseNotificationContractTest {
    @Test
    fun channelIdentityIsStableOrientPulse() {
        assertThat(WearNotificationIdentity.CHANNEL_ID).isEqualTo("orient_pulse")
        assertThat(WearNotificationIdentity.TAG).isEqualTo("orient_pulse_occurrence")
    }

    @Test
    fun channelImportanceIsDefaultNotHigh() {
        assertThat(WearPulseNotification.CHANNEL_IMPORTANCE)
            .isEqualTo(NotificationManager.IMPORTANCE_DEFAULT)
        assertThat(WearPulseNotification.CHANNEL_IMPORTANCE)
            .isNotEqualTo(NotificationManager.IMPORTANCE_HIGH)
        assertThat(WearPulseNotification.CHANNEL_IMPORTANCE)
            .isNotEqualTo(NotificationManager.IMPORTANCE_LOW)
    }

    @Test
    fun vibrationPatternIsRestrainedFortyMillisecondOneShot() {
        assertThat(WearPulseNotification.VIBRATION_PATTERN.toList())
            .containsExactly(0L, 40L)
            .inOrder()
    }

    @Test
    fun categoryIsReminderNotAlarm() {
        assertThat(WearPulseNotification.CATEGORY)
            .isEqualTo(NotificationCompat.CATEGORY_REMINDER)
        assertThat(WearPulseNotification.CATEGORY)
            .isNotEqualTo(NotificationCompat.CATEGORY_ALARM)
        assertThat(WearPulseNotification.CATEGORY)
            .isNotEqualTo(NotificationCompat.CATEGORY_CALL)
    }

    @Test
    fun notificationIdIsDeterministicFromOccurrenceUuid() {
        val a = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!
        val b = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440000")!!
        val c = PulseOccurrenceId.parse("550e8400-e29b-41d4-a716-446655440001")!!
        assertThat(WearNotificationIdentity.notificationId(a))
            .isEqualTo(WearNotificationIdentity.notificationId(b))
        assertThat(WearNotificationIdentity.notificationId(a))
            .isNotEqualTo(WearNotificationIdentity.notificationId(c))
        assertThat(WearNotificationIdentity.notificationId(a)).isAtLeast(0)
    }

    @Test
    fun authorityRequiresPermissionAndNotificationsEnabled() {
        assertThat(
            WearPulseNotificationAuthority.Snapshot(
                permissionGranted = true,
                notificationsEnabled = true,
            ).available,
        ).isTrue()
        assertThat(
            WearPulseNotificationAuthority.Snapshot(
                permissionGranted = false,
                notificationsEnabled = true,
            ).available,
        ).isFalse()
        assertThat(
            WearPulseNotificationAuthority.Snapshot(
                permissionGranted = true,
                notificationsEnabled = false,
            ).available,
        ).isFalse()
    }

    @Test
    fun sourceTreeDoesNotRetainDirectVibratorActuator() {
        // Contract guard: WearPulseHaptic was removed; expression is NotificationManager-only.
        val hapticClass =
            runCatching { Class.forName("com.teamlab.orient.wear.WearPulseHaptic") }.getOrNull()
        assertThat(hapticClass).isNull()
    }
}
