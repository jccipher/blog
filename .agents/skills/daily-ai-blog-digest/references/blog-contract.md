# LATENTX independent AI post contract

Read this file whenever creating or updating an AI blog post with this skill.

## One source, one bilingual pair

Every selected official source becomes an independent logical post represented by one English/Chinese file pair. A pair must contain exactly one `sources` entry and must never mix Anthropic and OpenAI material.

Derive `source-key` from the final path segment of the canonical source URL: lowercase it, replace non-alphanumeric runs with `-`, and trim `-`. Prefix it with the publisher so the slug stays unambiguous.

```text
slug: ai-blog-anthropic-SOURCE-KEY
_posts/YYYY-MM-DD-ai-blog-anthropic-SOURCE-KEY.md
_posts/YYYY-MM-DD-ai-blog-anthropic-SOURCE-KEY-zh.md

slug: ai-blog-openai-SOURCE-KEY
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

Translate the post title and description naturally. Preserve the exact original source title in `sources`. For OpenAI, use `ai-blog-openai-...` and tags `[OpenAI, AI Research]`. If there is an official Chinese edition, set `official_zh_url` to its canonical HTTPS URL in both files.

For explicitly permitted full-text reuse, set `reuse_policy: full-text` and also add quoted `license_url` and `license_note` values. `license_note` must identify what permission covers and any required attribution. Do not use `full-text` when the permission does not cover redistribution, or when the Chinese post would require a translation that the permission does not allow.

Estimate `reading_time` from the finished post, rounded up, using roughly 220 English words per minute for English and 400 Chinese characters per minute for Chinese. A close, honest estimate is sufficient.

Use the actual Shanghai execution time for `date`; do not reuse the scheduled trigger time or assign a future timestamp. GitHub Pages may exclude future-dated posts even when the build succeeds.

## Body structure

English:

```markdown
> A concise source-specific editorial deck in the LATENTX voice.

## Editorial summary

Original analysis of this source comes first.

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

## 来源材料

### Publisher：Exact original title

- **发布日期：** YYYY 年 M 月 D 日
- **英文原文：** [阅读原文](canonical URL)
- **官方中文版：** [中文原文](official URL)  <!-- only when verified -->
- **转载说明：** 本文仅作摘要与出处标注，原文版权归 Publisher 所有。

#### 原文要点

中文转述；没有官方中文版时也不得冒充官方翻译。
```

When `reuse_policy` is `full-text`, replace the final coverage subsection with an accurately labeled full-text section and reproduce the required license notice in both languages. Preserve the editorial summary as the opening section.

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
