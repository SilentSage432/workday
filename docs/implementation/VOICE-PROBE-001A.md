# VOICE-PROBE-001A — Primary-device dictation

Date: 2026-10-04.

Baseline: `69fe79b0f4cdea989ce8cc1b2fabc1c0b9f27049`.

## Classification

**PASS.**

The probe was performed on the user's Samsung Galaxy S26 Ultra, against the deployed application. No application code was added for it.

## What was observed

1. The user opened General Capture, "Hold an experience."
2. The user focused the Expression field.
3. The user used the phone keyboard's existing microphone.
4. Spoken language became ordinary text in that field.
5. The text stayed ordinary and editable before establishment.
6. The user chose "Keep as a note."
7. The application persisted that Note.

No application microphone, browser SpeechRecognition, transcription provider, native bridge, or audio storage was used. Typed and spoken characters meet at the same expression. The Note is the same Note a typed establishment would write. No origin field was added.

## Separate database incident

The first Note save met a missing production `public.notes` table. That was deployed schema state. It was not a failure of dictation. [NOTE-STORAGE-001A.md](NOTE-STORAGE-001A.md) corrected the migration syntax. That file was execution-tested, committed, pushed, and applied to the dedicated production database before the successful establishment above.

## What this pass is

On this phone, the established speech need is met:

```text
deliberate short speech
  -> editable expression text
  -> explicit human establishment as Note, Task, or nothing
```

The pass is this device and this need. It is not a claim about every phone. It is not operational adoption. [../decisions/2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md) still requires the rest of the production contract, including the production experience.

Browser audio capture, Web Speech, a transcription provider, stored audio, Android SpeechRecognizer, ML Kit, and a native bridge stay unused. A later gap that dictation cannot meet would be required before any of them earned a place. This probe did not find that gap. VOICE-PROBE-001B is not authorized.

## Experience evidence

These observations are for the later experience phase. They are not fixed here. No Notes surface, navigation, drawer, modal, or layout change follows from them.

### Revisitability

Immediately after the Note was kept, the user's reaction was effectively: "Where did the note go?"

The write succeeded. The current surface persists the Note and does not show a list of Notes. That matches the implemented contract. It also shows that a production experience cannot leave a retained experience with no earned way back to it.

A way to revisit is not a decision for folders, notebooks, tags, an inbox, a Notes tab, search, or archive. [../decisions/2026-10-04-note-revisit.md](../decisions/2026-10-04-note-revisit.md) later decides that way back: Capture has memory. [NOTE-REVISIT-001.md](NOTE-REVISIT-001.md) later proves it inside General Capture. This observation is unchanged. This probe did not build that return.

### Spatial continuity

Opening, pressing, expanding, or interacting with the current scaffold controls often moves the surrounding interface. The user finds that annoying.

Interaction should preserve spatial continuity. Revealing a control, establishing a fact, or changing interaction state should not unnecessarily displace the temporal territory or the object the user is touching. Something may still move when the meaning of the surface requires it. Incidental reflow should not keep forcing the hand and the attention to find a new place.

The final interaction structure stays unresolved. This sentence does not authorize a repair of the scaffold.
