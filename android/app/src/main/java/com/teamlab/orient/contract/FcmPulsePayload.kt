package com.teamlab.orient.contract

/**
 * FCM carries only pulse_occurrence_id. No other field is authoritative.
 */
object FcmPulsePayload {
    const val OCCURRENCE_ID_KEY = "pulse_occurrence_id"

    fun parseOccurrenceId(data: Map<String, String>): PulseOccurrenceId? {
        // Ignore any additional keys; never treat title/body/urgency as truth.
        return PulseOccurrenceId.parse(data[OCCURRENCE_ID_KEY])
    }
}
