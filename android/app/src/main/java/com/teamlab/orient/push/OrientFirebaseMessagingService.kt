package com.teamlab.orient.push

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.teamlab.orient.auth.OrientSupabase
import com.teamlab.orient.contract.FcmPulsePayload
import com.teamlab.orient.pulse.PulsePerceptionScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Transport edge only. Never notifies from FCM payload alone.
 */
class OrientFirebaseMessagingService : FirebaseMessagingService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        scope.launch {
            val store = FcmTokenStore(applicationContext)
            store.save(token)
            val supabase = OrientSupabase.get(applicationContext)
            if (supabase.hasAuthenticatedSession()) {
                DeviceTokenRegistrar(supabase, store).reconcile()
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val occurrenceId = FcmPulsePayload.parseOccurrenceId(message.data) ?: return
        // Enqueue perception work — never interpret or notify here.
        PulsePerceptionScheduler.enqueue(applicationContext, occurrenceId)
    }
}
