# P0-INTEGRITY-001 — Complete temporal reads

Date: 2026-10-03.

Baseline: `ad8730c9d24cff66118ca1c9728fd4ef3d0c5721`.

## Rule

Absence of data is not failure to retrieve data.

A projection or surface may claim that nothing established matches only when every required source read completed. A partial page is a failed read. It is not partial truth.

`projectCurrentTemporalOrientation` stays a pure reading of the rows it is given. It does not model transport failure. `composeCurrentTemporalReading` owns that decision for This time.

## Reads

Protected Time, Blocks, and Commitments are ordered by `starts_on`, then `created_at`, then `id`, and read with an exact count. Pages continue until the collected rows equal that count. A missing count, a changed count, a short page before the count, or a later page error throws. Earlier pages are not returned as success.

The page size is 1000, the same as `max_rows` in `supabase/config.toml`. Completeness is the reported count, not an assumed cap.

Work schedule rows stay inside the caller's inclusive civil-date range. `work_on` is unique per user, so that column is the order. The same complete-read rule applies inside that range. Historical Work rows outside the range are not loaded.

This time and the day canvas ask for the previous civil date through the relevant date. Timed truth continues at most into the next civil date, so that window is the whole look-behind. The manage lists ask from the previous civil date forward, because past rows before that date are already outside the list projection. The open future is paged.

## Surfaces

This time is rendered only when Work, Protected Time, Blocks, and Commitments all succeed. If any of them fails, the surface says the reading could not be completed and names the failed source. It does not show the successful subset, and it does not say that nothing established contains this time.

A successful empty source stays empty. It does not become a failure.

The day canvas already leaves the day unpainted when a load throws. The loaders now throw when a collection is incomplete, and each collection is limited to the day window. Timeline still decides which supplied facts meet the day.

No temporal meaning changed.
