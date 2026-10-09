package com.teamlab.orient.contract

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class TokenReconcilePolicyTest {
    @Test
    fun requiresSessionAndToken() {
        assertThat(TokenReconcilePolicy.shouldRegister(false, "token")).isFalse()
        assertThat(TokenReconcilePolicy.shouldRegister(true, null)).isFalse()
        assertThat(TokenReconcilePolicy.shouldRegister(true, "  ")).isFalse()
        assertThat(TokenReconcilePolicy.shouldRegister(true, "abc")).isTrue()
    }

    @Test
    fun convergesRegardlessOfArrivalOrder() {
        var session = false
        var token: String? = null

        fun ready() = TokenReconcilePolicy.shouldRegister(session, token)

        assertThat(ready()).isFalse()
        token = "fcm-1"
        assertThat(ready()).isFalse() // token first
        session = true
        assertThat(ready()).isTrue()

        session = false
        token = null
        session = true
        assertThat(ready()).isFalse() // session first
        token = "fcm-2"
        assertThat(ready()).isTrue()
    }
}
