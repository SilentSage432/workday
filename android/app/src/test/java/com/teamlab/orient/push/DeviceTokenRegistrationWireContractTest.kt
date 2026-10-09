package com.teamlab.orient.push

import com.google.common.truth.Truth.assertThat
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Test

/**
 * Protects against "Kotlin object has platform, wire JSON omits it" under
 * PostgREST/supabase-kt encodeDefaults=false serialization.
 */
class DeviceTokenRegistrationWireContractTest {
    private val wireJson = DeviceTokenRegistrar.postgrestWireJson

    @Test
    fun productionWriteBodyContainsRequiredFieldsAndOmitsUpdatedAt() {
        val body =
            DeviceTokenRegistrar.encodeWriteBody(
                userId = "11111111-1111-1111-1111-111111111111",
                fcmToken = "test-fcm-token-value",
            )
        val obj = wireJson.parseToJsonElement(body) as JsonObject

        assertThat(obj.keys).containsExactly("user_id", "fcm_token", "platform")
        assertThat(obj["user_id"]!!.jsonPrimitive.content)
            .isEqualTo("11111111-1111-1111-1111-111111111111")
        assertThat(obj["fcm_token"]!!.jsonPrimitive.content).isEqualTo("test-fcm-token-value")
        assertThat(obj["platform"]!!.jsonPrimitive.content)
            .isEqualTo(DeviceTokenRegistrar.PLATFORM_ANDROID)
        assertThat(obj.containsKey("updated_at")).isFalse()
    }

    @Test
    fun legacyDefaultValuedPlatformIsOmittedUnderEncodeDefaultsFalse() {
        // Documents the BRIDGE-006A failure mode this correction closes.
        @Serializable
        data class LegacyBrokenRow(
            @SerialName("user_id") val userId: String,
            @SerialName("fcm_token") val fcmToken: String,
            val platform: String = DeviceTokenRegistrar.PLATFORM_ANDROID,
        )

        val legacyJson =
            Json {
                encodeDefaults = false
                ignoreUnknownKeys = true
            }
        val body =
            legacyJson.encodeToString(
                LegacyBrokenRow.serializer(),
                LegacyBrokenRow(
                    userId = "11111111-1111-1111-1111-111111111111",
                    fcmToken = "test-fcm-token-value",
                ),
            )
        val obj = legacyJson.parseToJsonElement(body) as JsonObject

        assertThat(obj.containsKey("platform")).isFalse()
        assertThat(obj.keys).containsExactly("user_id", "fcm_token")
    }

    @Test
    fun safeFailureSummaryExposesOperationClassAndStatusWithoutSecrets() {
        val error =
            object : Exception("SENSITIVE_BODY_MUST_NOT_APPEAR") {
                // anonymous subclass for class name stability in summary
            }
        val summary = DeviceTokenRegistrar.safeFailureSummary("insert", error)

        assertThat(summary).contains("device_token_insert")
        assertThat(summary).contains("failed class=")
        assertThat(summary).doesNotContain("SENSITIVE_BODY_MUST_NOT_APPEAR")
        assertThat(summary).doesNotContain("password")
        assertThat(summary).doesNotContain("Bearer ")
        assertThat(summary).doesNotContain("eyJ")
    }
}
