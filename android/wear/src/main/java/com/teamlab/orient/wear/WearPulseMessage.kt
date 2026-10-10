package com.teamlab.orient.wear

import com.teamlab.orient.wear.contract.PulseOccurrenceId
import java.nio.charset.StandardCharsets

/**
 * Watch-side transport contract. Must match phone WearPulseMessage.
 */
object WearPulseMessage {
    const val PATH = "/orient/pulse/express"
    const val CAPABILITY = "orient_pulse_perception"

    fun decode(payload: ByteArray?): PulseOccurrenceId? {
        if (payload == null || payload.isEmpty()) return null
        val raw = String(payload, StandardCharsets.UTF_8)
        return PulseOccurrenceId.parse(raw)
    }

    fun isExpressPath(path: String?): Boolean = path == PATH
}
