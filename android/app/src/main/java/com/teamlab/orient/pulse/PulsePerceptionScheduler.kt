package com.teamlab.orient.pulse

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.teamlab.orient.contract.PulseOccurrenceId

object PulsePerceptionScheduler {
    fun enqueue(context: Context, occurrenceId: PulseOccurrenceId) {
        val request =
            OneTimeWorkRequestBuilder<PulsePerceptionWorker>()
                .setInputData(
                    workDataOf(PulsePerceptionWorker.KEY_OCCURRENCE_ID to occurrenceId.value),
                )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build(),
                )
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .addTag(WORK_TAG)
                .build()

        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
            uniqueWorkName(occurrenceId),
            ExistingWorkPolicy.KEEP,
            request,
        )
    }

    fun uniqueWorkName(occurrenceId: PulseOccurrenceId): String =
        "orient_pulse_perception_${occurrenceId.value}"

    const val WORK_TAG = "orient_pulse_perception"
}
