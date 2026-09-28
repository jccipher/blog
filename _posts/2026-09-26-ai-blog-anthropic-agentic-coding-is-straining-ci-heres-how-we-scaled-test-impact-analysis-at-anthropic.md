---
layout: post
title: Agentic Coding Moves the Bottleneck From Writing Code to Scaling CI
date: '2026-09-28 07:53:00 +0800'
lang: en
slug: >-
  ai-blog-anthropic-agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic
permalink: >-
  /posts/ai-blog-anthropic-agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic/
translation_url: >-
  /zh/posts/ai-blog-anthropic-agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic/
categories:
  - AI
  - Industry Digest
tags:
  - Anthropic
  - AI Research
reading_time: 3
description: >-
  An analysis of Anthropic’s 25-fold CI growth, failed patches, and redesign of
  its test-impact analysis service.
run_mode: published
content_format: summary-source-v2
bilingual_scope: summary
sources:
  - publisher: Anthropic
    title: >-
      Agentic coding is straining CI. Here’s how we scaled test impact analysis
      at Anthropic
    url: >-
      https://claude.com/blog/agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic
    published_at: '2026-09-14'
    official_zh_url: null
    reuse_policy: summary-only
---

> When agents multiply code and pull requests, CI infrastructure inherits the exponential; Anthropic’s case shows why short-lived patches must give way to horizontally scalable state.

## Editorial summary

Anthropic reports that engineers now ship eight times as much code per quarter as in 2021–2025, with Claude authoring 80% of it. Tests grew tenfold and CI jobs rose 25-fold in six months, turning test selection into a new bottleneck.

The old service paired a listener that recorded results with a selector that chose relevant tests. Its single-process state model could not keep up. A larger machine, package sharding, and daily restarts bought 70 days, 29 days, and less than a day respectively, while stale results made test selection less trustworthy.

The redesign moved event history into an in-memory data store. Stateless listener workers append to a journal, a separate consumer rolls events into per-test history, and selectors query that state. Anthropic says one engineer completed the project in three weeks and that the backlog stayed flat after tuning.

The broader lesson is not simply to overprovision CI. Teams should measure inflow and outflow, externalize critical state, remove singleton dependencies, and design for an order-of-magnitude increase when agent throughput changes the economics of rebuilding systems. The performance numbers describe Anthropic's environment and are not universal forecasts.

---

> **Source boundary:** The section below contains a sourced paraphrase and attribution. Unless the metadata records explicit compatible permission, read the complete original at the official link.

## Source material

### Anthropic: Agentic coding is straining CI. Here’s how we scaled test impact analysis at Anthropic

- **Published:** September 14, 2026
- **Original:** [Read the article](https://claude.com/blog/agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic)
- **Reuse:** Summary and attribution; original copyright remains with Anthropic.

#### What the original covers

The original describes Anthropic’s growth in code, tests, and CI jobs; the listener/selector architecture of its deterministic test-impact service; three short-lived patches; and a redesign using stateless workers, a journal in an in-memory store, a roll-up consumer, and queryable per-test history.
