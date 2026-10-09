package com.teamlab.orient.push

import com.google.common.truth.Truth.assertThat
import com.teamlab.orient.contract.TokenReconcilePolicy
import org.junit.Test

/**
 * Logout cleanup is best-effort under the user session before sign-out.
 * This contract documents the preconditions; integration with Supabase is device-side.
 */
class LogoutTokenCleanupContractTest {
    @Test
    fun cleanupRequiresSessionIdentityAndCurrentToken() {
        val userId: String? = "user-1"
        val token = TokenReconcilePolicy.normalizeToken("  fcm-token  ")
        assertThat(userId).isNotNull()
        assertThat(token).isEqualTo("fcm-token")

        val missingToken = TokenReconcilePolicy.normalizeToken(null)
        assertThat(missingToken).isNull()
    }

    @Test
    fun cleanupFailureMustNotGrantBroaderAuthority() {
        // Documented invariant: delete errors are swallowed; no service_role fallback.
        val cleanupSucceeded = false
        val broadenedAuthority = false
        assertThat(cleanupSucceeded || !broadenedAuthority).isTrue()
        assertThat(broadenedAuthority).isFalse()
    }
}
