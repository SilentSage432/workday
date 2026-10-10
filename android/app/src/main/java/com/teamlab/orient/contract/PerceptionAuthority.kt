package com.teamlab.orient.contract

/**
 * NO AUTHORITATIVE REREAD = NO PERCEPTION CLAIM.
 *
 * WorkManager may retry retrieval of already-established truth.
 * It must never evaluate timing, grants, or create occurrences.
 *
 * Ordering (EXPRESSION-005-II):
 * reread → validate relationship → pronunciation gate → terminal claim → express iff pronunciation exists.
 */
sealed class PerceptionDecision {
    data object SilenceNoSession : PerceptionDecision()

    data object SilenceOccurrenceNotVisible : PerceptionDecision()

    data object RetryTransientFailure : PerceptionDecision()

    /** Recognized relationship with accepted physical pronunciation. */
    data class Express(
        val occurrenceId: PulseOccurrenceId,
        val relationship: PulseRelationship,
        val sourceStartAt: String,
    ) : PerceptionDecision()

    /**
     * Recognized relationship without accepted physical pronunciation (ARRIVAL).
     * Terminal: claim/consume, then silence. Do not notify, haptic, or Wear-forward.
     */
    data class SuppressWithoutPronunciation(
        val occurrenceId: PulseOccurrenceId,
        val relationship: PulseRelationship,
        val sourceStartAt: String,
    ) : PerceptionDecision()

    /**
     * Authoritative row visible but relationship token is not in the closed set.
     * Terminal fail-closed: claim/consume, then silence. Never teach relative_before by default.
     */
    data class SuppressUnrecognizedRelationship(
        val occurrenceId: PulseOccurrenceId,
    ) : PerceptionDecision()
}

object PerceptionAuthority {
    const val MAX_TRANSIENT_ATTEMPTS = 5

    fun decide(
        hasSession: Boolean,
        reread: OccurrenceRereadResult,
    ): PerceptionDecision {
        if (!hasSession) return PerceptionDecision.SilenceNoSession
        return when (reread) {
            is OccurrenceRereadResult.Visible ->
                if (PulsePronunciationGate.isPronunciationAvailable(reread.relationship)) {
                    PerceptionDecision.Express(
                        occurrenceId = reread.occurrenceId,
                        relationship = reread.relationship,
                        sourceStartAt = reread.sourceStartAt,
                    )
                } else {
                    PerceptionDecision.SuppressWithoutPronunciation(
                        occurrenceId = reread.occurrenceId,
                        relationship = reread.relationship,
                        sourceStartAt = reread.sourceStartAt,
                    )
                }
            is OccurrenceRereadResult.VisibleUnrecognizedRelationship ->
                PerceptionDecision.SuppressUnrecognizedRelationship(reread.occurrenceId)
            OccurrenceRereadResult.NotVisible ->
                PerceptionDecision.SilenceOccurrenceNotVisible
            OccurrenceRereadResult.TransientFailure ->
                PerceptionDecision.RetryTransientFailure
        }
    }

    fun shouldRetryTransient(attemptCount: Int): Boolean =
        attemptCount < MAX_TRANSIENT_ATTEMPTS
}

sealed class OccurrenceRereadResult {
    data class Visible(
        val occurrenceId: PulseOccurrenceId,
        val relationship: PulseRelationship,
        val sourceStartAt: String,
    ) : OccurrenceRereadResult()

    data class VisibleUnrecognizedRelationship(
        val occurrenceId: PulseOccurrenceId,
    ) : OccurrenceRereadResult()

    data object NotVisible : OccurrenceRereadResult()

    data object TransientFailure : OccurrenceRereadResult()
}
