---
layout: post
title: Reducing Cost and Improving Performance with Claude Platform
description: >-
  Anthropic's latest blog post outlines strategies for reducing costs and
  improving performance when using the Claude Platform. The article highlights
  three key fixes: maximizing prompt cache hit rates, removing anti-patterns
  from prompts when upgrading to frontier Claude models, and calibrating effort
  to the task. The guidance is integrated into the claude-api skill, and the
  article demonstrates how Claude Code can be used to identify and address
  inefficiencies.
date: '2026-09-17 05:39:54 +0800'
lang: en
slug: ai-blog-anthropic-reducing-cost-and-improving-performance-with-claude-platform
permalink: >-
  /posts/ai-blog-anthropic-reducing-cost-and-improving-performance-with-claude-platform/
translation_url: >-
  /zh/posts/ai-blog-anthropic-reducing-cost-and-improving-performance-with-claude-platform/
categories:
  - AI
  - Industry Digest
tags:
  - Anthropic
  - AI Research
reading_time: 2
run_mode: published
content_format: summary-source-v2
bilingual_scope: summary
sources:
  - publisher: Anthropic
    title: Reducing cost and improving performance with Claude Platform
    url: >-
      https://claude.com/blog/reducing-cost-and-improving-performance-with-claude-platform
    published_at: '2026-09-08'
    official_zh_url: null
    reuse_policy: summary-only
---
> Anthropic's blog post discusses methods to reduce costs and improve performance on the Claude Platform. It emphasizes prompt caching, removing anti-patterns from prompts, and calibrating effort. The claude-api skill is used to audit prompts and optimize cost. The article includes benchmarks showing cost reductions of up to 58% on various tasks.

## Editorial summary

Anthropic's blog post, 'Reducing Cost and Improving Performance with Claude Platform,' outlines three key strategies for optimizing cost and performance on the Claude Platform. First, maximizing prompt cache hit rates can significantly reduce input costs, as cache reads are billed at a fraction of the full input price. However, effective use of the prompt cache requires attention to several factors, including model-specific pinning, byte-exact prefixes, and limited time-to-live (TTL) constraints. The article provides practical tips, such as avoiding mid-conversation changes to effort or thinking settings, keeping volatile values out of the prompt prefix, and deferring rarely used tools to preserve cache efficiency.

Second, the article identifies common prompting 'anti-patterns' that hinder performance and increase costs when upgrading to frontier Claude models. These include verification rituals, emphasis boosters, mandatory procedures, stale examples, contradictory rules, and outdated configurations. The claude-api skill includes a prompt-audit command that identifies and removes these anti-patterns. Benchmarks show that removing these patterns can reduce costs by up to 14.6% and improve accuracy by 5.3%.

Third, the article discusses the calibration of 'effort,' which determines how hard Claude works on a task. Low effort can be more cost-effective than high effort, depending on the task. For example, on the FrontierCode Diamond benchmark, Claude Fable 5.1 at low effort outperforms Fable 5 at high effort at a third of the cost. The article also introduces the /claude-api hillclimb command, which iteratively improves cost and performance by testing different models, effort levels, and prompt configurations.

Finally, the article introduces the /claude-api cost-optimize command, which provides a comprehensive audit of token usage and identifies cost-saving opportunities. It recommends prompt caching, batching unattended work, and bounding output to reduce costs. Benchmarks show that cost-optimize can reduce costs by up to 58% on various tasks without significantly affecting performance. The article concludes with guidance on using these tools to optimize cost and performance in real-world applications.

---

> **Source boundary:** Source attribution follows. Only the summary is bilingual and narrated.

## Source material

### Anthropic: Reducing cost and improving performance with Claude Platform

- Published: 2026-09-08
- Original: [Reducing cost and improving performance with Claude Platform](https://claude.com/blog/reducing-cost-and-improving-performance-with-claude-platform)

Read the complete original at the official link. Original copyright remains with Anthropic.
