package com.teamlab.orient.wear

import android.util.Log

/**
 * Safe phone→watch forward observability. No secrets.
 */
object WearPulseForwardTrace {
    const val TAG = "OrientWearPulseForward"

    internal fun interface Sink {
        fun emit(line: String)
    }

    @Volatile
    internal var sink: Sink = Sink { line -> Log.i(TAG, line) }

    fun forwardEntered(occurrenceId: String) {
        emit("stage=wear_forward event=entered occ=$occurrenceId")
    }

    fun eligibleNodes(
        occurrenceId: String,
        count: Int,
    ) {
        emit("stage=wear_forward event=eligible_nodes occ=$occurrenceId count=$count")
    }

    fun noEligibleNode(occurrenceId: String) {
        emit("stage=wear_forward event=no_eligible_node occ=$occurrenceId")
    }

    fun targetNode(
        occurrenceId: String,
        nodeId: String,
    ) {
        emit("stage=wear_forward event=target_node occ=$occurrenceId node=$nodeId")
    }

    fun sendAttempted(
        occurrenceId: String,
        nodeId: String,
    ) {
        emit("stage=wear_forward event=send_attempted occ=$occurrenceId node=$nodeId")
    }

    fun sendSuccess(
        occurrenceId: String,
        nodeId: String,
    ) {
        emit("stage=wear_forward event=send_success occ=$occurrenceId node=$nodeId")
    }

    fun sendFailure(
        occurrenceId: String,
        error: Throwable,
    ) {
        val cls = error::class.simpleName ?: "Throwable"
        emit("stage=wear_forward event=send_failure occ=$occurrenceId class=$cls")
    }

    private fun emit(line: String) {
        sink.emit(line)
    }
}
