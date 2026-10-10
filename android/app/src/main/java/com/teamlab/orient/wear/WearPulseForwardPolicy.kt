package com.teamlab.orient.wear

import com.teamlab.orient.contract.ExpressionClaimResult

/**
 * Wear forward is allowed only after this phone run newly claimed expression.
 * Already-claimed must not re-forward.
 */
object WearPulseForwardPolicy {
    fun mayForwardAfterPhoneClaim(claim: ExpressionClaimResult): Boolean =
        claim == ExpressionClaimResult.Claimed
}
