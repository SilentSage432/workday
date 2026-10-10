package com.teamlab.orient.wear

import com.teamlab.orient.contract.ExpressionClaimResult
import com.teamlab.orient.contract.PulsePronunciationGate
import com.teamlab.orient.contract.PulseRelationship

/**
 * Wear forward is allowed only after this phone run newly claimed expression
 * for a pronunciation-available relationship.
 *
 * ARRIVAL / unrecognized never reach express, so they never forward.
 * MessageClient payload remains occurrence-id-only.
 */
object WearPulseForwardPolicy {
    fun mayForwardAfterPhoneClaim(claim: ExpressionClaimResult): Boolean =
        claim == ExpressionClaimResult.Claimed

    fun mayForward(
        claim: ExpressionClaimResult,
        relationship: PulseRelationship,
    ): Boolean =
        mayForwardAfterPhoneClaim(claim) &&
            PulsePronunciationGate.isPronunciationAvailable(relationship)
}
