---
name: nightly-blog-pipeline
description: Prepare and deliver LATENTX bilingual summaries and optional summary audio through a local, offline-model nightly pipeline. Use for its 01:00–05:30 schedule, preview, setup, recovery, or acceptance testing; publication requires separate human approval.
---

# Nightly Blog Pipeline

Run the project's free local workflow; do not substitute paid model APIs. Read [references/operations.md](references/operations.md) before setup, previews, activation, or recovery. Configuration lives in `config.json`; reusable execution logic is under `scripts/`.

## Non-negotiable operating rules

- Use Asia/Shanghai. Background work runs from 01:00 to 05:30; text upload starts at 05:00. Start no new delivery at or after 05:25. A late wake outside the window exits instead of catching up in daytime.
- Every newly initiated daytime manual test requires a new explicit human confirmation. There is no limit on how often the human may approve tests, but no standing daytime permission. The CLI consumes an expiring `one-preview-run` receipt; never generate a new receipt without a corresponding human confirmation. A user-approved development/test session may include its automated verification steps. Do not carry that approval into a later session or scheduled production.
- A CLI test exception is preview-only, never upload authorization. A separately human-approved manual GitHub publication uses the exact-commit, expiring one-run workflow gate described in operations; never save it in recurring configuration. Program checks, child process timeouts and the outer watchdog enforce the deadline. Stage estimates are not success guarantees. Until the user explicitly changes the hard boundary, retries cannot run past 05:30.
- Preserve the existing fetch policy: 45-second request timeout, at most 20 total attempts, exactly 120 seconds between timeout retries. Non-timeout errors fail immediately. A deadline may prevent starting another attempt; do not replace a retry wait with busy polling.
- Fetch exactly seven NEW eligible articles per source per prefetch batch; existing queue entries do not count toward seven. Preserve independent source posts and the date-folder queue. Only summaries are bilingual and narrated; source text stays in its original language and follows the existing reuse contract.
- Priority: next publication's bilingual text, its two audio languages, previously published missing audio, then future queued dates in order. Downloads can run alongside a single serialized compute queue. All normal inference is offline against pinned local model revisions.
- Publish one article per source daily, each with English and Chinese summary text. Missing audio must never block text, remove text, or cause the article to be republished. Attach audio independently when ready within the allowed window.
- Published text is never automatically deleted or rewritten. Audio binaries never enter Git history. Retain at least the latest seven calendar days by actual article publication date; retain older audio while below budget. Under pressure evict oldest unprotected audio only. If protected audio itself exceeds budget, report an audio-capacity block and continue text.
- Preview artifacts stay under `.ai-blog/preview-queue` and `.ai-blog/preview-runs`; do not reserve production sources, change `_posts`, commit, push, or deploy during acceptance testing.

## Invocation

- Read-only plan: `npm run nightly -- plan`.
- Local preview: `npm run nightly -- preview`, adding `--approval-file PATH` only for the specifically human-approved daytime run.
- Deterministic verification: `npm run nightly -- test`; this invokes the policy tests, existing automation tests and site build.
- Model setup: `npm run nightly -- setup`; model downloads are a separate explicit setup operation, never an implicit synthesis side effect.
- Production: `npm run nightly -- run`, only after the user accepts tests and authorizes activation. The ignored production approval must bind the repository and exact configuration hash. Do not create it just because implementation was authorized.

Record each run as `YYYY-MM-DD_cron_task` in its local report. When a human invokes this through Codex, use that name for the task if requested; a native local runner does not pretend to create a Codex chat.

Report text delivery, each audio language, prefetch, deployment verification, capacity changes and deferred work separately. A local commit, push, successful workflow and verified public URL are different states. Never claim an untested activation or a mock delivery reached GitHub.
