---
layout: post
title: 'Claude''s Shared Memory: Continuity with User-Controlled Boundaries'
date: '2026-09-11 11:26:14 +0800'
lang: en
slug: ai-blog-anthropic-claudes-memory-works-everywhere-and-you-decide-whats-in-it
permalink: >-
  /posts/ai-blog-anthropic-claudes-memory-works-everywhere-and-you-decide-whats-in-it/
translation_url: >-
  /zh/posts/ai-blog-anthropic-claudes-memory-works-everywhere-and-you-decide-whats-in-it/
categories:
  - AI
  - Industry Digest
tags:
  - Anthropic
  - AI Research
reading_time: 4
description: >-
  An analysis of Claude's shared memory across chat and Cowork, its editing
  controls, sensitive-topic policy, and governance implications.
run_mode: published
sources:
  - publisher: Anthropic
    title: 'Claude''s memory works everywhere, and you decide what''s in it'
    url: >-
      https://claude.com/blog/claudes-memory-works-everywhere-and-you-decide-whats-in-it
    published_at: '2026-08-25'
    official_zh_url: null
    reuse_policy: summary-only
content_format: summary-source-v2
---

> Anthropic is making Claude's memory a shared layer across chat and Cowork. The product promise is continuity, but the design question is governance: what is retained, where it propagates, who can edit it, and which categories remain excluded.

## Editorial summary

Anthropic says Claude now uses the same memory in ordinary chat and Claude Cowork. Context learned in one surface can therefore influence work in the other: priorities discussed in chat can inform a Cowork task, while facts surfaced during a Cowork run can be available in later conversations. This reduces repeated briefing, but it also turns memory into cross-product state rather than a feature of one conversation.

The new mechanism updates topic files while a conversation is happening instead of waiting to summarize after it ends. Users can view these files under Memory settings and edit or delete individual topics. Anthropic argues that a correction then applies everywhere the shared memory is used. Users can also pause memory or reset it.

Sensitive information receives a separate control. By default, Claude does not save topics such as health, race, ethnicity, religion, politics, or gender identity. A user can opt in to saving sensitive topics, and the product displays a notice when such material is stored. The setting applies prospectively rather than importing past conversations. Some categories, including sensitive identification numbers, criminal history, and immigration status, remain excluded even after opt-in.

Availability differs by plan. Anthropic says memory is on by default for Free, Pro, and Max users across web, desktop, and mobile, while sensitive-topic storage remains off. Team and Enterprise administrators control organizational availability, and individual users must still enable memory when it is available.

The design has several practical consequences:

1. **Corrections become infrastructure.** Editing a short topic file can improve multiple future tasks, so reviewing memory may be more valuable than repeatedly correcting outputs.
2. **Propagation should be visible.** A fact supplied for one context may shape work elsewhere; users need a clear mental model of that scope.
3. **Preference controls do not eliminate data review.** Opt-in and exclusions help, but organizations still need policies for confidential project details, retention, account offboarding, and inappropriate inference.
4. **Freshness matters as much as accuracy.** A once-correct deadline or reporting relationship can become stale, so durable memory needs maintenance.

The announcement explains controls but does not present measurements of retrieval accuracy, stale-memory frequency, correction latency, cross-surface errors, or user comprehension. It also does not fully describe retention and audit behavior in this article. My takeaway is that shared memory can make agent workflows materially smoother, yet its success should be judged by controllable, inspectable state—not only by how often users avoid repeating themselves.

---

> **Source boundary:** The section below contains a sourced paraphrase and attribution. Unless the metadata records explicit compatible permission, read the complete original at the official link.

## Source material

### Anthropic: Claude's memory works everywhere, and you decide what's in it

- **Published:** August 25, 2026
- **Original:** [Read the article](https://claude.com/blog/claudes-memory-works-everywhere-and-you-decide-whats-in-it)
- **Official Chinese edition:** Not found
- **Reuse:** Summary and attribution; original copyright remains with Anthropic.

#### What the original covers

Anthropic announces one shared memory across Claude chat and Cowork, in-conversation topic updates, and a settings interface for reading, editing, deleting, pausing, or resetting stored memory. Examples describe shared project priorities, manager preferences, and planning details moving between chat and Cowork.

The article also defines an opt-in control for sensitive topics, lists categories that remain excluded, and describes availability across consumer and organizational plans. It is a product announcement rather than an evaluation of memory accuracy or long-term outcomes.
