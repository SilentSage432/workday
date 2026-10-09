package com.teamlab.orient.contract

/**
 * NO AUTHORITATIVE REREAD = NO PERCEPTION CLAIM.
 *
 * WorkManager may retry retrieval of already-established truth.
 * It must never evaluate timing, grants, or create occurrences.
 */
sealed class PerceptionDecision {
    data object SilenceNoSession : PerceptionDecision()

    data object SilenceOccurrenceNotVisible : PerceptionDecision()

    data object RetryTransientFailure : PerceptionDecision()

    data class Express(
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
                PerceptionDecision.Express(reread.occurrenceId)
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
    data class Visible(val occurrenceId: PulseOccurrenceId) : OccurrenceRereadResult()

    data object NotVisible : OccurrenceRereadResult()

    data object TransientFailure : OccurrenceRereadResult()
}
