package com.teamlab.orient.wear

import android.os.VibrationAttributes
import android.os.VibrationEffect
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class WearPulseHapticContractTest {
    @Test
    fun notificationClassNotAlarmOrTouch() {
        assertThat(WearPulseHaptic.USAGE).isEqualTo(VibrationAttributes.USAGE_NOTIFICATION)
        assertThat(WearPulseHaptic.USAGE).isNotEqualTo(VibrationAttributes.USAGE_ALARM)
        assertThat(WearPulseHaptic.USAGE).isNotEqualTo(VibrationAttributes.USAGE_TOUCH)
    }

    @Test
    fun restrainedFortyMillisecondOneShot() {
        assertThat(WearPulseHaptic.DURATION_MS).isEqualTo(40L)
        assertThat(WearPulseHaptic.AMPLITUDE).isEqualTo(VibrationEffect.DEFAULT_AMPLITUDE)
    }
}
