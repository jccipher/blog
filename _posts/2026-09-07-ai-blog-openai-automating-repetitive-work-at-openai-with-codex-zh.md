---
layout: post
title: "Codex 与 Runme：把重复劳动变成可审查的操作记忆"
date: 2026-09-07 07:37:30 +0800
lang: zh
slug: ai-blog-openai-automating-repetitive-work-at-openai-with-codex
permalink: /zh/posts/ai-blog-openai-automating-repetitive-work-at-openai-with-codex/
translation_url: /posts/ai-blog-openai-automating-repetitive-work-at-openai-with-codex/
categories: [AI, Industry Digest]
tags: [OpenAI, AI Research]
reading_time: 5
description: "分析 OpenAI 的 Runme 工作流如何结合 Codex、审批关口、WebMCP 与可复用的操作记录。"
run_mode: published
sources:
  - publisher: OpenAI
    title: "Automating repetitive work at OpenAI with Codex"
    url: "https://developers.openai.com/blog/automating-repetitive-work-at-openai-with-codex"
    published_at: "2026-08-25"
    official_zh_url: null
    reuse_policy: summary-only
---

> Jeremy Lewi 的 Runme 案例没有把重复工程工作仅仅视为脚本问题，而是把它看作上下文与治理问题。Codex 在 Notebook 中执行，目标、审批点、命令、证据、失败路径和决策都会留下，供下一次任务继续使用。

## 编辑摘要

OpenAI 工程师 Jeremy Lewi 描述了云基础设施和模型评测中的共同模式：一个复杂操作任务刚刚解决，下一项相似任务又带着不同的配额、配置或失败模式出现。传统自动化可以消除稳定步骤，但如果为每个持续变化的工作流单独开发和维护工具，自动化本身也会变成新的工作层。

他的替代方案是 Runme，一款用于与 Codex 协作的开源 Notebook 应用。一个 Notebook 可以组合 Markdown、可执行代码单元、HTML、指令、输出、表格和图表。Lewi 不让智能体从聊天历史中猜测完整流程，而是写下简短目标，要求它回顾上一次运行、制定详细计划、在执行前等待批准，并记录命令、结果和解释。

Notebook 不只是方便的界面，它让工作流拥有用户与智能体都能检查的持久状态。运行评测时，Codex 更新计划并记录进度；Lewi 则把注意力放在后果更大的分叉上，例如选择哪套评测系统、是否值得开辟新基础设施，或在配额阻止环境创建时提出经过批准的替代方案。最终产物同时保留成功步骤、失败路径，以及原本容易消失在对话里的决策理由。

Runme Notebook 可以存入 Google Drive，每份 Notebook 还生成一个可被 Drive 索引的 `*.index.md` 配套文件。这样，历史运行无需迁入新的文档仓库，也能成为可检索上下文。这套设计强调累积效应：本次运行结束后留下的材料会改善下次运行，让操作知识成为持续维护的输入，而不是事后补写的负担。

智能体通过 WebMCP 与客户端 Runme 应用交互。应用在浏览器中注册工具，用于读取使用说明与文档，并运行有边界的 JavaScript 来读取或更新 Notebook。由于 Runme 是静态 Web 应用，浏览器侧工具避免了仅为暴露 MCP 端点而增加服务器，也让 Notebook 交互留在原本处理数据的位置附近。

其中有四种做法值得复用：

1. **把目标变成资产。** 持久、可编辑的目标比散落在多轮对话中的意图更容易审阅，也为长任务提供稳定参照。
2. **把审批放在决策边界。** 人工审查最适合出现在高成本或高影响操作之前，而不是持续监控每一个机械步骤。
3. **把解释与输出放在一起。** 命令记录本身无法说明结果是否健康、为什么放弃某个方案，以及下一次应该改变什么。
4. **为检索设计记忆。** 有用历史必须能够搜索，并且足够紧凑，让智能体找到相关先例；只把 Notebook 越积越多并不等于知识管理。

这篇文章是第一人称工作流记录，不是基准测试。它没有量化总共节省多少时间、人工介入频率、维护 Notebook 的成本，也没有说明旧运行在多大比例上仍适用于新任务。这种方法还依赖严格整理：错误或过时结论也可能变得非常容易检索；如果没有妥善管理存储权限和保留策略，详细记录还会暴露操作信息。

WebMCP 降低了集成基础设施，但浏览器侧工具仍需能力收窄、数据边界可见，并对高影响操作保留审查。同样，自动审批审查也不能取代明确的人类责任，例如是否配置基础设施、是否修改评测配置，仍需要有人作出最终决定。

我的主要结论是，最值得自动化的对象不是命令序列，而是两次运行之间流失的上下文。Runme 让工作产物与操作手册成为同一份资产。当它保留证据、约束、审批与推理时，智能体可以承担更多重复执行，而人不必放弃真正决定风险的判断。

## 来源材料

### OpenAI：Automating repetitive work at OpenAI with Codex

- **发布日期：** 2026 年 8 月 25 日
- **作者：** Jeremy Lewi
- **英文原文：** [阅读原文](https://developers.openai.com/blog/automating-repetitive-work-at-openai-with-codex)
- **官方中文版：** 未找到
- **转载说明：** 本文仅作摘要与出处标注，原文版权归 OpenAI 所有。

#### 原文要点

Lewi 回顾了配置 Kubernetes 集群，以及为新模型与新功能运行评测的重复工作。他解释自己如今会结合 Codex 与 Runme，而不是为每项周期性任务建立一套固定自动化。

Runme Notebook 以目标和一组工作指令开始：检查过去的运行、提出计划、等待审批并记录执行。Codex 在工作过程中更新 Notebook；Lewi 审阅计划，帮助选择影响较大的替代方案，并在配额耗尽等约束阻止原路径时提出合规选项。

最终 Notebook 保留命令、输出、解释、决策与失败路径。Runme 支持混合 Markdown、代码、HTML、表格和图表，可以把 Notebook 存入 Google Drive，并创建 Markdown 索引，让智能体更容易发现历史运行。

文章还介绍 Runme 如何通过 WebMCP 在静态客户端应用中注册浏览器侧工具。这些工具提供有边界的 Notebook 操作与文档读取能力，无需增加新的服务端 MCP 服务。文章最后主张，在执行过程中同步记录意图与证据，可以让操作知识被再次利用，同时把真正重要的决策保留给人来审查。
