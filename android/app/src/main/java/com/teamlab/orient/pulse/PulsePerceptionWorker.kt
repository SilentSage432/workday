package com.teamlab.orient.pulse

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.teamlab.orient.auth.OrientSupabase
import com.teamlab.orient.contract.PerceptionAuthority
import com.teamlab.orient.contract.PulseOccurrenceId
import com.teamlab.orient.contract.PulsePronunciationGate
import com.teamlab.orient.wear.WearPulseForwarder

/**
 * Continues FCM reception: session → authoritative reread → relationship gate → claim → express.
 * Retries only retrieval of already-established truth.
 * Wear MessageClient forward runs only inside express after pronunciation-available claim.
 */
class PulsePerceptionWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        val raw = inputData.getString(KEY_OCCURRENCE_ID)
        val occurrenceId =
            PulseOccurrenceId.parse(raw) ?: run {
                PerceptionTrace.invalidOccurrenceId()
                return Result.success()
            }

        val supabase = OrientSupabase.get(applicationContext)
        val claimStore =
            ExpressionClaimStore(ExpressionClaimDatabase.get(applicationContext))
        val pipeline =
            PulsePerceptionPipeline(
                hasSession = { supabase.hasAuthenticatedSession() },
                reread = { id -> OccurrenceReread(supabase).reread(id) },
                tryClaim = { id -> claimStore.tryClaim(id) },
                express = { id, relationship ->
                    // Defense in depth: ARRIVAL / unknown never reach this lambda.
                    check(PulsePronunciationGate.isPronunciationAvailable(relationship)) {
                        "express requires pronunciation-available relationship"
                    }
                    PerceptionTrace.notificationAttempted(id.value)
                    try {
                        PulseNotification.post(applicationContext, id)
                        PerceptionTrace.notificationPosted(id.value)
                    } catch (error: Throwable) {
                        PerceptionTrace.notificationFailed(id.value, error)
                        throw error
                    }
                    PerceptionTrace.hapticAttempted(id.value)
                    try {
                        PulseHaptic.expressOnce(applicationContext)
                        PerceptionTrace.hapticInvoked(id.value)
                    } catch (error: Throwable) {
                        PerceptionTrace.hapticFailed(id.value, error)
                        throw error
                    }
                    // Best-effort wrist transport. Must not fail phone perception.
                    // Id-only payload; relationship already gated on phone.
                    WearPulseForwarder.forwardAfterClaim(applicationContext, id)
                },
            )

        return when (pipeline.run(occurrenceId, runAttemptCount)) {
            PulsePerceptionPipeline.Outcome.Silent,
            PulsePerceptionPipeline.Outcome.Expressed,
            -> Result.success()
            PulsePerceptionPipeline.Outcome.Retry -> {
                if (runAttemptCount + 1 >= PerceptionAuthority.MAX_TRANSIENT_ATTEMPTS) {
                    Result.success() // remain silent after bounded retries
                } else {
                    Result.retry()
                }
            }
        }
    }

    companion object {
        const val KEY_OCCURRENCE_ID = "pulse_occurrence_id"
    }
}
