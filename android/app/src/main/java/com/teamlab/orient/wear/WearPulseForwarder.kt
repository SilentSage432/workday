package com.teamlab.orient.wear

import android.content.Context
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.Wearable
import com.teamlab.orient.contract.PulseOccurrenceId
import kotlinx.coroutines.tasks.await

/**
 * Best-effort MessageClient forward after phone expression claim.
 * Failure / no node must not alter phone perception success.
 */
object WearPulseForwarder {
    suspend fun forwardAfterClaim(
        context: Context,
        occurrenceId: PulseOccurrenceId,
    ) {
        WearPulseForwardTrace.forwardEntered(occurrenceId.value)
        try {
            val client = Wearable.getCapabilityClient(context.applicationContext)
            val info =
                client
                    .getCapability(
                        WearPulseMessage.CAPABILITY,
                        CapabilityClient.FILTER_REACHABLE,
                    )
                    .await()
            val nodes = info.nodes.filter { it.isNearby }.sortedBy { it.id }
            WearPulseForwardTrace.eligibleNodes(occurrenceId.value, nodes.size)
            if (nodes.isEmpty()) {
                WearPulseForwardTrace.noEligibleNode(occurrenceId.value)
                return
            }
            val target = nodes.first()
            WearPulseForwardTrace.targetNode(occurrenceId.value, target.id)
            val payload = WearPulseMessage.encode(occurrenceId)
            WearPulseForwardTrace.sendAttempted(occurrenceId.value, target.id)
            Wearable
                .getMessageClient(context.applicationContext)
                .sendMessage(target.id, WearPulseMessage.PATH, payload)
                .await()
            WearPulseForwardTrace.sendSuccess(occurrenceId.value, target.id)
        } catch (error: Throwable) {
            WearPulseForwardTrace.sendFailure(occurrenceId.value, error)
        }
    }
}
