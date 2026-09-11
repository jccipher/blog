---
layout: post
title: Claude 共享记忆：在连续性与用户控制之间设边界
date: '2026-09-11 11:26:14 +0800'
lang: zh
slug: ai-blog-anthropic-claudes-memory-works-everywhere-and-you-decide-whats-in-it
permalink: >-
  /zh/posts/ai-blog-anthropic-claudes-memory-works-everywhere-and-you-decide-whats-in-it/
translation_url: >-
  /posts/ai-blog-anthropic-claudes-memory-works-everywhere-and-you-decide-whats-in-it/
categories:
  - AI
  - Industry Digest
tags:
  - Anthropic
  - AI Research
reading_time: 4
description: 分析 Claude 跨 Chat 与 Cowork 的共享记忆、编辑控制、敏感主题策略及其治理含义。
run_mode: published
sources:
  - publisher: Anthropic
    title: 'Claude''s memory works everywhere, and you decide what''s in it'
    url: >-
      https://claude.com/blog/claudes-memory-works-everywhere-and-you-decide-whats-in-it
    published_at: '2026-08-25'
    official_zh_url: null
    reuse_policy: summary-only
content_format: summary-source-v2
---

> Anthropic 正把 Claude 的记忆变成 Chat 与 Cowork 共用的一层状态。产品承诺是连续性，真正的设计问题则是治理：保存什么、传播到哪里、谁能编辑，以及哪些类别始终被排除。

## 编辑摘要

Anthropic 表示，普通对话与 Claude Cowork 现在使用同一份记忆。在一个界面中学到的上下文可以影响另一个界面：对话里讨论的优先事项能够进入 Cowork 任务，Cowork 执行时出现的信息也能用于后续对话。这会减少重复说明，却也意味着记忆不再属于单个会话，而是成为跨产品状态。

新机制会在对话进行时更新主题文件，而不是等会话结束后再总结。用户可以在 Memory 设置中查看这些文件，并逐项编辑或删除。一次修正随后会作用于所有使用共享记忆的场景。用户也可以暂停或重置记忆。

敏感信息有独立控制。默认情况下，Claude 不保存健康、种族、民族、宗教、政治和性别认同等主题。用户可以主动允许保存敏感主题；每次保存此类内容时，产品会显示提示。该设置只影响未来信息，不会回溯导入旧对话。即使用户开启选项，敏感身份号码、犯罪记录和移民身份等类别仍不会保存。

不同套餐的可用方式并不相同。Anthropic 称，Free、Pro 和 Max 用户在网页、桌面与移动端默认开启普通记忆，而敏感主题保存保持关闭。Team 与 Enterprise 由管理员控制组织是否可用，个人仍需在可用后自行开启。

这项设计带来几条实践含义：

1. **修正会变成基础设施。** 编辑一份短主题文件可以改善多个后续任务，定期审查记忆可能比反复纠正输出更有效。
2. **传播范围应当可见。** 为某个场景提供的信息可能在别处影响结果，用户需要清晰理解作用域。
3. **偏好控制不能替代数据治理。** 选择加入和类别排除很重要，但组织仍需处理机密项目、保留周期、账号离职和不当推断。
4. **新鲜度与准确性同样重要。** 曾经正确的截止日期或汇报关系可能过时，持久记忆必须维护。

公告解释了控制方式，却没有提供检索准确率、陈旧记忆频率、纠正生效延迟、跨界面错误或用户理解程度的测量，也未在本文完整说明保留与审计行为。我的结论是，共享记忆确实可能让智能体工作流更顺畅，但评价标准应当是状态是否可控、可见、可修正，而不只是少重复了多少背景。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### Anthropic：Claude's memory works everywhere, and you decide what's in it

- **发布日期：** 2026 年 8 月 25 日
- **英文原文：** [阅读原文](https://claude.com/blog/claudes-memory-works-everywhere-and-you-decide-whats-in-it)
- **官方中文版：** 未找到
- **转载说明：** 本文仅作摘要与出处标注，原文版权归 Anthropic 所有。

#### 原文要点

Anthropic 宣布 Claude Chat 与 Cowork 使用同一份共享记忆，主题会在对话过程中更新，用户可以在设置中读取、编辑、删除、暂停或重置记忆。文章用项目优先级、经理偏好和活动规划说明信息如何跨界面延续。

原文还介绍了敏感主题的主动选择机制、始终排除的类别，以及消费者与组织套餐的可用方式。这是一则产品公告，并未评估记忆准确性或长期效果。
