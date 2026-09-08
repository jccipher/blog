---
name: bilingual-blog-narrator
description: Generate offline English and Chinese audio for LATENTX editorial summaries, cache it in publication-date folders, and preview its player. Use for summary narration or missing-audio repair, not full-source narration or publication authorization.
---

# Bilingual Blog Narrator

Use the project's `nightly-blog-pipeline` runner, which owns the clock, lock and approval checks. Read its operations reference before setup or daytime tests. Do not bypass the runner by starting an unbounded model server.

- Narrate only the section headed `Editorial summary` / `编辑摘要`. Stop at the source divider or source-material heading. Missing boundaries are an error, never permission to read the entire original.
- Keep English and Chinese separate. Production defaults are Ryan (English) and Serena (Chinese), Qwen3-TTS CustomVoice 1.7B through MLX-Audio. Use no paid API and no voice cloning.
- Clean Markdown, omit code blocks, visual tables, raw URLs, navigation and attribution. Read link labels and apply `pronunciation.json` to technical abbreviations. Keep pronunciation changes versioned so the content hash invalidates the affected cache.
- Pinned model weights must already be local. Set the model job offline; missing weights require explicit setup in an allowed window, not an implicit download.
- Write MP3 plus metadata under the planned date's `audio/` directory. Cache identity includes summary, language, voice, model revision, encoding and extractor version. Verify SHA-256 before reuse. Partial output is never a ready asset.
- Prioritize the next publication's two language versions per publisher, then repair published missing audio, then pre-generate queued dates in order. One GPU-heavy operation at a time; network waiting can overlap computation.
- Preview results are isolated and do not reserve/consume sources. Every new daytime manual test requires fresh human approval; there is no numerical limit on human-approved tests and no persistent daytime exception.
- Text publication is independent. Each language's player appears only when that audio is ready. Audio failure neither deletes text nor causes a duplicate article.
- Retain at least seven calendar days of published audio, keeping older files until capacity pressure requires oldest-first cleanup. Never clean published text or audio still inside the protected period.

After real synthesis, report language, source, duration, bytes, model revision, caching behavior and errors; give local listening/preview links. Do not describe automated checks as proof of human-natural pronunciation. Human acceptance precedes activation and GitHub publication.
