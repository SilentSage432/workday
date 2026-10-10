package com.teamlab.orient.wear

import android.Manifest
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts

/**
 * Smallest human boundary for watch notification-class Pulse expression.
 * Not the Orient Watch companion. Not a watch-face manager.
 */
class WearPulsePermissionActivity : ComponentActivity() {
    private lateinit var statusView: TextView
    private lateinit var permissionButton: Button

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            refreshStatus()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_wear_pulse_permission)
        statusView = findViewById(R.id.status_view)
        permissionButton = findViewById(R.id.permission_button)
        permissionButton.setOnClickListener { requestNotificationPermission() }
        WearPulseNotification.ensureChannel(this)
        refreshStatus()
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            refreshStatus()
            return
        }
        if (WearPulseNotificationAuthority.isAvailable(this)) {
            refreshStatus()
            return
        }
        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    private fun refreshStatus() {
        val snapshot = WearPulseNotificationAuthority.snapshot(this)
        if (snapshot.available) {
            statusView.text = getString(R.string.status_ready)
            permissionButton.isEnabled = false
        } else {
            statusView.text = getString(R.string.status_unavailable)
            permissionButton.isEnabled = true
        }
    }
}
