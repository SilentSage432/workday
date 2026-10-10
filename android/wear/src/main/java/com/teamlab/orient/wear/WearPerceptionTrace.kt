package com.teamlab.orient.wear

import android.util.Log
import com.teamlab.orient.wear.contract.ExpressionClaimResult

/**
 * Safe watch Pulse perception observability. No secrets.
 */
object WearPerceptionTrace {
    const val TAG = "OrientWearPulsePerception"

    internal fun interface Sink {
        fun emit(line: String)
    }

    @Volatile
    internal var sink: Sink = Sink { line -> Log.i(TAG, line) }

    fun messageReceived(path: String?) {
        emit("stage=receive event=message_received path=${path ?: "none"}")
    }

    fun pathMatch(path: String?) {
        emit("stage=receive event=path_match path=${path ?: "none"}")
    }

    fun wrongPath(path: String?) {
        emit("stage=receive event=wrong_path path=${path ?: "none"}")
    }

    fun payloadValid(
        valid: Boolean,
        occurrenceId: String? = null,
    ) {
        if (valid && occurrenceId != null) {
            emit("stage=receive event=payload_valid ok=yes occ=$occurrenceId")
        } else {
            emit("stage=receive event=payload_valid ok=no")
        }
    }

    fun claimAttempted(occurrenceId: String) {
        emit("stage=expression event=claim_attempted occ=$occurrenceId")
    }

    fun claimResult(
        occurrenceId: String,
        result: ExpressionClaimResult,
    ) {
        val label =
            when (result) {
                ExpressionClaimResult.Claimed -> "claimed"
                ExpressionClaimResult.AlreadyClaimed -> "already_claimed"
            }
        emit("stage=expression event=claim_result occ=$occurrenceId result=$label")
    }

    fun hapticAttempted(occurrenceId: String) {
        emit("stage=expression event=haptic_attempted occ=$occurrenceId")
    }

    fun hapticInvoked(occurrenceId: String) {
        emit("stage=expression event=haptic_invoked occ=$occurrenceId")
    }

    fun decision(
        occurrenceId: String?,
        outcome: WearPulsePerceptionPipeline.Outcome,
    ) {
        val decision =
            when (outcome) {
                WearPulsePerceptionPipeline.Outcome.Expressed -> "expressed"
                WearPulsePerceptionPipeline.Outcome.Duplicate -> "duplicate"
                WearPulsePerceptionPipeline.Outcome.Malformed -> "malformed"
                WearPulsePerceptionPipeline.Outcome.WrongPath -> "wrong_path"
            }
        val occ = occurrenceId ?: "none"
        emit("stage=decision occ=$occ decision=$decision")
    }

    private fun emit(line: String) {
        sink.emit(line)
    }
}
