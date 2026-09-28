---
layout: post
title: 使用 Codex 和 Figma 构建前端 UI
description: >-
  OpenAI 推出了 Codex 和 Figma 的新集成，用户可以通过 Figma MCP 服务器从 Codex 生成 Figma
  设计文件。该集成允许用户在 Figma 和代码之间无缝移动 UI 元素，支持更流畅的开发工作流程。
date: '2026-09-28 07:53:00 +0800'
publication_date: '2026-09-22'
lang: zh
slug: ai-blog-openai-building-frontend-uis-with-codex-and-figma
permalink: /zh/posts/ai-blog-openai-building-frontend-uis-with-codex-and-figma/
translation_url: /posts/ai-blog-openai-building-frontend-uis-with-codex-and-figma/
categories:
  - AI
  - Industry Digest
tags:
  - OpenAI
  - AI Research
reading_time: 2
run_mode: published
content_format: summary-source-v2
bilingual_scope: summary
sources:
  - publisher: OpenAI
    title: Building frontend UIs with Codex and Figma
    url: >-
      https://developers.openai.com/blog/building-frontend-uis-with-codex-and-figma
    published_at: '2026-02-26'
    official_zh_url: null
    reuse_policy: summary-only
---
> Figma MCP 服务器使用户能够无缝地在 Figma 和代码之间移动 UI 元素。通过将 Codex 与 Figma 连接，用户可以从 Figma 设计生成代码，并将实时 UI 带回 Figma 进行进一步优化。该集成支持设计与开发团队之间的探索、迭代和协作。

## 编辑摘要

OpenAI 推出了 Codex 和 Figma 的新集成，允许用户通过 Figma MCP 服务器从 Codex 生成 Figma 设计文件。该服务器支持 UI 元素在 Figma 和代码之间的双向移动，使用户能够将工作中的 UI 带到 Figma 画布上，并将其带回代码中。Codex 桌面应用程序旨在并行管理多个代理，提供一个专注于开发的界面。Figma MCP 服务器的核心用例之一是从 Figma 文件中检索上下文，并在代码生成中使用这些上下文。用户可以从 Figma 文件中复制一个框架，并将其作为输入提供给 Codex 来生成代码。get_design_context 工具可以帮助提取关键设计信息，如布局、样式和组件，然后用于代码生成。除了设计上下文提取，Figma MCP 服务器还提供了其他工具，以增强开发工作流程。在代码中进行迭代后，用户可以使用 generate_figma_design 工具将设计带回 Figma，将实时界面转换为可编辑的 Figma 框架。这允许进行更深入的探索和协作。一旦在 Figma 中优化了 UI，用户可以按照本文开头所述的相同步骤，通过 MCP 服务器将这些更改带回其应用程序中。代码和画布之间的往返过程使用户能够在执行和探索之间自由移动，充分释放 Figma MCP 服务器与 Codex 的真正潜力。然而，用户应注意，该集成旨在支持双向移动，但并不能保证通用安全性或普遍适用性。该系统可能存在限制，包括特定平台的约束和在源中未明确详细说明的例外情况。

---

> **来源分界：** 以下为原文出处；仅摘要提供中英双语及语音。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### OpenAI: Building frontend UIs with Codex and Figma

- Published: 2026-02-26
- Original: [Building frontend UIs with Codex and Figma](https://developers.openai.com/blog/building-frontend-uis-with-codex-and-figma)

Read the complete original at the official link. Original copyright remains with OpenAI.
