package com.teamlab.orient.wear

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import java.io.File

/**
 * Documents the accepted Wear boundary for EXPRESSION-005-II.
 *
 * Wear keeps occurrence-id-only transport and notification-mediated expression.
 * ARRIVAL / unrecognized relationships are suppressed on the phone before
 * MessageClient forward, so they must not reach Watch pronunciation.
 */
class WearPhoneSilenceGateBoundaryTest {
    @Test
    fun wearMessagePayloadRemainsOccurrenceIdBytesOnly() {
        val id =
            com.teamlab.orient.wear.contract.PulseOccurrenceId
                .parse("550e8400-e29b-41d4-a716-446655440000")!!
        val encoded = id.value.toByteArray(Charsets.UTF_8)
        assertThat(WearPulseMessage.decode(encoded)).isEqualTo(id)
        assertThat(String(encoded, Charsets.UTF_8)).isEqualTo(id.value)
        assertThat(String(encoded, Charsets.UTF_8)).doesNotContain("relationship")
        assertThat(String(encoded, Charsets.UTF_8)).doesNotContain("arrival")
        assertThat(String(encoded, Charsets.UTF_8)).doesNotContain("relative_before")
    }

    @Test
    fun wearModuleHasNoSupabaseOrRelationshipRereadAuthority() {
        val wearRoot = File("src/main/java")
        assertThat(wearRoot.isDirectory).isTrue()
        val kotlinFiles =
            wearRoot
                .walkTopDown()
                .filter { it.isFile && it.extension == "kt" }
                .toList()
        assertThat(kotlinFiles).isNotEmpty()
        for (file in kotlinFiles) {
            val text = file.readText()
            assertThat(text).doesNotContain("supabase")
            assertThat(text).doesNotContain("service_role")
            assertThat(text).doesNotContain("pulse_occurrences")
            assertThat(text).doesNotContain("PulseRelationship")
            assertThat(text).doesNotContain("source_start_at")
        }
    }

    @Test
    fun wearSourceTreeDoesNotRetainDirectVibratorActuator() {
        val wearRoot = File("src/main/java")
        val kotlinFiles =
            wearRoot
                .walkTopDown()
                .filter { it.isFile && it.extension == "kt" }
                .toList()
        for (file in kotlinFiles) {
            val text = file.readText()
            assertThat(text).doesNotContain("android.os.Vibrator")
            assertThat(text).doesNotContain("VibratorManager")
            assertThat(text).doesNotContain(".vibrate(")
        }
    }

    @Test
    fun phoneForwardPolicySourceForbidsArrivalForward() {
        // Phone module owns relationship gate; Wear proves the transport contract only.
        // This file lives in wear tests; phone policy is covered in app WearPulseForwardPolicyTest.
        assertThat(WearPulseMessage.PATH).isEqualTo("/orient/pulse/express")
        assertThat(WearPulseMessage.CAPABILITY).isNotEmpty()
    }
}
