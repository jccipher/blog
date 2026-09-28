---
layout: post
title: >-
  Building Intelligent Apps for Apple Platforms with Claude in the Foundation
  Models Framework
description: >-
  Anthropic has announced support for its Claude model within Apple's Foundation
  Models framework, enabling developers to integrate Claude into their Apple
  apps for complex workflows.
date: '2026-09-28 07:53:00 +0800'
lang: en
slug: ai-blog-anthropic-claude-for-foundation-models
permalink: /posts/ai-blog-anthropic-claude-for-foundation-models/
translation_url: /zh/posts/ai-blog-anthropic-claude-for-foundation-models/
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
    title: >-
      Building intelligent apps for Apple platforms with Claude in the
      Foundation Models framework
    url: 'https://claude.com/blog/claude-for-foundation-models'
    published_at: '2026-06-08'
    official_zh_url: null
    reuse_policy: summary-only
---
> Anthropic has announced support for its Claude model within Apple's Foundation Models framework, enabling developers to integrate Claude into their Apple apps for complex workflows.

## Editorial summary

Anthropic has introduced support for its Claude model within Apple's Foundation Models framework, allowing developers to use Claude for complex workflows in Apple apps. The new Swift package enables developers to call Claude through Apple's framework, which already supports on-device models for tasks like summarization and extraction. Developers can now use the framework to hand off more complex tasks, such as multi-step reasoning, code generation, and web searches, to Claude. This integration allows for a seamless user experience, where on-device processing is used for simpler tasks and Claude is used for more complex reasoning. The framework returns typed Swift values from @Generable annotations, ensuring clean inputs for Claude API calls. This unlocks new possibilities for intelligent apps, such as journaling apps that generate prompts on-device and then use Claude to find threads across entries, or study apps that explain concepts and then use Claude for follow-up questions. The support for Claude will be available starting tomorrow for iOS 27, iPadOS 27, macOS 27, visionOS 27, and watchOS 27. Developers can add the package to their projects, sign in with an Anthropic API key, and pass typed outputs from Apple's on-device models into Claude requests. The package handles streaming, tool calls, and structured responses back into SwiftUI views. However, the framework's capabilities are limited to the supported Apple platforms and require an Anthropic API key for Claude integration.

---

> **Source boundary:** Source attribution follows. Only the summary is bilingual and narrated.

---

> **Source boundary:** The section below contains a sourced paraphrase and attribution. Unless the metadata records explicit compatible permission, read the complete original at the official link.

## Source material

### Anthropic: Building intelligent apps for Apple platforms with Claude in the Foundation Models framework

- Published: 2026-06-08
- Original: [Building intelligent apps for Apple platforms with Claude in the Foundation Models framework](https://claude.com/blog/claude-for-foundation-models)

Read the complete original at the official link. Original copyright remains with Anthropic.
