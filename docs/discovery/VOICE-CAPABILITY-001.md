# VOICE-CAPABILITY-001 — Speech acquisition boundary

Date: 2026-10-04.

Baseline: `70d43cb2b34180ac393c790ca91aee22b33f93d9`.

This tranche decides where spoken words may become expression text. It does not implement voice, choose a provider, add a dependency, change General Capture, or change schema.

## Conclusion

**Primary-device dictation satisfies the established need.**

[../implementation/VOICE-PROBE-001A.md](../implementation/VOICE-PROBE-001A.md) passed on the user's Samsung Galaxy S26 Ultra. The phone keyboard's existing dictation placed spoken words in the Expression field as ordinary editable text. The user then kept a Note through the existing establishment act. No application speech stack was required.

That evidence is this phone and the need already stated: deliberate short speech, then inspectable expression text, then an explicit Note, Task, or nothing. It does not say every device behaves the same way. `getUserMedia`, `MediaRecorder`, Web SpeechRecognition, a transcription provider, stored audio, VoiceNote, VoiceTask, speech provenance, Android SpeechRecognizer, ML Kit, a native bridge, continuous listening, a wake word, and ambient listening stay out. They earn a place only if a later gap shows that ordinary dictation cannot meet an established need.

Before the probe, the conclusion of this discovery was **DEVICE PROBE REQUIRED.** The evaluation below is that record. The probe closes the open choice for this device.

The preference order used here is:

1. A capability the phone already has, with no new architecture.
2. A standards-based capability of the existing web application.
3. A thin server transcription adapter that leaves the application a web application.
4. A narrow native bridge.
5. A larger native application.

Keyboard dictation is the first candidate. Browser speech recognition and browser microphone capture are the second. Neither is accepted or rejected as the production mechanism until the phone shows what it actually does. Server transcription stays a contingent shape. Native speech recognition stays unauthorized. ML Kit is evaluated and not selected.

## Established product need

The user deliberately invokes capture, speaks a short natural expression while moving through real life, sees that expression as text, and may edit it. The existing establishment act then keeps one Note, creates one Task, or keeps nothing.

That need is already product law. [../decisions/2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md) requires low-friction capture while the user is moving, including through Work. Typed capture is not a substitute for it. Capture must take seconds. [../../PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md) records that, inside Work, the user notices needed work while walking a department and currently holds it in memory. The probe later showed that keyboard dictation meets this need on the primary phone.

The need is one deliberate, short, foreground utterance. It is not continuous listening, a wake word, ambient monitoring, an assistant conversation, automatic Task creation, automatic Note creation, automatic scheduling, or background capture.

## Current semantic boundary

The semantic problem is already solved. [../decisions/2026-10-04-capture-establishment-contract.md](../decisions/2026-10-04-capture-establishment-contract.md) and [../implementation/TYPED-GENERAL-CAPTURE-001.md](../implementation/TYPED-GENERAL-CAPTURE-001.md) fix the downstream contract:

```text
speech
  -> transcription
  -> expression text
  -> existing human-establishment boundary
  -> Note, Task, or nothing
```

Expression is transient interaction text. Typed text and transcribed text are the same expression once both are text. The capture mechanism is not stored. Speech and transcription have no authority to write a Note, a Task, or any temporal fact. A transcription failure produces no expression and no canonical fact. The user inspects and may edit the text before "Keep as a note," "This is a task," or Leave.

[../implementation/TYPED-GENERAL-CAPTURE-001.md](../implementation/TYPED-GENERAL-CAPTURE-001.md) proves that boundary with a provisional surface on Tasks. `domain/generalCapture.ts` holds the expression in page state. `components/GeneralCapture.tsx` binds it to an ordinary `<textarea id="general-expression">`. Typing calls no persistence. Reload, leaving Tasks, and Leave discard the expression. There is no voice, microphone, transcript store, or provider in that path. Tests in `domain/generalCapture.test.ts` and `components/generalCapture.test.tsx` keep speech APIs out of that code.

Runtime intelligence stays deterministic. [../decisions/2026-10-02-deterministic-intelligence.md](../decisions/2026-10-02-deterministic-intelligence.md) keeps AI, LLM, ML, and agentic inference out of canonical authority. A later transcription adapter may produce text. It may not establish meaning, and it may not call canonical persistence.

## What the repository currently is

| Fact | Evidence |
| --- | --- |
| One web application | Next.js App Router, React, TypeScript, Tailwind. [../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md). `package.json` dependencies are Supabase, Lucide, Next, React. No speech, media, or native package. |
| Phone and desktop, phone-first capture | Architecture: one web app, mobile-first styling, mobile viewport, manifest, home-screen metadata. Native mobile and watch applications are rejected. |
| Lived phone evidence | Samsung phone in Chrome, for temporal touch behavior, in [../implementation/V0-013A-PHONE-DIAGNOSTIC.md](../implementation/V0-013A-PHONE-DIAGNOSTIC.md), [../implementation/V0-014.md](../implementation/V0-014.md), and [../implementation/V0-015.md](../implementation/V0-015.md). Model, Android version, Chrome version, and display mode are not recorded. |
| Install surface | `app/manifest.ts`: name, short name, `start_url: "/"`, `display: "standalone"`, colors. No icons. `app/layout.tsx`: device-width viewport, `viewportFit: "cover"`, `appleWebApp.capable`. [../../README.md](../../README.md) says home-screen installability is incomplete where an icon is required. |
| Offline | Service worker, precache, and offline mutation queues are deferred. A cold start while offline is unsupported. No service worker file exists. |
| Deployment | Vercel from GitHub `main`. Browser talks to Supabase under row-level security. Next.js server is the place for secrets and future adapters. The hot path does not use that server today. |
| Authentication | One Supabase user. Email and password with a persisted session, so opening the phone app to capture does not wait on an email link. |
| Native artifacts | No Kotlin, Java, Gradle, TWA, or Android project. |
| Voice | No speech code, no microphone permission, no provider, no audio table. |

Phone-first in this repository means the web application is used on a phone. It does not mean a native application.

The name Samsung Galaxy S26 Ultra does not appear in the repository before this tranche. The Samsung/Chrome sessions above are not identified as that device. Nothing here establishes that phone's Android version, browser build, keyboard, speech-service packages, network on a store floor, or whether the deployed application is installed to the home screen.

## Evidence classes

Three kinds of statement are kept apart.

| Class | Meaning |
| --- | --- |
| Repository | Read from this codebase or its canon on the baseline above. |
| External platform | Public browser and Android documentation as of this tranche. It describes platforms in general. It does not describe this S26 Ultra. |
| Device unknown | Required before a production mechanism can be chosen. |

External platform notes used below:

- Can I Use records the Speech Recognition API as partial in Chrome, Chrome for Android, and Samsung Internet, and disabled by default in Firefox. Partial support is not a production warranty. Source: caniuse.com/speech-recognition, consulted 2026-10-04.
- Chromium on Android implements that API on top of `android.speech.SpeechRecognizer`. Continuous recognition is a known weak point: sessions end after silence, and Android builds have historically lacked reliable `continuous` behavior. Sources: Chromium `SpeechRecognitionImpl.java`; MDN browser-compat discussion of Chrome Android, including Chromium issue 41297427.
- Android `SpeechRecognizer` can check `isRecognitionAvailable` and, from API 31, `isOnDeviceRecognitionAvailable`. `createOnDeviceSpeechRecognizer` throws if on-device recognition is unavailable. Partial and final results are listener callbacks. `RECORD_AUDIO` is required. Source: developer.android.com/reference/android/speech/SpeechRecognizer.
- ML Kit GenAI speech recognition `1.0.0-alpha1` is alpha, with no SLA. Basic mode is documented for Android API 31 and higher and is described as similar to the platform recognizer. Advanced mode is documented for Pixel 10 and Pixel 11. Microphone streaming and partial and final text exist in that API. Source: developers.google.com/ml-kit/genai/speech-recognition/android, consulted 2026-10-04.

## Keyboard and system dictation

General Capture's expression control is a normal text area. Android supplies text to a focused field through the keyboard. Samsung Keyboard and Gboard can dictate into such a field on phones that have those keyboards. The page then sees ordinary input. It does not request a microphone permission of its own. The dictated characters are the expression. They can be edited. "Keep as a note," "This is a task," and Leave stay the establishment boundary.

This is useful immediately if the lived phone already dictates into that field. It is not an application speech feature. The application does not know that speech started or stopped, does not choose the recognizer, does not see partial results as a speech session, and does not control permission, language, or failure. The provider is whichever keyboard the phone uses. Consistency belongs to that keyboard.

What the product would gain: no new architecture, no app microphone permission, no audio in the application, no provider SDK, and text that is already inspectable. What it would lose: a single deliberate speech control inside the product, knowledge of start and stop, a chosen recognizer, and any claim that capture friction is the product's to design. The user must open the surface, focus the field, bring up the keyboard, and use that keyboard's microphone. Whether that sequence still takes seconds while walking is the operational question. A useful fallback and a production voice interaction are different claims. This tranche does not reject dictation for being simple. It also does not treat an untested keyboard button as proof that operational voice is done.

## Browser SpeechRecognition

The Web Speech recognition surface can, in browsers that implement it, start a session and return transcript text to the page, including interim results where the browser honors them. The page can feature-detect `SpeechRecognition` or `webkitSpeechRecognition`. TypeScript DOM typings, if present in a later toolchain, would not prove that the phone implements the API.

On the evidenced runtime family, Chrome on Android, external documentation says support is partial. The recognizer is the browser's, commonly backed by Android's speech service and often by a network recognizer. The application receives text. It does not own the engine, the audio after the browser takes it, or the vendor behind that engine. Installed-PWA behavior is a separate question from a Chrome tab, and this repository has no measurement of either for speech.

Judgment: not a production dependency. It may later be a device-tested adapter for one short utterance, if the S26 Ultra probe shows that a deliberate start returns editable final text often enough, with a clear error when it does not. It is rejected as an assumption. It is not rejected as an experiment.

## Browser audio capture

`navigator.mediaDevices.getUserMedia` and `MediaRecorder` are the standards-based way for this web application to acquire a short microphone recording while the page is in the foreground. Acquisition and transcription are separate. A recording is not expression text.

External Chromium behavior, still unverified on this phone:

- A secure context is required. The Vercel deployment is HTTPS, so that condition matches the architecture.
- The first use prompts for microphone permission. A user gesture is the safe way to start it.
- The page can hold samples in memory and discard them. Nothing in the current architecture requires an audio file, an audio column, or a transcript row.
- Chrome on Android commonly offers a WebM/Opus recorder. The exact type on this phone is unknown. A later server adapter would have to accept that type or transcode it. The domain would still see only text.
- A foreground, deliberate, few-second capture fits the product need. Background capture does not. There is no service worker. Android may suspend a page that is not visible. That limitation matches the refusal of ambient listening. It would block a design that recorded while the screen was locked.
- Installed standalone display is declared and not evidenced. Missing icons mean installability is already incomplete. Microphone behavior inside an installed icon, if one can be installed, is a device question.

Audio capture can be a viable acquisition layer for a later adapter. By itself it does not produce expression text, so it is not a complete voice mechanism.

## Server transcription

The compatible shape, if browser recognition is inadequate and keyboard dictation is not the production interaction, is:

```text
browser records a short utterance in memory
  -> authenticated request to a Next.js adapter
  -> transcription provider
  -> expression text returned to General Capture
  -> existing establishment act
```

[../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md) already places secrets and future provider adapters on the Next.js server, and already forbids provider types in `domain/`. The same rule would apply. General Capture would receive a string. No provider name, confidence, or audio would cross into Note or Task.

This avoids native code. It requires a network at the moment of speech. Latency is at least one upload plus one provider round trip, on top of the time taken to speak. Privacy: audio leaves the device for the server and the provider. The adapter can refuse to store the audio, refuse to log it, and discard it after the text returns. That preference is architectural. It is not a property of every provider. Authentication can reuse the existing signed-in session; a route that accepts audio must verify that session before it spends a provider credential. The credential stays server-side, never in `NEXT_PUBLIC_` and never in the repository. Providers stay interchangeable behind the adapter. Failure, including timeout, empty text, and provider error, returns no expression and writes nothing. Cost is a real surface even for one person if audio is retained or if sessions are long; short deliberate utterances keep it small only when audio is discarded and capture stays rare. No provider is chosen.

This shape is not selected now. Selecting it would skip the two earlier preference levels without phone evidence that they fail.

## Android SpeechRecognizer

A minimal native boundary could call the platform recognizer directly: availability checks, an explicit on-device recognizer where `isOnDeviceRecognitionAvailable` is true, partial and final callbacks, and `RECORD_AUDIO`. The application would receive text and could stop a session. On-device recognition, when the device actually has it, would keep audio off a transcription vendor. Lifecycle would be an Activity the product owned, still foreground for this need.

That capability is meaningful only after a web path has failed the production interaction. A PWA cannot call `SpeechRecognizer` itself. Chrome's own speech implementation already sits on that platform API, so a native bridge is not automatically a different recognizer. It becomes different if the probe shows the browser surface cannot start, stop, or return text reliably, or cannot use an on-device mode the platform would allow.

On-device availability on the S26 Ultra is not established. API 31 is a platform floor, not a promise that this Samsung build ships an on-device recognizer and a language pack.

## ML Kit speech recognition

Basic mode, as documented, targets Android API 31 and higher, can stream the microphone, and can emit partial and final text. The API is alpha. Advanced mode is documented for Pixel 10 and Pixel 11, so it does not cover the S26 Ultra even on the vendor's own page. Alpha maturity, a native dependency, and a GenAI stack are enough to leave it unselected. Gemini and AICore are not introduced because a speech demo exists. Transcription ML is still outside canonical authority if it only returns text, and that distinction does not make an alpha native SDK the smallest production boundary.

## Native bridge

Native packaging was rejected for the V0 architecture. Operational voice does not reopen that rejection by itself. The user having an Android phone, and Android having speech APIs, are not requirements.

A narrow native bridge would earn a place only if this production interaction cannot be met adequately by the web application:

> Deliberate short speech, while moving, becomes inspectable expression text in the existing establishment surface, with failure that writes nothing.

The capability gap that would justify it is one of these, shown on the S26 Ultra, not argued in advance:

- The installed or in-browser web surface cannot obtain a usable transcript for that short utterance.
- The only reliable transcript requires on-device platform recognition that the web surface cannot reach.
- Invocation through the web surface cannot stay a seconds-long deliberate act, and a platform entry the web application cannot provide is required for that act.

Haptics, notifications, lock-screen actions, widgets, and share intents are not this requirement. They stay out of this tranche even if a later bridge exists.

## Authority

Every mechanism above stops at expression text.

The text is not a Note, not a Task, not a temporal fact, and not a candidate with authority. Transcription may be wrong. The existing text area remains the inspection and edit surface. No speech provider, keyboard, browser, server, or native recognizer calls `createNote` or `createTask`. Confidence scores are not stored and are not authority. A voice-established Note remains the same Note as a typed one: `content` and `capturedAt` of the establishment act, with no provider, device, or mechanism field. That representation is [../decisions/2026-10-04-note-representation.md](../decisions/2026-10-04-note-representation.md).

## Privacy and data flow

Audio should be the least durable artifact that still returns text. This tranche creates no audio store and no transcript store. Audio is not retained for training, analytics, or debugging.

| Mechanism | Where audio exists | Durable? | Leaves the device? |
| --- | --- | --- | --- |
| Keyboard dictation | Keyboard and its recognizer. The page receives characters. | The page does not hold audio. The keyboard's recognizer may send audio to its own vendor. That path is outside the application. | The application transmits no audio. The keyboard might. |
| Browser SpeechRecognition | Browser and the recognizer it chooses. The page receives text events. | The page does not hold an audio file. Chrome's implementation is commonly network-backed. | Often yes, to the browser's speech service. Not under this application's storage policy. |
| Browser audio only | Browser memory for the duration of the utterance. | Transient if the buffer is discarded after stop. Not persisted by this architecture. | No, until some later adapter uploads it. |
| Browser audio plus server transcription | Browser memory, then the server request, then the provider. | Transient only if each hop discards audio after the text exists. A provider's retention policy is a separate contract and is not accepted here. | Yes. |
| Platform SpeechRecognizer | Native process and the recognition service. On-device mode, when available, can avoid a vendor upload. Network mode cannot. | Transient if the bridge keeps no file. | Depends on on-device versus network mode. Unverified on this phone. |
| ML Kit Basic | On-device process, as documented for that mode. | Would be a native footprint this tranche does not add. | Documented as on-device. Alpha, and not selected. |

Expression text that the user has not established remains page state, as it does for typing. Leaving or reloading discards it. Established text is the Note content or the Task title the user accepted. That is the existing write, not a speech record.

## Failure semantics

Voice failure stops before canonical establishment. The result is no canonical fact. The user can still type. The product does not write a failed-capture row, an empty Note, or an empty Task, and it does not retry speech on its own.

| Failure | Canonical result |
| --- | --- |
| Microphone permission denied | No expression from speech. No fact. Typing remains available. |
| Recognition unavailable | No expression from speech. No fact. |
| Network failure during transcription | No expression from speech. No fact. |
| Transcription error or empty text | No expression from speech. No fact. |
| User cancels speech | No new fact. Any unsent audio is discarded. Text already placed in the field, if the user leaves it there, stays ordinary expression until Leave, reload, or establishment. |
| User establishes after a successful transcript | The existing Note or Task write. One fact, or a visible write failure with no durable fact. |

An interrupted capture still loses its transient expression. That loss is already the contract.

## Capability matrix

Judgments are qualitative. "Unknown on device" means the S26 Ultra has not been measured.

| | Keyboard dictation | Browser SpeechRecognition | Browser audio + server transcription | Platform SpeechRecognizer | ML Kit | Native bridge |
| --- | --- | --- | --- | --- | --- | --- |
| Friction | Extra keyboard step. May already be fast. Unknown while walking. | One in-app control if the API works. Unknown. | One in-app control, plus upload wait. | Could be one control. Requires a native host. | Same, plus model download. | Justified only for a measured gap. |
| Production reliability | Mature OS feature. Untested in this field. | Partial browser support. Known Android session limits. Not production-ready as an assumption. | Acquisition is standard. Transcription quality depends on an unchosen provider and the network. | Mature platform API. Behavior depends on the OEM recognizer. | Alpha. No SLA. | No measured gap yet. |
| S26 Ultra | Unknown. | Unknown. Chrome Android is only partial in external tables. | Unknown. HTTPS and a foreground page are the architectural fit. | On-device availability unknown. | Advanced mode does not list this device. Basic mode is only "API 31+". | Not earned. |
| PWA compatibility | Uses the existing text area in whatever surface can focus it. | Only if that browser build exposes the API in that display mode. | `getUserMedia` is a browser API. Installed-icon behavior unverified. | Not available to a PWA. | Not available to a PWA. | Replaces or wraps the PWA. |
| Application control | None over the recognizer. Full control of establishment. | Start, stop, and language hints. Engine remains the browser's. | Full control of capture, upload, and discard. Provider remains behind an adapter. | Full control of the session if a bridge exists. | SDK control, vendor model. | Control of the gap that was measured. |
| Offline potential | Possible if the keyboard recognizes on device. Unknown. | Poor bet. Chrome's path is commonly networked. | No. | Possible only when on-device recognition is actually available. | Basic mode is documented on-device. Unverified here. | Same as the API it wrapped. |
| Privacy | Best application footprint. Keyboard vendor is uncontrolled. | Browser vendor often receives audio. | Application and provider both see audio unless the adapter is never built. | Best chance of on-device audio, if the check returns true. | On-device as documented. Alpha. | Depends on the bridge. |
| Network dependency | Application does not need a network for the keystrokes. Cold start of the app still does. Recognizer may. | Likely yes. | Yes. | Optional only with on-device mode. | Basic mode documented without a provider round trip. | Depends. |
| Implementation complexity | None. | Small adapter, high behavioral risk. | Server adapter, auth, discard policy, format handling. | A native host plus a bridge. | Native dependency on an alpha API. | At least a wrapper project. |
| Vendor coupling | Keyboard vendor. | Browser speech vendor. | Chosen transcription vendor, isolated in an adapter. | OEM or Google recognition service. | Google ML Kit, and AICore for advanced mode. | Whoever the bridge calls. |
| Transcript inspectable | Yes, in the existing field. | Yes, if events return text into that field. | Yes, after the response is placed in that field. | Yes, if the bridge returns text into that field. | Yes, in a native UI this product does not have. | Yes, only if it returns expression text. |
| Authority compatibility | Matches, because the text area is still the expression. | Matches if text is only expression. | Matches if the adapter returns only text. | Matches on the same condition. | Matches on the same condition, and still not selected. | Matches only if the bridge stops at expression text. |
| Operational adoption | Possible production path if the phone shows the walking interaction is fast enough. Unproven. | Optional experiment after a probe. Not the adoption mechanism by default. | Contingent path if web recognition fails and audio capture works. | Contingent path if the web application cannot meet the interaction. | Not suitable for adoption while alpha, and advanced mode misses this device. | Not suitable until a specific web failure is recorded. |

## Device facts and unknowns

Established about a Samsung phone, not established about an S26 Ultra:

- Temporal acceptance was done in Samsung Chrome.
- The application is a website with a manifest and no icons.
- Sign-in is a persisted email session.
- A cold load needs the network.

Unknown, and required:

- Whether the S26 Ultra is the phone those earlier sessions used.
- Android version, One UI version, Chrome version, and the default keyboard.
- Whether the user is in a Chrome tab, Samsung Internet, or an installed standalone icon.
- Whether dictation inserts text into `#general-expression`.
- How many gestures that takes, and whether it is usable while walking.
- Whether `SpeechRecognition` exists and returns a short final transcript in that same surface.
- Permission prompts, denial, cancellation, interruption, and silence.
- Invocation latency.
- Whether `getUserMedia` and `MediaRecorder` work there, and which audio type they produce.
- Whether `isOnDeviceRecognitionAvailable` would be true. A web probe cannot answer that. It stays unknown until a native diagnostic is justified.
- Floor network quality. The repository does not record it.

## Real-device probe

Architecture selection cannot be finished from the repository and the platform documents alone.

The next tranche is an observation, not a speech feature. It uses the deployed application and the existing General Capture field. It adds no package, no microphone API, no server route, no native project, and no persistence.

### VOICE-PROBE-001A — keyboard dictation on the S26 Ultra

On the phone, in the surface actually used for daily acceptance:

1. Record the browser name and version, Android version, and whether the application is a tab or an installed icon. If no installed icon exists, say that, and do not invent one.
2. Sign in with the existing session. Open Tasks. Open "Hold an experience." Focus Expression.
3. Dictate one short sentence with the keyboard's own microphone control. Record whether that control is present, how it is invoked, whether text appears in the field, whether it can be edited, and a rough sense of delay.
4. Cancel or dismiss dictation before any words land. Confirm the field is unchanged and that no Note or Task appears.
5. Dictate again, edit one word, and leave the surface. Confirm nothing was written.
6. Dictate again and establish one Note, then, separately, one Task, using the existing buttons. Confirm those writes are the same writes as typing.
7. If the phone can be put in airplane mode after the app is already open, try one dictation and record whether the keyboard still returns text. Skip this if it would sign the user out or destroy the session. Do not treat a failed cold start as a speech result.

Pass for this stage means: a short utterance becomes editable expression text, and establishment is still an explicit act. Passing does not by itself close operational voice. The walking-friction note from the same session decides whether dictation is the production interaction or only a fallback. That note is the user's observation of the gestures, not a new metric.

Failure of this stage, or a friction observation that the walking interaction is still too slow, authorizes the next probe. It does not authorize a provider or a native project.

### VOICE-PROBE-001B — disposable web diagnostic

Only after 001A. A temporary page, removed when the evidence is written down, may:

- show `display-mode`, and whether `SpeechRecognition` or `webkitSpeechRecognition` is present
- run one non-continuous recognition after a button press, show interim text, final text, and the error name, then stop
- after another button press, open the microphone, record a few seconds, show the media type and byte length, then discard the buffer
- write no Note, no Task, no audio, and no transcript row
- upload nothing

The diagnostic is not the voice UI. If it is built, it leaves the repository when the observation is recorded, the same way the V0-013A readout was retired.

A native availability check for on-device `SpeechRecognizer` is not part of 001B. It waits until 001A and 001B show that the web application cannot supply expression text.

## What this does not choose

No production conclusion of "PWA sufficient," "PWA sufficient with server transcription," or "native capability justified." The product decision is not missing: the interaction and the authority boundary are already decided. The missing piece is device evidence. That is why the conclusion is device probe required, not blocked.

## Exact next tranche

VOICE-PROBE-001A, as specified above. No implementation in this repository until that observation exists. VOICE-PROBE-001B stays conditional.

## Later

[../implementation/VOICE-PROBE-001A.md](../implementation/VOICE-PROBE-001A.md) records the pass. Keyboard dictation is the production acquisition path for the established need on the primary phone. VOICE-PROBE-001B is not authorized. Operational adoption remains open because the rest of the production contract, including the production experience, is still open.

## Contradictions

Historical sentences and current canon disagree, and the current canon already wins:

- [FOUNDATION-002](FOUNDATION-002.md) said explicitly actionable speech creates a Task immediately, and uncertain speech keeps a transcript. [../decisions/2026-10-04-capture-establishment-contract.md](../decisions/2026-10-04-capture-establishment-contract.md) is the later contract: speech establishes nothing, and the expression is transient rather than a stored transcript. Living documents follow the contract. The historical ledger is not rewritten.
- [../decisions/2026-10-02-boundaries-and-delivery.md](../decisions/2026-10-02-boundaries-and-delivery.md) called voice a future producer of text for first use. [../decisions/2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md) already supersedes that gate and still chooses no provider. This discovery does not reopen it.
- Architecture rejects a native application and a speech provider, while adoption requires voice. Those statements fit together: voice is required, and neither a vendor nor a native host is justified by that requirement alone.
- The manifest asks for standalone display, and the README records that missing icons leave installability incomplete. Both are true. Speech behavior must be probed in the surface that actually opens, which may be a browser tab.
- Deterministic runtime authority excludes a model from deciding meaning. A transcription engine that only returns expression text sits outside that authority. That permission does not select ML Kit, a language model, or a speech vendor.

No contradiction inside the typed General Capture implementation was found. Expression remains transient. Establishment remains explicit. Speech code remains absent.
