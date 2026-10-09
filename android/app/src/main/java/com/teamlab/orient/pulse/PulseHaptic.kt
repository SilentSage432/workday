package com.teamlab.orient.pulse

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * One restrained haptic after successful first-expression claim.
 *
 * API: VibrationEffect.createOneShot(40ms, DEFAULT_AMPLITUDE) via Vibrator/VibratorManager.
 * Not notification-channel vibration. No repeating pattern. No escalation.
 */
object PulseHaptic {
    private const val DURATION_MS = 40L

    fun expressOnce(context: Context) {
        val vibrator = vibrator(context) ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(
                VibrationEffect.createOneShot(DURATION_MS, VibrationEffect.DEFAULT_AMPLITUDE),
            )
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(DURATION_MS)
        }
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
