package com.teamlab.orient.wear

import com.teamlab.orient.contract.PulseOccurrenceId
import java.nio.charset.StandardCharsets

/**
 * Phone→watch Pulse transport contract.
 * Path + UTF-8 occurrence id only. Not Pulse authority.
 */
object WearPulseMessage {
    const val PATH = "/orient/pulse/express"
    const val CAPABILITY = "orient_pulse_perception"

    fun encode(occurrenceId: PulseOccurrenceId): ByteArray =
        occurrenceId.value.toByteArray(StandardCharsets.UTF_8)

    fun decode(payload: ByteArray?): PulseOccurrenceId? {
        if (payload == null || payload.isEmpty()) return null
        val raw = String(payload, StandardCharsets.UTF_8)
        return PulseOccurrenceId.parse(raw)
    }

    fun isExpressPath(path: String?): Boolean = path == PATH
}
