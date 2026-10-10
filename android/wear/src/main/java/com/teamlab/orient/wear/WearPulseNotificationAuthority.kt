package com.teamlab.orient.wear

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/**
 * Whether the watch may attempt NotificationManager Pulse expression.
 * Does not establish Pulse truth and is not perception acknowledgement.
 */
object WearPulseNotificationAuthority {
    data class Snapshot(
        val permissionGranted: Boolean,
        val notificationsEnabled: Boolean,
    ) {
        val available: Boolean get() = permissionGranted && notificationsEnabled
    }

    fun snapshot(context: Context): Snapshot {
        val permissionGranted =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS,
                ) == PackageManager.PERMISSION_GRANTED
            } else {
                true
            }
        val notificationsEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
        return Snapshot(
            permissionGranted = permissionGranted,
            notificationsEnabled = notificationsEnabled,
        )
    }

    fun isAvailable(context: Context): Boolean = snapshot(context).available
}
