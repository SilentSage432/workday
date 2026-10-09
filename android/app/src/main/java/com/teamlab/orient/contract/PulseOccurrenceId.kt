package com.teamlab.orient.contract

/**
 * Lookup key only. Never sufficient Pulse truth by itself.
 */
data class PulseOccurrenceId(val value: String) {
    companion object {
        private val UUID_REGEX =
            Regex(
                "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
            )

        fun parse(raw: String?): PulseOccurrenceId? {
            val trimmed = raw?.trim().orEmpty()
            if (trimmed.isEmpty()) return null
            if (!UUID_REGEX.matches(trimmed)) return null
            return PulseOccurrenceId(trimmed.lowercase())
        }
    }
}
