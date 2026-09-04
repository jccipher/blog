# LATENTX digest contract

Read this file whenever creating or updating a daily digest in this repository.

## File pair

Use one shared slug for both languages:

```text
_posts/YYYY-MM-DD-ai-blog-digest-YYYY-MM-DD.md
_posts/YYYY-MM-DD-ai-blog-digest-YYYY-MM-DD-zh.md
```

If the pair already exists for the current Shanghai calendar date, update it rather than creating a numbered variant. Stop if either path belongs to a non-digest article or the pair is incomplete in a way that cannot be repaired confidently.

## Front matter

The English file must follow this shape:

```yaml
---
layout: post
title: "AI Lab Dispatch: YYYY-MM-DD — concise theme"
date: YYYY-MM-DD 05:00:00 +0800
lang: en
slug: ai-blog-digest-YYYY-MM-DD
permalink: /posts/ai-blog-digest-YYYY-MM-DD/
translation_url: /zh/posts/ai-blog-digest-YYYY-MM-DD/
categories: [AI, Industry Digest]
tags: [Anthropic, OpenAI, AI Research]
reading_time: 8
description: "One factual sentence describing this digest."
sources:
  - publisher: Anthropic
    title: "Exact source title"
    url: "https://claude.com/blog/example"
    published_at: "YYYY-MM-DD"
    official_zh_url: null
    reuse_policy: summary-only
---
```

The Chinese file uses the same `date`, `slug`, `sources`, categories, tags, and source titles/URLs, with:

```yaml
lang: zh
permalink: /zh/posts/ai-blog-digest-YYYY-MM-DD/
translation_url: /posts/ai-blog-digest-YYYY-MM-DD/
```

Translate the post title and description naturally. Preserve exact original source titles in `sources` so deduplication is stable. If there is an official Chinese edition, set `official_zh_url` to its canonical HTTPS URL in both files.

For explicitly permitted full-text reuse, set `reuse_policy: full-text` and also add quoted `license_url` and `license_note` values. `license_note` must identify what permission covers and any required attribution. Do not use `full-text` when the permission does not cover redistribution, or when the Chinese post would require a translation that the permission does not allow.

When a run contains only one new publisher, list only that publisher and remove the absent publisher from `tags`.

Estimate `reading_time` from the finished post, rounded up, using roughly 220 English words per minute for English and 400 Chinese characters per minute for Chinese. A close, honest estimate is sufficient.

## Body structure

English:

```markdown
> A concise editorial deck in the LATENTX voice.

## Editorial summary

Original synthesis comes first.

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
> 与英文版含义一致的中文导语。

## 编辑摘要

原创中文综合摘要置于最前。

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
- Avoid generic praise, promotional filler, fabricated consensus, and claims about motives that the source does not establish.
- Link internally with the configured `/blog` base path only when referring to another LATENTX post. Store external canonical source URLs without tracking parameters.
- Do not hotlink source images. Add media only when its reuse terms are explicit and the asset is committed locally with attribution.
- Keep the two posts structurally parallel, but write idiomatic prose rather than sentence-by-sentence translation.
- The repository's required build gate is `npm run check`. The preview output is `_site/blog`.

Expected rendered paths:

```text
_site/blog/posts/ai-blog-digest-YYYY-MM-DD/index.html
_site/blog/zh/posts/ai-blog-digest-YYYY-MM-DD/index.html
```

The public paths are the same under `https://jccipher.github.io/blog`.
