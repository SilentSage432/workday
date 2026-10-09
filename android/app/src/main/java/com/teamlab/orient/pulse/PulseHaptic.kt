package com.teamlab.orient.pulse

import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * One restrained haptic after successful first-expression claim.
 *
 * Explicit application vibration — not notification-channel vibration.
 * Background delivery must declare notification-class
 * [VibrationAttributes.USAGE_NOTIFICATION]; bare [Vibrator.vibrate] /
 * empty attributes resolve to UNKNOWN→TOUCH and are ignored for background
 * processes (BRIDGE-007E / BRIDGE-008).
 *
 * Not alarm usage. No repeating pattern. No escalation.
 */
object PulseHaptic {
    const val DURATION_MS = 40L

    /** [VibrationEffect.DEFAULT_AMPLITUDE] — unchanged from prior candidate. */
    val AMPLITUDE: Int = VibrationEffect.DEFAULT_AMPLITUDE

    /**
     * Semantically correct usage for an authorized Pulse perception event.
     * Equal to [VibrationAttributes.USAGE_NOTIFICATION].
     * Must not be [VibrationAttributes.USAGE_TOUCH] or [VibrationAttributes.USAGE_ALARM].
     */
    val USAGE: Int = VibrationAttributes.USAGE_NOTIFICATION

    fun expressOnce(context: Context) {
        val vibrator = vibrator(context) ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val effect = VibrationEffect.createOneShot(DURATION_MS, AMPLITUDE)
            vibrateOnce(vibrator, effect)
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(DURATION_MS)
        }
    }

    private fun vibrateOnce(
        vibrator: Vibrator,
        effect: VibrationEffect,
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            vibrator.vibrate(
                effect,
                VibrationAttributes.Builder().setUsage(USAGE).build(),
            )
            return
        }
        @Suppress("DEPRECATION")
        vibrator.vibrate(
            effect,
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build(),
        )
    }

    private fun vibrator(context: Context): Vibrator? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(VibratorManager::class.java)
            manager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Vibrator::class.java)
        }
    }
}
