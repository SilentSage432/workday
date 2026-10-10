package com.teamlab.orient.wear

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.teamlab.orient.wear.contract.ExpressionClaimResult
import com.teamlab.orient.wear.contract.PulseOccurrenceId

/**
 * Watch-local expression claims.
 * INSERT OR IGNORE on PRIMARY KEY(occurrence_id) before haptic.
 * Row means this watch already expressed — not human perception truth.
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
              expressed_at_epoch_ms INTEGER NOT NULL
            )
            """.trimIndent(),
        )
    }

    override fun onUpgrade(
        db: SQLiteDatabase,
        oldVersion: Int,
        newVersion: Int,
    ) {
        // First proof: no migrations yet.
    }

    fun tryClaim(
        occurrenceId: PulseOccurrenceId,
        expressedAtEpochMs: Long = System.currentTimeMillis(),
    ): ExpressionClaimResult {
        val values =
            ContentValues().apply {
                put("occurrence_id", occurrenceId.value)
                put("expressed_at_epoch_ms", expressedAtEpochMs)
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
        const val DB_NAME = "orient_wear_pulse_perception.db"
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
