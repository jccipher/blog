# Setup, acceptance and activation

## Files and state

Skill code and configuration are versioned; all `.ai-blog` state is ignored. Do not stage model weights, raw official pages, preview posts, audio, credentials or host-specific activation files.

- `.ai-blog/queue/YYYY-MM-DD/*.md`: bilingual summaries assigned to that publication date. Audio and its hash/revision metadata are in the same date's `audio/` subdirectory.
- `.ai-blog/models/lock.json`: exact downloaded revisions and local paths. Reuse it, do not update weights on every run.
- `.ai-blog/nightly-state/`: production batch receipts, audio index, delivery recovery and `report.json`.
- `.ai-blog/preview-queue/RUN/` and `.ai-blog/preview-runs/RUN/`: isolated tests, not processed sources.
- `assets/audio-manifest.json`: small public metadata only. Release binaries are downloaded into the Pages build, verified by SHA-256, and copied into the served artifact. A failed audio download removes that player's build-time availability without blocking text.

The source fetcher directly reads official public HTML. HTTP anti-bot denial is not a timeout and the free offline runner has no paid web-reader fallback. Preserve the queue and report it; a human can inspect official content in a later authorized session.

## Dependencies

Apple Silicon, Python 3.12, Node 22+, ffmpeg/ffprobe and GitHub CLI are required. Create `.ai-blog/runtime/venv` and install the pinned `requirements.txt` there in an authorized window. Use `nightly.mjs setup` to download Qwen3-TTS CustomVoice 1.7B 8-bit and Qwen3-14B 4-bit. Both model families are Apache-2.0; MLX-Audio and MLX-LM are MIT. These are local models, not cloud endpoints. The summary engine uses MLX-LM to share the Apple-Silicon runtime with TTS.

The one-time downloads are several GB each. The initial test may need explicit GPU/network permission in the desktop sandbox. Do not diagnose a sandbox's unavailable Metal device as inadequate hardware. Dependencies and weights are local caches, not a permanent daytime service.

## Human-approved daytime testing

Only after fresh human confirmation, prepare an ignored JSON approval with `id` (unique), `scope: one-preview-run`, `human_confirmation` (the specific user authorization), and `expires_at` (no more than six hours away). Pass its path to ONE CLI invocation. The receipt is exclusive and cannot be reused from another run directory. Do not install this parameter in any scheduler or production approval. Repeated future manual tests are allowed, each with fresh confirmation.

`npm run nightly -- preview --approval-file PATH --max-audio 4` copies existing queued articles into a preview queue, narrates the next publication's four language variants, and builds a local overlay without changing `_posts`. Report failures honestly; a text-only preview is not evidence that TTS passed. Check `report.json`, play both languages, inspect pronunciation and source boundaries, and measure elapsed seconds plus encoded bytes.

Add `--published-date YYYY-MM-DD` to preview narration for an already published day's posts without adding or modifying text. This uses the same single-use test approval and isolated audio cache.

When the human separately authorizes a daytime GitHub release, perform that reviewed publication explicitly; never pass a preview exception to the production runner. Pages supports a single `workflow_dispatch` with `confirm_daytime`, the exact reviewed `approved_sha`, and `approved_until` at most two hours away. Supply these only after a fresh human confirmation. Defaults are empty/false; a normal daytime push skips deployment. This per-run approval is not a scheduling setting and must never appear in a recurring prompt.

Run `npm run test:nightly`, `npm run test:ai-blog-automation`, `npm run check`, skill validators and `git diff --check` within the approved development session. Unit tests use fake time/requests, never live timeout sleeps or GitHub deletion. Distinguish these from real synthesis and actual delivery. Preview artifacts never become processed sources.

## Capacity

Initial audio budget is a configurable conservative 600 MB; the whole Pages site budget is 850 MB. They are local safety budgets, not a claim of unlimited free hosting. Measure before accepting them. At 48 kbps mono, encoded payload is approximately 0.36 MB/minute; use actual ffprobe/file sizes for the report.

No age-only deletion. On successful deployment remove only assets absent from the new manifest and older than the protected seven-day range. Clean older managed Pages artifacts containing retired audio as well. Do not rewrite Git history. Local originals are retained, so remote audio can be regenerated/restored. A network outage can delay remote cleanup; report that rather than violating daytime limits.

## Production acceptance gate — not performed during implementation

1. Obtain human acceptance of real bilingual audio, article preview, tests and resource measurements, plus permission to push/activate.
2. Verify the intended remote and repository, dependencies, cached models, clean tracked worktree and main synchronization. Preserve unrelated untracked user documents.
3. Create the dedicated `blog-audio` release explicitly after approval (without committing binaries). Verify upload access; never create tags/releases just to test connectivity.
4. Create ignored `.ai-blog/production-approval.json` with `approved: true`, `repository`, `human_confirmation` and `config_sha256` (SHA-256 of parsed configuration serialized with JSON.stringify). Do not include any daytime exception. Optional Wiki publication requires separate `wiki: true` in this acceptance.
5. Replace the existing 03:00/05:00 Codex triggers only after acceptance, through the app's automation update tool. The legacy 07:17 GitHub generation schedule is removed by the reviewed code change; do not leave two owners running.
6. Use a native 01:00 launchd trigger for the local runner, following the provided template. Render its absolute paths for this host and register it only after acceptance. Do not register a permanent daytime job, run-at-load catch-up or unattended dependency updater. The runner refuses out-of-window starts and names local reports `YYYY-MM-DD_cron_task`. The existing Codex publication task may become a read-only 05:20 report task with the same daily chat naming; it must not fetch, infer or publish a second time. Keep the Mac awake and connected: a native trigger cannot guarantee execution while the machine is asleep.
7. Verify deployment and public text/audio URLs during the authorized publication window, or the specifically approved one-run manual publication. Do not run the scheduled production CLI with a daytime test exception.

## Recovery

If a process was forcibly killed, inspect `.ai-blog/nightly-run.lock` and its recorded PID before removing the stale lock. Never kill unrelated user processes. Completed MP3 plus checksum metadata can be reused; partial files are not playable candidates.

A complete prefetch batch is staged before promotion. Its daily receipt prevents selecting another seven during recovery. Inspect any interrupted promotion before publishing; never overwrite a conflicting queued date. A pending Git delivery records the commit before pushing. Recovery verifies remote state and reuses that commit rather than generating another post or force-pushing.

If 05:30 overrun semantics change, update the code and tests only after the user's explicit clarification; do not infer a permanent daytime exception from slow networks.
