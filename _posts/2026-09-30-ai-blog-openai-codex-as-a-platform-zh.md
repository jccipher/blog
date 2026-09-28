---
layout: post
title: Codex 作为平台：智能体循环正在成为基础设施
date: '2026-09-28 07:53:00 +0800'
publication_date: '2026-10-01'
lang: zh
slug: ai-blog-openai-codex-as-a-platform
permalink: /zh/posts/ai-blog-openai-codex-as-a-platform/
translation_url: /posts/ai-blog-openai-codex-as-a-platform/
categories:
  - AI
  - Industry Digest
tags:
  - OpenAI
  - AI Research
reading_time: 5
description: 解析开放的 Codex harness、不同集成层，以及领域应用为何仍应掌管上下文、同意与正式记录。
run_mode: published
sources:
  - publisher: OpenAI
    title: 'Codex as a platform: build on the open agent harness'
    url: 'https://developers.openai.com/blog/codex-as-a-platform'
    published_at: '2026-08-19'
    official_zh_url: null
    reuse_policy: summary-only
content_format: summary-source-v2
---

> OpenAI 的平台论点是：真正可复用的产品不是统一聊天界面，而是 Codex 下方的智能体循环——上下文、工具、状态、进度、沙箱、批准与恢复——并把它嵌入本来就理解业务的界面。

## 编辑摘要

Codex 应用、CLI 与 IDE 扩展，是同一套开源 harness 的不同表面。OpenAI 把 harness 描述为执行层：帮助模型理解任务，保留并压缩上下文，使用工具，流式报告进度，处理失败，请求批准，并让工作跨多个回合持续。

这个区别很重要，因为一次强大的模型调用还不是完整的智能体产品。专业工作流还需要持久状态、可观察事件、权限边界，以及从建议到动作的受控路径。OpenAI 引用 ARC-AGI-3 结果说明 harness 设计会实质影响表现：保留推理与上下文压缩让 GPT-5.6 Sol 的得分从 13.3% 提升到 38.3%，同时把输出 token 降低到原来的六分之一。

文章给出三种集成层。`codex exec` 适合边界明确的脚本、CI 任务和非交互后台工作；Codex SDK 适合由应用代码创建、恢复并流式接收智能体任务；Codex app-server 则向需要持久会话、工具事件、中断和批准处理的产品开放更完整的生命周期与客户端协议。

开源让开发者能够检查应用与模型之间的执行层，但不代表服务的所有部分都在本地或全部开放。已发布的 CLI、SDK 与 app-server 提供 harness 和集成界面；模型访问与托管服务仍然是独立部分。

最关键的架构边界，是把宿主应用和 harness 的责任分开。应用掌管领域上下文、业务规则、正式记录、界面状态与用户同意，并可暴露严格限定的 MCP 数据和动作；Codex 掌管智能体循环与沙箱执行。工具修改记录后，应用应刷新自己的业务视图，而不能把聊天记录当作系统事实来源。

OpenAI 的 Relay 示例把分工具体化。用户在虚构的运输仪表盘中选择延误货件，再点击比较恢复方案。应用提供货件上下文，Codex 获取最新数据并解释选项；重新订舱必须获得人工批准。智能体进入原有领域界面，而不是要求操作人员在空白对话框里重建整个案例。

由此可以得到四条产品原则：

1. **从工作流的原生对象开始。** 货件、事故、客户账号或文档应成为任务锚点。
2. **暴露窄工具，而不是环境级权限。** 宿主决定有哪些数据和动作，以及哪些必须批准。
3. **让正式记录留在对话之外。** 智能体事件解释过程，领域记录定义运营事实。
4. **选择满足需求的最小集成层。** 后台命令不必承担 app-server 的复杂度，持久产品也不该被塞进一次性进程。

这是一篇平台介绍，案例展示的是推荐架构，没有比较部署成本、可靠性或跨供应商可迁移性。身份认证、多租户、审计保留、错误恢复、模型升级与降级路径，仍需每个团队按自己的风险设计。

我的结论是，开放 harness 把智能体行为变成了一种集成原语，但周围的产品仍然是治理者。机会并不是用聊天框替代所有界面，而是把一条能力强、边界清晰的循环，放进人们本来就能理解上下文并行使权限的视图中。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### OpenAI：Codex as a platform: build on the open agent harness

- **发布日期：** 2026 年 8 月 19 日
- **作者：** Nicolas Bonamy、Derrick Choi
- **英文原文：** [阅读原文](https://developers.openai.com/blog/codex-as-a-platform)
- **官方中文版：** 未找到
- **转载说明：** 本文仅作摘要与出处标注，原文版权归 OpenAI 所有。

#### 原文要点

原文定义了 Codex harness，说明上下文保留、工具使用、流式事件、沙箱、批准和多回合状态为什么不同于一次模型调用，并把 CLI、SDK 和 app-server 对应到不同类型的集成需求。

文章主张领域应用继续掌管界面上下文、正式记录、业务规则、工具和用户同意，Codex 则提供智能体循环。Relay 运输运营示例展示了带上下文的任务启动、MCP 数据获取、可见进度与关键写操作前的人工批准。结尾把模式扩展到运营、客服、安全、销售和税务等非工程场景。
