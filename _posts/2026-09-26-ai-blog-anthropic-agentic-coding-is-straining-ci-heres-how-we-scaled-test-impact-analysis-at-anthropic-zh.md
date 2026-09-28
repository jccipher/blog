---
layout: post
title: 智能体编程把瓶颈从写代码推向 CI 扩展
date: '2026-09-28 07:53:00 +0800'
lang: zh
slug: >-
  ai-blog-anthropic-agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic
permalink: >-
  /zh/posts/ai-blog-anthropic-agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic/
translation_url: >-
  /posts/ai-blog-anthropic-agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic/
categories:
  - AI
  - Industry Digest
tags:
  - Anthropic
  - AI Research
reading_time: 3
description: 解析 Anthropic 面对 CI 任务增长 25 倍时的临时补丁与测试影响分析服务重构。
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

> 当智能体成倍增加代码与 PR，CI 基础设施会承接这种指数增长；Anthropic 的案例说明临时补丁为何必须让位于可横向扩展的状态设计。

## 编辑摘要

Anthropic 表示，工程师每季度交付的代码量已达到 2021–2025 年平均水平的八倍，其中 Claude 编写 80%。测试数量增长十倍，CI 任务在六个月内增长 25 倍，测试选择服务因而成为新瓶颈。

旧服务由记录结果的 listener 和选择相关测试的 selector 组成，单进程状态模型无法继续承载。扩容机器、按 package 分片和每日重启分别只争取了 70 天、29 天和不足一天，过期结果还削弱了测试选择的可信度。

重构把事件历史移入内存数据存储。无状态 listener worker 把结果追加到日志，独立 consumer 汇总为逐测试历史，selector 再查询这些状态。Anthropic 称一名工程师三周完成重构，调优后积压保持平稳。

更广泛的经验不是简单增加 CI 预算，而是测量流入与流出、外置关键状态、消除单例依赖，并在智能体吞吐改变重建成本时按数量级增长设计。这些性能数字来自 Anthropic 自身环境，不是普遍预测。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### Anthropic：Agentic coding is straining CI. Here’s how we scaled test impact analysis at Anthropic

- **发布日期:** 2026/9/14
- **英文原文:** [阅读原文](https://claude.com/blog/agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic)
- **转载说明:** 本文仅作摘要与出处标注，原文版权归 Anthropic 所有。

#### 原文要点

原文说明 Anthropic 的代码、测试与 CI 任务增长，介绍确定性测试影响服务的 listener/selector 架构、三次短命补丁，以及采用无状态 worker、内存日志、汇总 consumer 与逐测试历史查询的重构。
