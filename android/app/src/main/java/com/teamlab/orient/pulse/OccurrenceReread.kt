package com.teamlab.orient.pulse

import com.teamlab.orient.auth.OrientSupabase
import com.teamlab.orient.contract.OccurrenceRereadResult
import com.teamlab.orient.contract.PulseOccurrenceId
import com.teamlab.orient.contract.PulseRelationship
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Authoritative reread under the normal user JWT.
 * RLS is ownership. Relationship truth comes from the occurrence row, never FCM.
 */
class OccurrenceReread(
    private val supabase: OrientSupabase,
) {
    @Serializable
    private data class OccurrenceRow(
        val id: String,
        val relationship: String? = null,
        @SerialName("source_start_at")
        val sourceStartAt: String? = null,
    )

    suspend fun reread(occurrenceId: PulseOccurrenceId): OccurrenceRereadResult {
        if (!supabase.hasAuthenticatedSession()) {
            return OccurrenceRereadResult.NotVisible
        }

        PerceptionTrace.selectAttempted(occurrenceId.value)
        return try {
            val rows =
                supabase.client
                    .from(TABLE)
                    .select(Columns.list("id", "relationship", "source_start_at")) {
                        filter {
                            eq("id", occurrenceId.value)
                        }
                    }
                    .decodeList<OccurrenceRow>()

            val row = rows.firstOrNull()
            if (row == null) {
                PerceptionTrace.selectResult(
                    occurrenceId = occurrenceId.value,
                    visible = false,
                    relationshipToken = null,
                    error = null,
                )
                return OccurrenceRereadResult.NotVisible
            }

            val visibleId = PulseOccurrenceId.parse(row.id)
            if (visibleId == null) {
                PerceptionTrace.selectResult(
                    occurrenceId = occurrenceId.value,
                    visible = false,
                    relationshipToken = row.relationship,
                    error = null,
                )
                return OccurrenceRereadResult.NotVisible
            }

            val relationship = PulseRelationship.parse(row.relationship.orEmpty())
            val sourceStartAt = row.sourceStartAt?.trim().orEmpty()
            if (relationship == null || sourceStartAt.isEmpty()) {
                PerceptionTrace.selectResult(
                    occurrenceId = occurrenceId.value,
                    visible = true,
                    relationshipToken = row.relationship ?: "missing",
                    error = null,
                )
                PerceptionTrace.relationshipUnrecognized(occurrenceId.value, row.relationship)
                return OccurrenceRereadResult.VisibleUnrecognizedRelationship(visibleId)
            }

            PerceptionTrace.selectResult(
                occurrenceId = occurrenceId.value,
                visible = true,
                relationshipToken = relationship.wireToken,
                error = null,
            )
            OccurrenceRereadResult.Visible(
                occurrenceId = visibleId,
                relationship = relationship,
                sourceStartAt = sourceStartAt,
            )
        } catch (error: Throwable) {
            PerceptionTrace.selectResult(
                occurrenceId = occurrenceId.value,
                visible = false,
                relationshipToken = null,
                error = error,
            )
            OccurrenceRereadResult.TransientFailure
        }
    }

    companion object {
        const val TABLE = "pulse_occurrences"
    }
}
