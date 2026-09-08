# LATENTX queued independent AI post contract

Read this file whenever creating or updating an AI blog post with this skill.

## One source, one bilingual pair

Every selected official source becomes an independent logical post represented by one English/Chinese file pair. A pair must contain exactly one `sources` entry and must never mix Anthropic and OpenAI material.

Derive `source-key` from the final path segment of the canonical source URL: lowercase it, replace non-alphanumeric runs with `-`, and trim `-`. Prefix it with the publisher so the slug stays unambiguous.

```text
slug: ai-blog-anthropic-SOURCE-KEY
.ai-blog/queue/YYYY-MM-DD/ai-blog-anthropic-SOURCE-KEY.md
.ai-blog/queue/YYYY-MM-DD/ai-blog-anthropic-SOURCE-KEY-zh.md
_posts/YYYY-MM-DD-ai-blog-anthropic-SOURCE-KEY.md
_posts/YYYY-MM-DD-ai-blog-anthropic-SOURCE-KEY-zh.md

slug: ai-blog-openai-SOURCE-KEY
.ai-blog/queue/YYYY-MM-DD/ai-blog-openai-SOURCE-KEY.md
.ai-blog/queue/YYYY-MM-DD/ai-blog-openai-SOURCE-KEY-zh.md
_posts/YYYY-MM-DD-ai-blog-openai-SOURCE-KEY.md
_posts/YYYY-MM-DD-ai-blog-openai-SOURCE-KEY-zh.md
```

If a matching pair already exists for the source, update it rather than creating a numbered variant. Stop if either path belongs to another source or the pair is incomplete in a way that cannot be repaired confidently.

## Preview and publication state

Every new pair must declare either:

```yaml
run_mode: preview   # local test only; never processed, staged, committed, or pushed
```

or:

```yaml
run_mode: published # production artifact eligible for Git publication
```

When building the processed URL set, ignore all `run_mode: preview` posts. Treat `run_mode: published` posts and legacy posts without `run_mode` as published. Promoting a preview requires changing both files to `published` and rerunning all gates.

## Ordered queue state

The queue folder date is the planned LATENTX publication date. It is deliberately separate from the official article's original publication date in `sources[].published_at`.

Every durable queue pair has identical values in both languages:

```yaml
run_mode: preview
queue_publish_date: YYYY-MM-DD
queue_status: queued
```

After the pair is copied into `_posts`, keep the queue files for auditability and change them to:

```yaml
queue_status: published
published_path: "_posts/YYYY-MM-DD-ai-blog-PUBLISHER-SOURCE-KEY.md" # language-specific
```

Published `_posts` files use `run_mode: published` and omit `queue_publish_date`, `queue_status`, and `published_path`.

The queue also has an ordered index at `.ai-blog/queue/queue.json`. Each publisher has its own array ordered by `scheduled_for`; entries record the canonical URL, title, status, and English/Chinese paths. The entire `.ai-blog` tree is local ignored runtime state and must not be committed.

Every run appends exactly seven new pairs per publisher. Assign them, newest source first, to the first seven unoccupied dates after that publisher's queue tail. Each date may contain at most one pair per publisher. A cold-start batch uses today and the following six days; later runs deliberately extend the queue by seven more dates. The trial may therefore grow the queue faster than it publishes it.

The unified 01:00–05:30 runner prepares queue files locally and starts text uploads at 05:00. Its publication phase consumes only the current Shanghai date folder. If that folder is empty for a publisher, the publication task may perform one seven-article fallback fetch for that publisher, assign the newest candidate to today, and append the remaining six after that publisher's queue tail before releasing today's pair.

Direct source fetches have one retry policy everywhere: a maximum of 20 total attempts, exactly 120 seconds between attempts caused by network timeouts, then abandonment. Official HTML and publisher-provided Markdown endpoints are valid cache inputs. HTTP errors, invalid metadata, unsupported content, authentication failures, and other non-timeout errors fail immediately instead of consuming the timeout retry budget.

An official anti-bot denial from the direct downloader is not a network timeout. When the same canonical page remains completely readable through Codex's web reader, the run may use that official content and persist the finished queue pair as the offline publication artifact. It must report that the raw cache is unavailable. Unofficial mirrors, copied pages, and authenticated-session workarounds are not acceptable fallbacks.

## Front matter

The English file must follow this shape:

```yaml
---
layout: post
title: "Concise source-specific English title"
date: YYYY-MM-DD HH:MM:SS +0800
lang: en
slug: ai-blog-anthropic-source-key
permalink: /posts/ai-blog-anthropic-source-key/
translation_url: /zh/posts/ai-blog-anthropic-source-key/
categories: [AI, Industry Digest]
tags: [Anthropic, AI Research]
reading_time: 8
description: "One factual sentence describing this source-specific post."
run_mode: preview
content_format: summary-source-v2
queue_publish_date: YYYY-MM-DD # queue files only
queue_status: queued           # queue files only
sources:
  - publisher: Anthropic
    title: "Exact source title"
    url: "https://claude.com/blog/example"
    published_at: "YYYY-MM-DD"
    official_zh_url: null
    reuse_policy: summary-only
---
```

The Chinese file uses the same `date`, `slug`, `run_mode`, `sources`, categories, tags, and source title/URLs, with:

```yaml
lang: zh
permalink: /zh/posts/ai-blog-anthropic-source-key/
translation_url: /posts/ai-blog-anthropic-source-key/
```

Only the summary, post title, description and editorial deck require both languages. Keep original source attribution/text in its source language; do not translate or narrate the original. Set `bilingual_scope: summary` on new pairs. Translate the post title and description naturally. Preserve the exact original source title in `sources`. For OpenAI, use `ai-blog-openai-...` and tags `[OpenAI, AI Research]`. If there is an official Chinese edition, set `official_zh_url` to its canonical HTTPS URL in both files.

`content_format: summary-source-v2` declares the visible two-part layout. Both language files must insert the exact horizontal-rule and source-boundary pattern shown below. Legacy posts without this field remain valid, but every newly prepared or released post must use it.

For explicitly permitted full-text reuse, set `reuse_policy: full-text` and also add quoted `license_url` and `license_note` values. `license_note` must identify what permission covers and any required attribution. Do not use `full-text` when the permission does not cover redistribution, or when the Chinese post would require a translation that the permission does not allow.

Estimate `reading_time` from the finished post, rounded up, using roughly 220 English words per minute for English and 400 Chinese characters per minute for Chinese. A close, honest estimate is sufficient.

For durable queue files, use their planned publication date at `01:00:00 +0800`; future dates are allowed because queue files are not Jekyll posts. On release, replace `date` with the actual Shanghai execution time. Do not reuse the scheduled trigger time or assign a future timestamp to `_posts`; GitHub Pages may exclude future-dated posts even when the build succeeds.

## Body structure

English:

```markdown
> A concise source-specific editorial deck in the LATENTX voice.

## Editorial summary

Original analysis of this source comes first.

---

> **Source boundary:** The section below contains a sourced paraphrase and attribution. Unless the metadata records explicit compatible permission, read the complete original at the official link.

## Source material

### Publisher: Exact original title

- **Published:** Month D, YYYY
- **Original:** [Read the article](canonical URL)
- **Official Chinese edition:** [中文原文](official URL)  <!-- only when verified -->
- **Reuse:** Summary and attribution; original copyright remains with Publisher.

#### What the original covers

An original, useful account of the source. This must be a paraphrase, not a close reconstruction.

> Optional quotation of at most 25 words, attributed and linked.
```

Chinese:

```markdown
> 与英文版含义一致、只讨论该来源的中文导语。

## 编辑摘要

该来源的原创中文分析置于最前。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### Publisher：Exact original title

- **发布日期：** YYYY 年 M 月 D 日
- **英文原文：** [阅读原文](canonical URL)
- **官方中文版：** [中文原文](official URL)  <!-- only when verified -->
- **转载说明：** 本文仅作摘要与出处标注，原文版权归 Publisher 所有。

#### 原文要点

新生成的文章无需再次翻译来源材料。保留原文语言的出处信息与链接；仅上方编辑摘要需要中英双语和语音。
```

When `reuse_policy` is `full-text`, keep the divider and the bold `Source boundary:` / `来源分界：` label, change the notice text to describe the verified full-text permission, replace the final coverage subsection with an accurately labeled full-text section, and reproduce the required license notice in both languages. Preserve the editorial summary as the opening section. Without such permission, the second part remains a clearly labeled paraphrase plus canonical source link; it must not reproduce the complete article or an unauthorized translation.

## Style and rendering

- Prefer a compact editorial voice: concrete opening, clear hierarchy, measured claims, practical implications.
- Keep the post focused on its single source. Cross-references to another LATENTX post are allowed only when useful and must not turn the two summaries back into one combined digest.
- Avoid generic praise, promotional filler, fabricated consensus, and claims about motives that the source does not establish.
- Link internally with the configured `/blog` base path only when referring to another LATENTX post. Store external canonical source URLs without tracking parameters.
- Do not hotlink source images. Add media only when its reuse terms are explicit and the asset is committed locally with attribution.
- Keep the two posts structurally parallel, but write idiomatic prose rather than sentence-by-sentence translation.
- The repository's required build gate is `npm run check`. The preview output is `_site/blog`.

Expected rendered paths for each pair:

```text
_site/blog/posts/SLUG/index.html
_site/blog/zh/posts/SLUG/index.html
```

The public paths are the same under `https://jccipher.github.io/blog`.

## Nightly audio and permanent text

Published text is never automatically deleted or rewritten. Missing audio must not block 05:00 text publication. Audio may be attached per language later in the allowed window. Cache summary-only audio in the planned date folder under `audio/`, recording text hash, model revision, voice, duration, bytes and audio hash. Never commit binaries into Git history.

At least the latest seven calendar days of audio by actual article publication date are protected. Keep older audio while under the configured budget; prune oldest unprotected audio only under capacity pressure. Preview artifacts never reserve or consume production sources. Every new daytime manual test requires fresh human confirmation; production runs cannot use an exception. See the sibling nightly skill for the single scheduler, runtime checks and human acceptance gate.
