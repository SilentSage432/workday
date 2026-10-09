package com.teamlab.orient.pulse

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.teamlab.orient.contract.ExpressionClaimResult
import com.teamlab.orient.contract.PulseOccurrenceId

/**
 * Tiny SQLite table for atomic local expression claims.
 *
 * Why not DataStore: concurrent workers need transactional unique insert.
 * Why not Room/KSP: one-table proof stays smaller without annotation processing.
 *
 * INSERT OR IGNORE on PRIMARY KEY(occurrence_id) is the exactly-once gate.
 * Claim happens before notify/haptic.
 */
class ExpressionClaimDatabase(
    context: Context,
) : SQLiteOpenHelper(
        context.applicationContext,
        DB_NAME,
        null,
        DB_VERSION,
    ) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE $TABLE (
              occurrence_id TEXT PRIMARY KEY NOT NULL,
              claimed_at_epoch_ms INTEGER NOT NULL
            )
            """.trimIndent(),
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // First proof: no migrations yet.
    }

    fun tryClaim(
        occurrenceId: PulseOccurrenceId,
        claimedAtEpochMs: Long = System.currentTimeMillis(),
    ): ExpressionClaimResult {
        val values =
            ContentValues().apply {
                put("occurrence_id", occurrenceId.value)
                put("claimed_at_epoch_ms", claimedAtEpochMs)
            }
        val rowId =
            writableDatabase.insertWithOnConflict(
                TABLE,
                null,
                values,
                SQLiteDatabase.CONFLICT_IGNORE,
            )
        return if (rowId != -1L) {
            ExpressionClaimResult.Claimed
        } else {
            ExpressionClaimResult.AlreadyClaimed
        }
    }

    companion object {
        const val DB_NAME = "orient_pulse_perception.db"
        const val DB_VERSION = 1
        const val TABLE = "pulse_expression_claims"

        @Volatile
        private var instance: ExpressionClaimDatabase? = null

        fun get(context: Context): ExpressionClaimDatabase {
            return instance ?: synchronized(this) {
                instance ?: ExpressionClaimDatabase(context).also { instance = it }
            }
        }
    }
}
