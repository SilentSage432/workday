package com.teamlab.orient.wear

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.teamlab.orient.wear.contract.PulseOccurrenceId

/**
 * Local NotificationManager actuator for an already-claimed watch Pulse.
 * Channel owns notification-class haptic. No direct Vibrator call.
 */
object WearPulseNotification {
    /** Matches [NotificationManager.IMPORTANCE_DEFAULT]. */
    const val CHANNEL_IMPORTANCE = NotificationManager.IMPORTANCE_DEFAULT

    /** Restrained one-shot intent: 0 ms delay, 40 ms vibration. */
    val VIBRATION_PATTERN: LongArray = longArrayOf(0L, 40L)

    const val CATEGORY: String = NotificationCompat.CATEGORY_REMINDER

    fun ensureChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        val channel =
            NotificationChannel(
                WearNotificationIdentity.CHANNEL_ID,
                context.getString(R.string.pulse_channel_name),
                CHANNEL_IMPORTANCE,
            ).apply {
                description = context.getString(R.string.pulse_channel_description)
                setSound(null, null as AudioAttributes?)
                enableVibration(true)
                vibrationPattern = VIBRATION_PATTERN
                enableLights(false)
                setBypassDnd(false)
                setShowBadge(false)
            }
        manager.createNotificationChannel(channel)
        WearPerceptionTrace.channelEnsured(WearNotificationIdentity.CHANNEL_ID)
    }

    /**
     * Posts after pipeline authority gate + claim.
     * Permission is re-checked here; [MissingPermission] is suppressed because
     * lint cannot prove the runtime gate across the claim boundary.
     */
    @SuppressLint("MissingPermission")
    fun post(
        context: Context,
        occurrenceId: PulseOccurrenceId,
    ) {
        requireNotificationPermission(context)
        ensureChannel(context)
        val notification =
            NotificationCompat.Builder(context, WearNotificationIdentity.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_pulse_notification)
                .setContentTitle(context.getString(R.string.pulse_notification_title))
                .setContentText(context.getString(R.string.pulse_notification_body))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(CATEGORY)
                .setOnlyAlertOnce(true)
                .setAutoCancel(true)
                .build()

        try {
            NotificationManagerCompat.from(context).notify(
                WearNotificationIdentity.TAG,
                WearNotificationIdentity.notificationId(occurrenceId),
                notification,
            )
        } catch (e: SecurityException) {
            throw IllegalStateException("NotificationManager rejected Pulse post", e)
        }
    }

    private fun requireNotificationPermission(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted =
                ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS,
                ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                throw SecurityException("POST_NOTIFICATIONS not granted")
            }
        }
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            throw SecurityException("notifications disabled")
        }
    }
}
