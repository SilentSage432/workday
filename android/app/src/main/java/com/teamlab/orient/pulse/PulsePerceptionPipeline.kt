package com.teamlab.orient.pulse

import com.teamlab.orient.contract.ExpressionClaimGate
import com.teamlab.orient.contract.ExpressionClaimResult
import com.teamlab.orient.contract.OccurrenceRereadResult
import com.teamlab.orient.contract.PerceptionAuthority
import com.teamlab.orient.contract.PerceptionDecision
import com.teamlab.orient.contract.PulseOccurrenceId

/**
 * Pure orchestration after dependencies are injected.
 * Claim precedes notify/haptic.
 */
class PulsePerceptionPipeline(
    private val hasSession: suspend () -> Boolean,
    private val reread: suspend (PulseOccurrenceId) -> OccurrenceRereadResult,
    private val tryClaim: suspend (PulseOccurrenceId) -> ExpressionClaimResult,
    private val express: suspend (PulseOccurrenceId) -> Unit,
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
                    PerceptionTrace.claimAttempted(decision.occurrenceId.value)
                    val claim =
                        try {
                            tryClaim(decision.occurrenceId)
                        } catch (error: Throwable) {
                            PerceptionTrace.claimFailed(decision.occurrenceId.value, error)
                            throw error
                        }
                    PerceptionTrace.claimResult(decision.occurrenceId.value, claim)
                    if (!ExpressionClaimGate.mayExpress(claim)) {
                        Outcome.Silent
                    } else {
                        express(decision.occurrenceId)
                        Outcome.Expressed
                    }
                }
            }
        PerceptionTrace.decision(occurrenceId.value, decision, outcome)
        return outcome
    }
}
