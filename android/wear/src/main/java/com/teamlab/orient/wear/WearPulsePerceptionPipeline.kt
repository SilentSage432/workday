package com.teamlab.orient.wear

import com.teamlab.orient.wear.contract.ExpressionClaimGate
import com.teamlab.orient.wear.contract.ExpressionClaimResult
import com.teamlab.orient.wear.contract.PulseOccurrenceId

/**
 * Pure watch perception orchestration after transport receipt.
 * Claim precedes haptic. Watch never evaluates Pulse authority.
 */
class WearPulsePerceptionPipeline(
    private val tryClaim: (PulseOccurrenceId) -> ExpressionClaimResult,
    private val express: (PulseOccurrenceId) -> Unit,
) {
    sealed class Outcome {
        data object Expressed : Outcome()

        data object Duplicate : Outcome()

        data object Malformed : Outcome()

        data object WrongPath : Outcome()
    }

    fun onMessage(
        path: String?,
        payload: ByteArray?,
    ): Outcome {
        WearPerceptionTrace.messageReceived(path)
        if (!WearPulseMessage.isExpressPath(path)) {
            WearPerceptionTrace.wrongPath(path)
            WearPerceptionTrace.decision(null, Outcome.WrongPath)
            return Outcome.WrongPath
        }
        WearPerceptionTrace.pathMatch(path)
        val occurrenceId = WearPulseMessage.decode(payload)
        if (occurrenceId == null) {
            WearPerceptionTrace.payloadValid(false)
            WearPerceptionTrace.decision(null, Outcome.Malformed)
            return Outcome.Malformed
        }
        WearPerceptionTrace.payloadValid(true, occurrenceId.value)
        WearPerceptionTrace.claimAttempted(occurrenceId.value)
        val claim = tryClaim(occurrenceId)
        WearPerceptionTrace.claimResult(occurrenceId.value, claim)
        if (!ExpressionClaimGate.mayExpress(claim)) {
            WearPerceptionTrace.decision(occurrenceId.value, Outcome.Duplicate)
            return Outcome.Duplicate
        }
        WearPerceptionTrace.hapticAttempted(occurrenceId.value)
        express(occurrenceId)
        WearPerceptionTrace.hapticInvoked(occurrenceId.value)
        WearPerceptionTrace.decision(occurrenceId.value, Outcome.Expressed)
        return Outcome.Expressed
    }
}
