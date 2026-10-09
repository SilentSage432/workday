package com.teamlab.orient.contract

/**
 * Deterministic notification identity derived only from occurrence UUID.
 * Prevents stacking duplicate notifications for the same occurrence.
 */
object NotificationIdentity {
    const val CHANNEL_ID = "orient_pulse"
    const val TAG = "orient_pulse_occurrence"

    fun notificationId(occurrenceId: PulseOccurrenceId): Int {
        // Stable positive int from UUID bits — not a security hash.
        var h = 0
        for (ch in occurrenceId.value) {
            h = 31 * h + ch.code
        }
        return h and 0x7fffffff
    }
}
