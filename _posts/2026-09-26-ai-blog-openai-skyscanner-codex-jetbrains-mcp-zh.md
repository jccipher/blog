---
layout: post
title: IDE 上下文可以缩短智能体反馈回路
date: '2026-09-28 07:53:00 +0800'
lang: zh
slug: ai-blog-openai-skyscanner-codex-jetbrains-mcp
permalink: /zh/posts/ai-blog-openai-skyscanner-codex-jetbrains-mcp/
translation_url: /posts/ai-blog-openai-skyscanner-codex-jetbrains-mcp/
categories:
  - AI
  - Industry Digest
tags:
  - OpenAI
  - AI Research
reading_time: 3
description: 解析 Skyscanner 如何通过 JetBrains MCP 向 Codex 提供编译器、测试、格式化与项目上下文。
run_mode: published
content_format: summary-source-v2
bilingual_scope: summary
sources:
  - publisher: OpenAI
    title: Supercharging Codex with JetBrains MCP at Skyscanner
    url: 'https://developers.openai.com/blog/skyscanner-codex-jetbrains-mcp'
    published_at: '2026-01-11'
    official_zh_url: null
    reuse_policy: summary-only
---

> 把 Codex 连接到 IDE，让它观察开发者使用的同一套诊断信息，从而减少把错误反复复制回聊天的缓慢循环。

## 编辑摘要

Skyscanner 的案例认为，当智能体能看到 IDE 对代码库的结构化理解时，会更有用。JetBrains MCP 暴露项目上下文、诊断、测试和格式化动作，避免开发者手动描述这些信息。

这改变了修复回路。Codex 可以检查编译器反馈、运行预定义检查，并基于即时证据修改代码，而不必等待开发者复制错误消息。文章认为这能减少对话往返，也让建议更贴合项目约定。

该集成还保留了熟悉的工具链。智能体调用团队已经信任的 IDE 能力，而不是另造一套测试或格式化路径，因此反馈仍出现在开发者日常工作区中。

这是一篇实践者案例，而不是受控对比。效果取决于 MCP 工具质量、项目索引、测试速度、权限，以及暴露的诊断信息能否覆盖真正的故障原因。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### OpenAI：Supercharging Codex with JetBrains MCP at Skyscanner

- **发布日期:** 2026/1/11
- **英文原文:** [阅读原文](https://developers.openai.com/blog/skyscanner-codex-jetbrains-mcp)
- **转载说明:** 本文仅作摘要与出处标注，原文版权归 OpenAI 所有。

#### 原文要点

原文介绍 Skyscanner 通过 MCP 把 Codex 连接到 JetBrains IDE 上下文，包括编译器诊断、预定义测试、格式化与代码修改指引，并用真实调试案例说明更快反馈、更少提示往返和对既有工作流的适配。
