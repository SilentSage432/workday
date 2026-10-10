package com.teamlab.orient.wear

import com.teamlab.orient.wear.contract.ExpressionClaimResult
import com.teamlab.orient.wear.contract.PulseOccurrenceId

class ExpressionClaimStore(
    private val database: ExpressionClaimDatabase,
    private val clockMs: () -> Long = { System.currentTimeMillis() },
) {
    fun tryClaim(occurrenceId: PulseOccurrenceId): ExpressionClaimResult =
        database.tryClaim(occurrenceId, clockMs())
}
