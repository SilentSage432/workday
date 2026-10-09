package com.teamlab.orient.contract

/**
 * Deterministic race rule: session and FCM token must both exist before registration.
 */
object TokenReconcilePolicy {
    fun shouldRegister(hasAuthenticatedSession: Boolean, fcmToken: String?): Boolean {
        val token = fcmToken?.trim().orEmpty()
        return hasAuthenticatedSession && token.isNotEmpty()
    }

    fun normalizeToken(fcmToken: String?): String? {
        val trimmed = fcmToken?.trim().orEmpty()
        return trimmed.takeIf { it.isNotEmpty() }
    }
}
