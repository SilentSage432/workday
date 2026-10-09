package com.teamlab.orient.contract

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class ExpressionClaimGateTest {
    @Test
    fun onlySuccessfulClaimMayExpress() {
        assertThat(ExpressionClaimGate.mayExpress(ExpressionClaimResult.Claimed)).isTrue()
        assertThat(ExpressionClaimGate.mayExpress(ExpressionClaimResult.AlreadyClaimed)).isFalse()
    }
}
