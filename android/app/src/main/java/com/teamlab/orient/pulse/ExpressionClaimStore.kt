package com.teamlab.orient.pulse

import com.teamlab.orient.contract.ExpressionClaimResult
import com.teamlab.orient.contract.PulseOccurrenceId

/**
 * Claim BEFORE notify/haptic so process death cannot repeat expression.
 *
 * Mechanism: SQLite INSERT OR IGNORE on PRIMARY KEY(occurrence_id)
 * via [ExpressionClaimDatabase]. Preferences DataStore cannot enforce
 * unique concurrent claims transactionally.
 */
class ExpressionClaimStore(
    private val database: ExpressionClaimDatabase,
    private val clockMs: () -> Long = { System.currentTimeMillis() },
) {
    fun tryClaim(occurrenceId: PulseOccurrenceId): ExpressionClaimResult =
        database.tryClaim(occurrenceId, clockMs())
}
