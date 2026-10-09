package com.teamlab.orient

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.firebase.messaging.FirebaseMessaging
import com.teamlab.orient.auth.OrientSupabase
import com.teamlab.orient.contract.NativePulseReadiness
import com.teamlab.orient.push.DeviceTokenRegistrar
import com.teamlab.orient.push.FcmTokenStore
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Smallest setup UI: email/password, readiness, sign-out.
 * Not a recreation of web Orient.
 */
class MainActivity : AppCompatActivity() {
    private lateinit var emailInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var signInButton: Button
    private lateinit var signOutButton: Button
    private lateinit var permissionButton: Button
    private lateinit var statusView: TextView

    private var tokenRegistrationSucceeded = false

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            lifecycleScope.launch { refreshReadiness() }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        emailInput = findViewById(R.id.email_input)
        passwordInput = findViewById(R.id.password_input)
        signInButton = findViewById(R.id.sign_in_button)
        signOutButton = findViewById(R.id.sign_out_button)
        permissionButton = findViewById(R.id.notification_permission_button)
        statusView = findViewById(R.id.status_view)

        signInButton.setOnClickListener { signIn() }
        signOutButton.setOnClickListener { signOut() }
        permissionButton.setOnClickListener { requestNotificationPermission() }

        lifecycleScope.launch {
            bootstrap()
        }
    }

    override fun onResume() {
        super.onResume()
        lifecycleScope.launch {
            refreshReadiness()
        }
    }

    private suspend fun bootstrap() {
        val supabase = OrientSupabase.get(this)
        if (supabase.hasAuthenticatedSession()) {
            ensureFcmTokenCached()
            tokenRegistrationSucceeded =
                DeviceTokenRegistrar(supabase, FcmTokenStore(this)).reconcile()
        }
        refreshReadiness()
    }

    private fun signIn() {
        val email = emailInput.text?.toString().orEmpty()
        val password = passwordInput.text?.toString().orEmpty()
        lifecycleScope.launch {
            statusView.text = getString(R.string.status_signing_in)
            runCatching {
                OrientSupabase.get(this@MainActivity).signIn(email, password)
                ensureFcmTokenCached()
                tokenRegistrationSucceeded =
                    DeviceTokenRegistrar(
                        OrientSupabase.get(this@MainActivity),
                        FcmTokenStore(this@MainActivity),
                    ).reconcile()
            }.onFailure {
                tokenRegistrationSucceeded = false
                statusView.text = getString(R.string.status_sign_in_failed)
            }
            refreshReadiness()
        }
    }

    private fun signOut() {
        lifecycleScope.launch {
            val supabase = OrientSupabase.get(this@MainActivity)
            val registrar = DeviceTokenRegistrar(supabase, FcmTokenStore(this@MainActivity))
            registrar.deleteCurrentTokenBestEffort()
            runCatching { supabase.signOut() }
            tokenRegistrationSucceeded = false
            refreshReadiness()
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            lifecycleScope.launch { refreshReadiness() }
            return
        }
        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    private suspend fun ensureFcmTokenCached() {
        if (!isGoogleServicesConfigured()) return
        runCatching {
            val token = FirebaseMessaging.getInstance().token.await()
            FcmTokenStore(this).save(token)
        }
    }

    private suspend fun refreshReadiness() {
        val supabase = OrientSupabase.get(this)
        val authenticated = supabase.hasAuthenticatedSession()
        val tokenPresent = FcmTokenStore(this).read() != null
        val readiness =
            NativePulseReadiness(
                authenticated = authenticated,
                notificationPermissionGranted = hasNotificationPermission(),
                fcmTokenPresent = tokenPresent,
                tokenRegistrationSucceeded = authenticated && tokenRegistrationSucceeded,
            )
        statusView.text =
            if (readiness.isReady) {
                getString(R.string.status_ready)
            } else {
                getString(
                    R.string.status_not_ready,
                    bool(readiness.authenticated),
                    bool(readiness.notificationPermissionGranted),
                    bool(readiness.fcmTokenPresent),
                    bool(readiness.tokenRegistrationSucceeded),
                )
            }
        signInButton.isEnabled = !authenticated
        signOutButton.isEnabled = authenticated
        emailInput.isEnabled = !authenticated
        passwordInput.isEnabled = !authenticated
    }

    private fun hasNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun bool(value: Boolean): String = if (value) "yes" else "no"

    private fun isGoogleServicesConfigured(): Boolean {
        return try {
            Class.forName("com.google.firebase.messaging.FirebaseMessaging")
            resources.getIdentifier("google_app_id", "string", packageName) != 0
        } catch (_: Throwable) {
            false
        }
    }
}
