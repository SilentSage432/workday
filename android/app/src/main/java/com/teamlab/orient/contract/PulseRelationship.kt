package com.teamlab.orient.contract

/**
 * Closed authorized temporal relationship identity for native perception.
 *
 * Unknown database tokens must not map to [RELATIVE_BEFORE].
 * Native surfaces do not invent APPROACH, urgency, or source-specific types.
 */
enum class PulseRelationship {
    RELATIVE_BEFORE,
    ARRIVAL,
    ;

    companion object {
        fun parse(raw: String): PulseRelationship? =
            when (raw.trim()) {
                "relative_before" -> RELATIVE_BEFORE
                "arrival" -> ARRIVAL
                else -> null
            }
    }

    val wireToken: String
        get() =
            when (this) {
                RELATIVE_BEFORE -> "relative_before"
                ARRIVAL -> "arrival"
            }
}

/**
 * Physical-pronunciation availability for a recognized relationship.
 *
 * 005-II: only [PulseRelationship.RELATIVE_BEFORE] has an accepted physical word.
 * ARRIVAL is recognized and deliberately silent. Numeric freshness is not decided here.
 */
object PulsePronunciationGate {
    fun isPronunciationAvailable(relationship: PulseRelationship): Boolean =
        when (relationship) {
            PulseRelationship.RELATIVE_BEFORE -> true
            PulseRelationship.ARRIVAL -> false
        }
}
