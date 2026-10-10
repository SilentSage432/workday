package com.teamlab.orient.wear.contract

enum class ExpressionClaimResult {
    Claimed,
    AlreadyClaimed,
}

object ExpressionClaimGate {
    fun mayExpress(result: ExpressionClaimResult): Boolean =
        result == ExpressionClaimResult.Claimed
}
