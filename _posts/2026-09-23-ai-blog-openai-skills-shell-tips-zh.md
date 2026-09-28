---
layout: post
title: 长时运行智能体需要流程、执行与记忆控制
date: '2026-09-28 07:53:00 +0800'
lang: zh
slug: ai-blog-openai-skills-shell-tips
permalink: /zh/posts/ai-blog-openai-skills-shell-tips/
translation_url: /posts/ai-blog-openai-skills-shell-tips/
categories:
  - AI
  - Industry Digest
tags:
  - OpenAI
  - AI Research
reading_time: 3
description: 解读 OpenAI 关于组合 Skills、Shell、上下文压缩与安全隔离来运行长任务的实践指南。
run_mode: published
content_format: summary-source-v2
bilingual_scope: summary
sources:
  - publisher: OpenAI
    title: >-
      Shell + Skills + Compaction: Tips for long-running agents that do real
      work
    url: 'https://developers.openai.com/blog/skills-shell-tips'
    published_at: '2026-02-11'
    official_zh_url: null
    reuse_policy: summary-only
---

> Skills 告诉智能体如何工作，Shell 让它执行，压缩让任务持续；真正有用的是受治理的组合，而不是任何单一部件。

## 编辑摘要

OpenAI 把长时运行智能体拆成三层：Skills 提供可复用流程与路由规则，Shell 提供执行环境，上下文压缩则在窗口逐渐填满时保留任务的有效状态。

文章最有价值的是操作性建议。Skill 描述应像路由逻辑一样明确，包含反例，并让模板在未调用时保持休眠。长任务从一开始就应围绕容器复用和压缩设计，而不是等上下文吃紧后再补救。

安全被纳入工作流本身。联网能力与可执行 Skills 叠加会扩大风险，因此指南建议使用双层白名单、作用域化密钥、隔离环境和清晰的制品交接边界；同时区分自动的服务端压缩与可由应用控制时机的显式压缩接口。

这些是架构指南，不保证智能体一定完成每个长任务。可靠性仍取决于 Skill 的明确程度、工具权限、可观察检查点、重试策略，以及宿主应用如何处理部分结果。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### OpenAI：Shell + Skills + Compaction: Tips for long-running agents that do real work

- **发布日期:** 2026/2/11
- **英文原文:** [阅读原文](https://developers.openai.com/blog/skills-shell-tips)
- **转载说明:** 本文仅作摘要与出处标注，原文版权归 OpenAI 所有。

#### 原文要点

原文把 Skills 定义为流程、Shell 定义为执行、压缩定义为长任务的连续性，并给出十项实现建议与三种构建模式。内容涵盖自动和显式压缩，以及联网、白名单、密钥、隔离和制品交接的安全做法。
