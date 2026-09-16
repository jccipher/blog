---
layout: post
title: Perplexity 如何通过 Realtime API 将语音搜索带给数百万用户
description: >-
  Perplexity 是一家专注于打造用户友好产品的公司，他们使用 OpenAI 的 Realtime-1.5 API 来增强其产品的语音交互功能，包括
  Perplexity Comet 和 Perplexity Computer。本文编辑摘要探讨了在产品中集成语音搜索时所采用的策略、挑战和学到的经验。
date: '2026-09-16 12:40:44 +0800'
lang: zh
slug: ai-blog-openai-realtime-perplexity-computer
permalink: /zh/posts/ai-blog-openai-realtime-perplexity-computer/
translation_url: /posts/ai-blog-openai-realtime-perplexity-computer/
categories:
  - AI
  - Industry Digest
tags:
  - OpenAI
  - AI Research
reading_time: 3
run_mode: published
content_format: summary-source-v2
bilingual_scope: summary
sources:
  - publisher: OpenAI
    title: How Perplexity Brought Voice Search to Millions Using the Realtime API
    url: 'https://developers.openai.com/blog/realtime-perplexity-computer'
    published_at: '2026-03-25'
    official_zh_url: null
    reuse_policy: summary-only
---
> Perplexity 使用 Realtime-1.5 来实现其产品的语音交互功能，旨在提升可用性和用户体验。本文摘要详细介绍了在集成语音搜索过程中遇到的挑战，包括上下文管理、音频标准化、环境调优和工具分发。

## 编辑摘要

Perplexity 是一家专注于创建用户友好产品的公司，他们使用 OpenAI 的 Realtime-1.5 API 来实现其产品的语音交互功能，包括 Perplexity Comet 和 Perplexity Computer。该公司旨在使这些产品完全通过语音操作，强调只需说出想要的内容即可执行任务的满足感。Realtime-1.5 被用于生产环境，以管理每月数百万次的语音会话。然而，语音搜索的集成也带来了一些挑战，包括上下文管理、跨平台音频标准化、真实环境调优以及模型内工具分发的管理，这些在本文摘要中均有详细说明。

一个关键挑战是处理长内容，如多小时的播客。最初，发送大块文本会导致模型丢失上下文，造成行为不稳定。Perplexity 通过将内容拆分为 2000 token 的小块并逐步输入，解决了这一问题，从而提高了稳定性。此外，公司还了解到，并非所有上下文都应以相同方式处理。例如，过多使用 'user' 角色会使模型表现得像用户在叙述内容，而不是提问。

另一个挑战是跨不同产品界面标准化音频，如 Ask、Comet 和 Computer。每个产品使用了不同的客户端堆栈，导致音频性能不一致。Perplexity 开发了一个基于 Rust 的 SDK，以抽象这些差异，确保所有客户端向 Realtime API 发送相同的音频合同。这包括将音频重采样为 48 kHz 单声道，应用 WebRTC APM 进行降噪，并进行编码传输。

对真实环境进行语音检测（VAD）的调优也至关重要。Perplexity 在嘈杂的环境中，如旧金山酒吧，进行测试，以确保语音交互在复杂条件下也能正常工作。他们还引入了 '语音锁定' 功能，以处理用户输入中的停顿，允许用户在复杂任务中保持发言权。

最后，Perplexity 专注于使用核心工具，将工具数量限制在十个以下，以确保稳定性和可用性。他们提供了明确的指令，说明何时以及如何使用每个工具，确保输出结构清晰，而非与内联指令混合。这种方法有助于保持与模型训练过程中更接近的一致交互模式。

---

> **来源分界：** 以下为原文出处；仅摘要提供中英双语及语音。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### OpenAI: How Perplexity Brought Voice Search to Millions Using the Realtime API

- Published: 2026-03-25
- Original: [How Perplexity Brought Voice Search to Millions Using the Realtime API](https://developers.openai.com/blog/realtime-perplexity-computer)

Read the complete original at the official link. Original copyright remains with OpenAI.
