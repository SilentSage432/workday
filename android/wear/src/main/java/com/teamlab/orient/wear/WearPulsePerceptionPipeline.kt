package com.teamlab.orient.wear

import com.teamlab.orient.wear.contract.ExpressionClaimGate
import com.teamlab.orient.wear.contract.ExpressionClaimResult
import com.teamlab.orient.wear.contract.PulseOccurrenceId

/**
 * Pure watch perception orchestration after transport receipt.
 *
 * Ordering:
 * 1. path / UUID validation
 * 2. notification authority availability (before claim)
 * 3. SQLite exactly-once claim
 * 4. NotificationManager post (OS owns haptic)
 *
 * Availability is checked before claim so a known-unavailable permission state
 * does not consume the expression boundary. Claim remains "won the local
 * expression boundary," not "human perceived." Post failure after claim does
 * not retry and does not fall back to direct Vibrator.
 */
class WearPulsePerceptionPipeline(
    private val notificationAuthority: () -> WearPulseNotificationAuthority.Snapshot,
    private val tryClaim: (PulseOccurrenceId) -> ExpressionClaimResult,
    private val express: (PulseOccurrenceId) -> Unit,
) {
    sealed class Outcome {
        data object Expressed : Outcome()

        data object Duplicate : Outcome()

        data object Unavailable : Outcome()

        data object PostFailed : Outcome()

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

        WearPerceptionTrace.notificationAuthorityCheck(occurrenceId.value)
        val authority = notificationAuthority()
        WearPerceptionTrace.notificationPermissionGranted(
            occurrenceId.value,
            authority.permissionGranted,
        )
        WearPerceptionTrace.notificationsEnabled(
            occurrenceId.value,
            authority.notificationsEnabled,
        )
        if (!authority.available) {
            WearPerceptionTrace.decision(occurrenceId.value, Outcome.Unavailable)
            return Outcome.Unavailable
        }

        WearPerceptionTrace.claimAttempted(occurrenceId.value)
        val claim = tryClaim(occurrenceId)
        WearPerceptionTrace.claimResult(occurrenceId.value, claim)
        if (!ExpressionClaimGate.mayExpress(claim)) {
            WearPerceptionTrace.decision(occurrenceId.value, Outcome.Duplicate)
            return Outcome.Duplicate
        }

        WearPerceptionTrace.notificationPostAttempted(occurrenceId.value)
        return try {
            express(occurrenceId)
            WearPerceptionTrace.notificationPosted(occurrenceId.value)
            WearPerceptionTrace.decision(occurrenceId.value, Outcome.Expressed)
            Outcome.Expressed
        } catch (t: Throwable) {
            WearPerceptionTrace.notificationPostFailed(
                occurrenceId.value,
                t.javaClass.simpleName,
            )
            WearPerceptionTrace.decision(occurrenceId.value, Outcome.PostFailed)
            Outcome.PostFailed
        }
    }
}
