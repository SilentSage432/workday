package com.teamlab.orient.pulse

import com.teamlab.orient.contract.ExpressionClaimGate
import com.teamlab.orient.contract.ExpressionClaimResult
import com.teamlab.orient.contract.OccurrenceRereadResult
import com.teamlab.orient.contract.PerceptionAuthority
import com.teamlab.orient.contract.PerceptionDecision
import com.teamlab.orient.contract.PulseOccurrenceId
import com.teamlab.orient.contract.PulseRelationship

/**
 * Pure orchestration after dependencies are injected.
 *
 * Ordering:
 * reread → relationship / pronunciation gate → terminal claim → express only when pronunciation exists.
 */
class PulsePerceptionPipeline(
    private val hasSession: suspend () -> Boolean,
    private val reread: suspend (PulseOccurrenceId) -> OccurrenceRereadResult,
    private val tryClaim: suspend (PulseOccurrenceId) -> ExpressionClaimResult,
    private val express: suspend (PulseOccurrenceId, PulseRelationship) -> Unit,
) {
    sealed class Outcome {
        data object Silent : Outcome()

        data object Expressed : Outcome()

        data object Retry : Outcome()
    }

    suspend fun run(
        occurrenceId: PulseOccurrenceId,
        attemptCount: Int,
    ): Outcome {
        val session = hasSession()
        val decision =
            PerceptionAuthority.decide(
                hasSession = session,
                reread = if (session) reread(occurrenceId) else OccurrenceRereadResult.NotVisible,
            )

        val outcome =
            when (decision) {
                PerceptionDecision.SilenceNoSession,
                PerceptionDecision.SilenceOccurrenceNotVisible,
                -> Outcome.Silent
                PerceptionDecision.RetryTransientFailure -> {
                    if (PerceptionAuthority.shouldRetryTransient(attemptCount)) {
                        Outcome.Retry
                    } else {
                        Outcome.Silent
                    }
                }
                is PerceptionDecision.Express -> {
                    claimThenMaybeExpress(decision.occurrenceId, decision.relationship)
                }
                is PerceptionDecision.SuppressWithoutPronunciation -> {
                    PerceptionTrace.pronunciationUnavailable(
                        decision.occurrenceId.value,
                        decision.relationship.wireToken,
                    )
                    claimThenSilence(decision.occurrenceId)
                }
                is PerceptionDecision.SuppressUnrecognizedRelationship -> {
                    PerceptionTrace.relationshipUnrecognized(decision.occurrenceId.value, null)
                    claimThenSilence(decision.occurrenceId)
                }
            }
        PerceptionTrace.decision(occurrenceId.value, decision, outcome)
        return outcome
    }

    private suspend fun claimThenMaybeExpress(
        occurrenceId: PulseOccurrenceId,
        relationship: PulseRelationship,
    ): Outcome {
        PerceptionTrace.claimAttempted(occurrenceId.value)
        val claim =
            try {
                tryClaim(occurrenceId)
            } catch (error: Throwable) {
                PerceptionTrace.claimFailed(occurrenceId.value, error)
                throw error
            }
        PerceptionTrace.claimResult(occurrenceId.value, claim)
        if (!ExpressionClaimGate.mayExpress(claim)) {
            return Outcome.Silent
        }
        PerceptionTrace.pronunciationAvailable(occurrenceId.value, relationship.wireToken)
        express(occurrenceId, relationship)
        return Outcome.Expressed
    }

    private suspend fun claimThenSilence(occurrenceId: PulseOccurrenceId): Outcome {
        PerceptionTrace.claimAttempted(occurrenceId.value)
        val claim =
            try {
                tryClaim(occurrenceId)
            } catch (error: Throwable) {
                PerceptionTrace.claimFailed(occurrenceId.value, error)
                throw error
            }
        PerceptionTrace.claimResult(occurrenceId.value, claim)
        PerceptionTrace.terminalSilence(occurrenceId.value, claim)
        return Outcome.Silent
    }
}
