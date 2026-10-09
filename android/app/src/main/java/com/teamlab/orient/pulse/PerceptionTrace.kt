package com.teamlab.orient.pulse

import android.util.Log
import com.teamlab.orient.contract.ExpressionClaimResult
import com.teamlab.orient.contract.OccurrenceRereadResult
import com.teamlab.orient.contract.PerceptionDecision
import io.github.jan.supabase.exceptions.RestException

/**
 * Safe semantic observability for native Pulse perception.
 *
 * Emits enums/booleans/status classes only. Never JWTs, FCM tokens, passwords,
 * credentials, or request/response bodies.
 */
object PerceptionTrace {
    const val TAG = "OrientPulsePerception"

    internal fun interface Sink {
        fun emit(line: String)
    }

    @Volatile
    internal var sink: Sink = Sink { line -> Log.i(TAG, line) }

    fun sessionRestoreEntered() {
        emit("stage=session event=restore_entered")
    }

    fun sessionStatusClass(statusClass: String) {
        emit("stage=session event=status_class class=$statusClass")
    }

    fun refreshAttempted() {
        emit("stage=session event=refresh_attempted")
    }

    fun refreshResult(succeeded: Boolean, error: Throwable?) {
        if (succeeded) {
            emit("stage=session event=refresh_result ok=yes")
        } else {
            emit(
                "stage=session event=refresh_result ok=no " +
                    safeErrorFields(error),
            )
        }
    }

    fun authenticatedUserAvailable(available: Boolean) {
        emit("stage=session event=authenticated_user available=${yesNo(available)}")
    }

    fun selectAttempted(occurrenceId: String) {
        emit("stage=reread event=select_attempted occ=$occurrenceId")
    }

    fun selectResult(
        occurrenceId: String,
        visible: Boolean,
        error: Throwable?,
    ) {
        if (error != null) {
            emit(
                "stage=reread event=select_result occ=$occurrenceId ok=no " +
                    "visible=no ${safeErrorFields(error)}",
            )
        } else {
            emit(
                "stage=reread event=select_result occ=$occurrenceId ok=yes " +
                    "visible=${yesNo(visible)}",
            )
        }
    }

    fun decision(
        occurrenceId: String,
        decision: PerceptionDecision,
        outcome: PulsePerceptionPipeline.Outcome,
    ) {
        emit(
            "stage=decision occ=$occurrenceId " +
                "decision=${formatDecision(decision, outcome)} " +
                "outcome=${formatOutcome(outcome)}",
        )
    }

    fun claimAttempted(occurrenceId: String) {
        emit("stage=expression event=claim_attempted occ=$occurrenceId")
    }

    fun claimResult(
        occurrenceId: String,
        result: ExpressionClaimResult,
    ) {
        emit(
            "stage=expression event=claim_result occ=$occurrenceId " +
                "result=${formatClaim(result)}",
        )
    }

    fun claimFailed(
        occurrenceId: String,
        error: Throwable,
    ) {
        emit(
            "stage=expression event=claim_result occ=$occurrenceId result=failure " +
                safeErrorFields(error),
        )
    }

    fun notificationAttempted(occurrenceId: String) {
        emit("stage=expression event=notification_attempted occ=$occurrenceId")
    }

    fun notificationPosted(occurrenceId: String) {
        emit("stage=expression event=notification_posted occ=$occurrenceId")
    }

    fun notificationFailed(
        occurrenceId: String,
        error: Throwable,
    ) {
        emit(
            "stage=expression event=notification_failed occ=$occurrenceId " +
                safeErrorFields(error),
        )
    }

    fun hapticAttempted(occurrenceId: String) {
        emit("stage=expression event=haptic_attempted occ=$occurrenceId")
    }

    fun hapticInvoked(occurrenceId: String) {
        emit("stage=expression event=haptic_invoked occ=$occurrenceId")
    }

    fun hapticFailed(
        occurrenceId: String,
        error: Throwable,
    ) {
        emit(
            "stage=expression event=haptic_failed occ=$occurrenceId " +
                safeErrorFields(error),
        )
    }

    fun invalidOccurrenceId() {
        emit("stage=decision decision=silent_invalid_occurrence outcome=silent")
    }

    /** Pure mapping for tests — no I/O. */
    fun formatDecision(
        decision: PerceptionDecision,
        outcome: PulsePerceptionPipeline.Outcome,
    ): String {
        return when (decision) {
            PerceptionDecision.SilenceNoSession -> "silent_no_session"
            PerceptionDecision.SilenceOccurrenceNotVisible -> "silent_occurrence_not_visible"
            PerceptionDecision.RetryTransientFailure ->
                if (outcome is PulsePerceptionPipeline.Outcome.Retry) {
                    "retry_transient"
                } else {
                    "silent_retry_exhausted"
                }
            is PerceptionDecision.Express ->
                when (outcome) {
                    PulsePerceptionPipeline.Outcome.Expressed -> "expressed"
                    PulsePerceptionPipeline.Outcome.Silent -> "silent_already_claimed"
                    PulsePerceptionPipeline.Outcome.Retry -> "expressed"
                }
        }
    }

    fun formatRereadVisibility(result: OccurrenceRereadResult): String =
        when (result) {
            is OccurrenceRereadResult.Visible -> "yes"
            OccurrenceRereadResult.NotVisible -> "no"
            OccurrenceRereadResult.TransientFailure -> "transient_failure"
        }

    fun formatClaim(result: ExpressionClaimResult): String =
        when (result) {
            ExpressionClaimResult.Claimed -> "claimed"
            ExpressionClaimResult.AlreadyClaimed -> "already_claimed"
        }

    fun safeErrorFields(error: Throwable?): String {
        if (error == null) return "class=none"
        val cls = error::class.simpleName ?: "Throwable"
        val status = safeHttpStatus(error)
        return buildString {
            append("class=")
            append(cls)
            if (status != null) {
                append(" status=")
                append(status)
            }
        }
    }

    fun sessionStatusClassName(status: Any): String = status::class.simpleName ?: "Unknown"

    private fun formatOutcome(outcome: PulsePerceptionPipeline.Outcome): String =
        when (outcome) {
            PulsePerceptionPipeline.Outcome.Silent -> "silent"
            PulsePerceptionPipeline.Outcome.Expressed -> "expressed"
            PulsePerceptionPipeline.Outcome.Retry -> "retry"
        }

    private fun yesNo(value: Boolean): String = if (value) "yes" else "no"

    private fun safeHttpStatus(error: Throwable): Int? {
        var current: Throwable? = error
        while (current != null) {
            val rest = current as? RestException
            if (rest != null) return rest.statusCode
            current = current.cause
        }
        return null
    }

    private fun emit(line: String) {
        sink.emit(line)
    }
}
