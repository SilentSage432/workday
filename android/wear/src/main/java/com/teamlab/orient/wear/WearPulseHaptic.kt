package com.teamlab.orient.wear

import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * One restrained wrist haptic after successful watch-local claim.
 * Notification-class. Not alarm. Not UI touch feedback.
 *
 * Physical Watch6 is API 36 (VibratorManager + VibrationAttributes path).
 * Branches keep minSdk 30 lint-clean.
 */
object WearPulseHaptic {
    const val DURATION_MS = 40L
    val AMPLITUDE: Int = VibrationEffect.DEFAULT_AMPLITUDE

    /** Semantic target on API 33+; equal to [VibrationAttributes.USAGE_NOTIFICATION]. */
    val USAGE: Int = VibrationAttributes.USAGE_NOTIFICATION

    fun expressOnce(context: Context) {
        val vibrator = vibrator(context) ?: return
        val effect = VibrationEffect.createOneShot(DURATION_MS, AMPLITUDE)
        vibrateOnce(vibrator, effect)
    }

    private fun vibrateOnce(
        vibrator: Vibrator,
        effect: VibrationEffect,
    ) {
        // Lint treats VibrationAttributes overload as API 33+.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
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
