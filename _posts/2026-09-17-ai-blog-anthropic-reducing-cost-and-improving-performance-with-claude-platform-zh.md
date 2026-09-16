---
layout: post
title: 通过 Claude 平台减少成本并提高性能
description: >-
  Anthropic 最新发布的博客文章介绍了在使用 Claude
  平台时减少成本和提高性能的策略。文章强调了三个关键改进点：最大化提示缓存命中率、在升级到前沿 Claude
  模型时移除提示中的反模式，以及根据任务调整努力程度。这些指导已整合到 claude-api 技能中，并展示了 Claude Code
  如何用于识别和解决低效问题。
date: '2026-09-17 05:39:54 +0800'
lang: zh
slug: ai-blog-anthropic-reducing-cost-and-improving-performance-with-claude-platform
permalink: >-
  /zh/posts/ai-blog-anthropic-reducing-cost-and-improving-performance-with-claude-platform/
translation_url: >-
  /posts/ai-blog-anthropic-reducing-cost-and-improving-performance-with-claude-platform/
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
> Anthropic 的博客文章讨论了在 Claude 平台上减少成本和提高性能的方法。文章强调了提示缓存、移除提示中的反模式以及调整努力程度。claude-api 技能用于审计提示并优化成本。文章包括了在各种任务上成本降低高达 58% 的基准测试。

## 编辑摘要

Anthropic 的博客文章《通过 Claude 平台减少成本并提高性能》概述了在 Claude 平台上优化成本和性能的三个关键策略。首先，最大化提示缓存命中率可以显著降低输入成本，因为缓存读取的费用仅为完整输入价格的一小部分。然而，有效使用提示缓存需要关注几个因素，包括模型特定的固定、字节精确的前缀和有限的生存时间（TTL）约束。文章提供了实用技巧，例如避免在对话中更改努力或思考设置，将易变值保留在提示前缀之外，并延迟使用频率较低的工具以提高缓存效率。

其次，文章指出了在升级到前沿 Claude 模型时，提示中常见的“反模式”会阻碍性能并增加成本。这些包括验证仪式、强调增强器、强制性程序、过时示例、矛盾规则和过时配置。claude-api 技能包含了一个提示审计命令，用于识别并移除这些反模式。基准测试显示，移除这些模式可以将成本降低高达 14.6%，并将准确性提高 5.3%。

第三，文章讨论了“努力程度”的校准，这决定了 Claude 在任务上的努力程度。根据任务，低努力程度可能比高努力程度更具成本效益。例如，在 FrontierCode Diamond 基准测试中，Claude Fable 5.1 在低努力程度下以三分之一的成本优于 Fable 5 在高努力程度下的表现。文章还介绍了 /claude-api hillclimb 命令，通过测试不同模型、努力程度和提示配置，迭代地改进成本和性能。

最后，文章介绍了 /claude-api cost-optimize 命令，它提供了对令牌使用情况的全面审计，并识别了节省成本的机会。它建议使用提示缓存、批量处理未处理的工作和限制输出以减少成本。基准测试显示，cost-optimize 可以在不影响性能的情况下将成本降低高达 58%。文章最后提供了使用这些工具优化实际应用中成本和性能的指导。

---

> **来源分界：** 以下为原文出处；仅摘要提供中英双语及语音。

## 来源材料

### Anthropic: Reducing cost and improving performance with Claude Platform

- Published: 2026-09-08
- Original: [Reducing cost and improving performance with Claude Platform](https://claude.com/blog/reducing-cost-and-improving-performance-with-claude-platform)

Read the complete original at the official link. Original copyright remains with Anthropic.
