package com.teamlab.orient.wear

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

/**
 * Wear Data Layer ingress for already-authorized Pulse occurrence identity.
 * Perception edge only — never establishes Pulse truth.
 */
class WearPulseListenerService : WearableListenerService() {
    override fun onMessageReceived(messageEvent: MessageEvent) {
        val store = ExpressionClaimStore(ExpressionClaimDatabase.get(applicationContext))
        val pipeline =
            WearPulsePerceptionPipeline(
                notificationAuthority = {
                    WearPulseNotificationAuthority.snapshot(applicationContext)
                },
                tryClaim = { id -> store.tryClaim(id) },
                express = { id -> WearPulseNotification.post(applicationContext, id) },
            )
        pipeline.onMessage(messageEvent.path, messageEvent.data)
    }
}
