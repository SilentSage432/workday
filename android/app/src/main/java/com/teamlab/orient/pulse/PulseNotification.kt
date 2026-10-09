package com.teamlab.orient.pulse

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.teamlab.orient.R
import com.teamlab.orient.contract.NotificationIdentity
import com.teamlab.orient.contract.PulseOccurrenceId

/**
 * Downstream expression of an already-established Pulse.
 * Generic copy only — no Commitment content, urgency, or judgment.
 */
object PulseNotification {
    fun ensureChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        val channel =
            NotificationChannel(
                NotificationIdentity.CHANNEL_ID,
                context.getString(R.string.pulse_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = context.getString(R.string.pulse_channel_description)
                setSound(null, null as AudioAttributes?)
                enableVibration(false)
                vibrationPattern = null
                enableLights(false)
            }
        manager.createNotificationChannel(channel)
    }

    fun post(context: Context, occurrenceId: PulseOccurrenceId) {
        ensureChannel(context)
        val notification =
            NotificationCompat.Builder(context, NotificationIdentity.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_pulse_notification)
                .setContentTitle(context.getString(R.string.pulse_notification_title))
                .setContentText(context.getString(R.string.pulse_notification_body))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setOnlyAlertOnce(true)
                .setAutoCancel(true)
                .setSilent(true)
                .build()

        NotificationManagerCompat.from(context).notify(
            NotificationIdentity.TAG,
            NotificationIdentity.notificationId(occurrenceId),
            notification,
        )
    }
}
