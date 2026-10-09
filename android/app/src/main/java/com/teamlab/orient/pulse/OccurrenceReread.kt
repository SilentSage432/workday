package com.teamlab.orient.pulse

import com.teamlab.orient.auth.OrientSupabase
import com.teamlab.orient.contract.OccurrenceRereadResult
import com.teamlab.orient.contract.PulseOccurrenceId
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.Serializable

/**
 * Authoritative reread under the normal user JWT.
 * RLS is ownership. No Commitment content for first proof.
 */
class OccurrenceReread(
    private val supabase: OrientSupabase,
) {
    @Serializable
    private data class OccurrenceRow(val id: String)

    suspend fun reread(occurrenceId: PulseOccurrenceId): OccurrenceRereadResult {
        if (!supabase.hasAuthenticatedSession()) {
            return OccurrenceRereadResult.NotVisible
        }

        PerceptionTrace.selectAttempted(occurrenceId.value)
        return try {
            val rows =
                supabase.client
                    .from(TABLE)
                    .select(Columns.list("id")) {
                        filter {
                            eq("id", occurrenceId.value)
                        }
                    }
                    .decodeList<OccurrenceRow>()

            val visible = rows.firstOrNull()?.id?.let { PulseOccurrenceId.parse(it) }
            if (visible != null) {
                PerceptionTrace.selectResult(
                    occurrenceId = occurrenceId.value,
                    visible = true,
                    error = null,
                )
                OccurrenceRereadResult.Visible(visible)
            } else {
                PerceptionTrace.selectResult(
                    occurrenceId = occurrenceId.value,
                    visible = false,
                    error = null,
                )
                OccurrenceRereadResult.NotVisible
            }
        } catch (error: Throwable) {
            PerceptionTrace.selectResult(
                occurrenceId = occurrenceId.value,
                visible = false,
                error = error,
            )
            OccurrenceRereadResult.TransientFailure
        }
    }

    companion object {
        const val TABLE = "pulse_occurrences"
    }
}
