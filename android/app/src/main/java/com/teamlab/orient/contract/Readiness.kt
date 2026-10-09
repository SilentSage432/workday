package com.teamlab.orient.contract

/**
 * Native Pulse readiness requires all four conditions.
 * No gamification — deterministic checklist only.
 */
data class NativePulseReadiness(
    val authenticated: Boolean,
    val notificationPermissionGranted: Boolean,
    val fcmTokenPresent: Boolean,
    val tokenRegistrationSucceeded: Boolean,
) {
    val isReady: Boolean
        get() =
            authenticated &&
                notificationPermissionGranted &&
                fcmTokenPresent &&
                tokenRegistrationSucceeded
}
