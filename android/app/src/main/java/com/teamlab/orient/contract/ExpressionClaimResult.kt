package com.teamlab.orient.contract

/**
 * Local claim: this device claimed first local expression for an established occurrence.
 * Not global delivery, perception proof, acknowledgment, or Pulse truth.
 */
sealed class ExpressionClaimResult {
    data object Claimed : ExpressionClaimResult()

    data object AlreadyClaimed : ExpressionClaimResult()
}

object ExpressionClaimGate {
    fun mayExpress(result: ExpressionClaimResult): Boolean =
        result is ExpressionClaimResult.Claimed
}
