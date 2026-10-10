# Orient Android Pulse perception edge

Package: `com.teamlab.orient`

Android is a perception endpoint for already-established `pulse_occurrences`.
It does not evaluate grants, timing, or Pulse truth.

**Rule:** no authoritative reread ⇒ no perception claim.

## Human config (local-only)

1. Copy `local.properties.example` → `local.properties` and set:
   - `sdk.dir`
   - `ORIENT_SUPABASE_PUBLISHABLE_KEY` (public publishable/anon key only)
2. Place Firebase client config at:

```
android/app/google-services.json
```

That file is gitignored on this public repository. Do not paste its contents into chat.

## Build / test

```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home
./gradlew test
# Device/APK build requires google-services.json:
./gradlew assembleDebug
```

## Wear OS (`:wear`)

Headless Watch Pulse perception edge (`applicationId` `com.teamlab.orient`).

After phone claim, `:app` forwards `{pulse_occurrence_id}` via MessageClient path
`/orient/pulse/express` to capability `orient_pulse_perception`. Watch dedupes in
SQLite and expresses one 40ms `USAGE_NOTIFICATION` haptic.

```bash
./gradlew :wear:test :wear:assembleDebug
```

Do not install or physically accept wrist perception from this README alone.
See [docs/implementation/ORIENT-WEAR-PULSE-BRIDGE-002.md](../docs/implementation/ORIENT-WEAR-PULSE-BRIDGE-002.md).
