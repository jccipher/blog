---
layout: post
title: 通过Foundation Models框架在Apple平台上使用Claude构建智能应用
description: >-
  Anthropic宣布支持其Claude模型在Apple的Foundation
  Models框架中，使开发者能够将Claude集成到Apple应用中，以处理复杂的任务。
date: '2026-09-28 07:53:00 +0800'
publication_date: '2026-09-23'
lang: zh
slug: ai-blog-anthropic-claude-for-foundation-models
permalink: /zh/posts/ai-blog-anthropic-claude-for-foundation-models/
translation_url: /posts/ai-blog-anthropic-claude-for-foundation-models/
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
> Anthropic宣布支持其Claude模型在Apple的Foundation Models框架中，使开发者能够将Claude集成到Apple应用中，以处理复杂的任务。

## 编辑摘要

Anthropic宣布在其Claude模型中支持Apple的Foundation Models框架，使开发者能够将Claude集成到Apple应用中，以处理复杂的任务。新的Swift软件包允许开发者通过Apple的框架调用Claude，该框架目前支持在设备上运行的模型，用于摘要和提取等任务。开发者现在可以使用该框架将更复杂的任务，如多步骤推理、代码生成和网络搜索，交给Claude处理。这种集成为用户提供了一种无缝的体验，其中设备上的处理用于简单任务，而Claude用于更复杂的推理。该框架通过@Generable注解返回类型化的Swift值，确保Claude API调用的输入干净。这为智能应用打开了新的可能性，例如日记应用可以在设备上生成提示，然后使用Claude查找条目中的线索，或学习应用可以解释概念，然后使用Claude进行后续问题。对Claude的支持将于明天开始在iOS 27、iPadOS 27、macOS 27、visionOS 27和watchOS 27上提供。开发者可以将该软件包添加到项目中，使用Anthropic API密钥登录，并将Apple设备上的类型化输出传递给Claude请求。该软件包处理流式传输、工具调用和结构化响应，返回到SwiftUI视图中。然而，该框架的功能仅限于支持的Apple平台，并且需要Anthropic API密钥来集成Claude。

---

> **来源分界：** 以下为原文出处；仅摘要提供中英双语及语音。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### Anthropic: Building intelligent apps for Apple platforms with Claude in the Foundation Models framework

- Published: 2026-06-08
- Original: [Building intelligent apps for Apple platforms with Claude in the Foundation Models framework](https://claude.com/blog/claude-for-foundation-models)

Read the complete original at the official link. Original copyright remains with Anthropic.
