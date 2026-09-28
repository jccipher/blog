---
layout: post
title: 'Long-Running Agents Need Procedures, Execution, and Memory Control'
date: '2026-09-28 07:53:00 +0800'
publication_date: '2026-09-24'
lang: en
slug: ai-blog-openai-skills-shell-tips
permalink: /posts/ai-blog-openai-skills-shell-tips/
translation_url: /zh/posts/ai-blog-openai-skills-shell-tips/
categories:
  - AI
  - Industry Digest
tags:
  - OpenAI
  - AI Research
reading_time: 3
description: >-
  A practical reading of OpenAI guidance on combining Skills, shell execution,
  compaction, and containment for long-running agents.
run_mode: published
content_format: summary-source-v2
bilingual_scope: summary
sources:
  - publisher: OpenAI
    title: >-
      Shell + Skills + Compaction: Tips for long-running agents that do real
      work
    url: 'https://developers.openai.com/blog/skills-shell-tips'
    published_at: '2026-02-11'
    official_zh_url: null
    reuse_policy: summary-only
---

> Skills tell an agent how to work, the shell lets it act, and compaction keeps the run alive; the useful unit is the governed combination, not any component alone.

## Editorial summary

OpenAI frames long-running agent work as the combination of three layers. Skills provide reusable procedures and routing rules, the shell supplies an execution environment, and compaction preserves the useful state of a run as the context window fills.

The article's strongest advice is operational. Skill descriptions should behave like routing logic, include negative cases, and keep templates dormant until invoked. Long runs should be designed around container reuse and compaction from the beginning rather than patched after context pressure appears.

Security is treated as part of the workflow design. Networking plus executable skills increases risk, so the guide recommends layered allowlists, scoped secrets, contained environments, and a clear artifact handoff boundary. It also distinguishes server-side automatic compaction from the explicit compact endpoint for applications that need control over timing.

These patterns are useful architecture guidance, not a guarantee that an agent will finish every long task. Reliability still depends on the skill's specificity, tool permissions, observable checkpoints, retry policy, and the host application's handling of partial results.

---

> **Source boundary:** The section below contains a sourced paraphrase and attribution. Unless the metadata records explicit compatible permission, read the complete original at the official link.

## Source material

### OpenAI: Shell + Skills + Compaction: Tips for long-running agents that do real work

- **Published:** February 11, 2026
- **Original:** [Read the article](https://developers.openai.com/blog/skills-shell-tips)
- **Reuse:** Summary and attribution; original copyright remains with OpenAI.

#### What the original covers

The original explains Skills as procedures, shell as execution, and compaction as continuity for long-running work. It offers ten implementation tips, three build patterns, guidance on server-side and explicit compaction, and security practices for network access, allowlists, secrets, containment, and artifact handoff.
