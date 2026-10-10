package com.teamlab.orient.wear

import com.teamlab.orient.wear.contract.PulseOccurrenceId

/**
 * Deterministic notification identity from occurrence UUID.
 * Subordinate to SQLite exactly-once claim — not the dedupe authority.
 */
object WearNotificationIdentity {
    const val CHANNEL_ID = "orient_pulse"
    const val TAG = "orient_pulse_occurrence"

    fun notificationId(occurrenceId: PulseOccurrenceId): Int {
        var h = 0
        for (ch in occurrenceId.value) {
            h = 31 * h + ch.code
        }
        return h and 0x7fffffff
    }
}
