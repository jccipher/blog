---
layout: post
title: Building Frontend UIs with Codex and Figma
description: >-
  OpenAI introduces a new integration between Codex and Figma, enabling users to
  generate Figma design files from Codex via the Figma MCP server. This
  integration allows for bidirectional movement of UI elements between Figma and
  code, supporting a more fluid development workflow.
date: '2026-09-28 07:53:00 +0800'
lang: en
slug: ai-blog-openai-building-frontend-uis-with-codex-and-figma
permalink: /posts/ai-blog-openai-building-frontend-uis-with-codex-and-figma/
translation_url: /zh/posts/ai-blog-openai-building-frontend-uis-with-codex-and-figma/
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
> The Figma MCP server enables users to move UI elements between Figma and code seamlessly. By connecting Codex to Figma, users can generate code from Figma designs and bring live UI back into Figma for further refinement. This integration supports exploration, iteration, and collaboration between design and development teams.

## Editorial summary

OpenAI has introduced a new integration between Codex and Figma, allowing users to generate Figma design files from Codex using the Figma MCP server. This server supports bidirectional movement of UI elements, enabling users to bring working UI onto the Figma canvas and back into code. The Codex desktop application is designed for managing multiple agents in parallel, offering a focused interface for development. One of the core use cases of the Figma MCP server is retrieving context from Figma files and using that context in code generation. Users can copy a frame from a Figma file and use it as input for Codex to generate code. The get_design_context tool helps extract critical design information such as layouts, styles, and components, which are then used for code generation. Beyond design context extraction, the Figma MCP server offers other tools for enhancing the development workflow. After iterating in code, users can bring their designs back into Figma using the generate_figma_design tool, which turns a live interface into fully editable Figma frames. This allows for deeper exploration and collaboration. Once the UI is refined in Figma, users can follow the same steps to pull those changes back into their application via the MCP server. This roundtrip process between code and canvas enables fluid movement between execution and exploration, unlocking the full potential of the Figma MCP server with Codex. However, users should note that this integration is built to support movement in both directions but does not guarantee general safety or universal applicability. The system may have limitations, including platform-specific constraints and exceptions that are not explicitly detailed in the source.

---

> **Source boundary:** Source attribution follows. Only the summary is bilingual and narrated.

---

> **Source boundary:** The section below contains a sourced paraphrase and attribution. Unless the metadata records explicit compatible permission, read the complete original at the official link.

## Source material

### OpenAI: Building frontend UIs with Codex and Figma

- Published: 2026-02-26
- Original: [Building frontend UIs with Codex and Figma](https://developers.openai.com/blog/building-frontend-uis-with-codex-and-figma)

Read the complete original at the official link. Original copyright remains with OpenAI.
