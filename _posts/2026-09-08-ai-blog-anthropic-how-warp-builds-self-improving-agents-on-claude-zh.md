---
layout: post
title: 自我改进的智能体，需要一条可审查的反馈闭环
date: '2026-09-08 05:03:24 +0800'
lang: zh
slug: ai-blog-anthropic-how-warp-builds-self-improving-agents-on-claude
permalink: /zh/posts/ai-blog-anthropic-how-warp-builds-self-improving-agents-on-claude/
translation_url: /posts/ai-blog-anthropic-how-warp-builds-self-improving-agents-on-claude/
categories:
  - AI
  - Industry Digest
tags:
  - Anthropic
  - AI Research
reading_time: 4
description: 解析 Warp 如何用两个 skill，把人的反馈转化为细小、可审查的生产智能体改进。
run_mode: published
sources:
  - publisher: Anthropic
    title: How Warp builds self-improving agents on Claude
    url: 'https://claude.com/blog/how-warp-builds-self-improving-agents-on-claude'
    published_at: '2026-08-26'
    official_zh_url: null
    reuse_policy: summary-only
---

> Warp 的方法刻意保持克制：一个 skill 保存智能体的领域指令，另一个 skill 定期研究累积的人类反馈，把反复出现的经验整理成小幅修改建议。只有经过人的审查与合并，改进才会进入下一次生产运行。

## 编辑摘要

Anthropic 的案例从一个常见的生产问题讲起。Warp 的代码审查智能体能够完成大部分任务，但低价值评论制造的噪声足以损害使用者的信任。人工改提示词、补充仓库上下文都有帮助，却没有触及根因：每个会话结束后，反馈也随之消失。

Warp 因此建立了双 skill 闭环。内部的基础 skill 保存执行任务所需的指令与领域知识；人们则在原本工作的地方——例如 Pull Request 或 Issue——评价结果。真正有用的反馈不只说“好”或“不好”，还说明建议为什么不适用于这个代码库。外部的改进 skill 按计划运行，收集这些信号，对照智能体输出与人的回应，再为基础 skill 提出聚焦的修改。

纯文件形式在这里是一种治理机制，而不只是存储格式。skill 的变化可以像代码一样查看 diff、讨论、批准和合并。下一次运行继承的是已经接受的经验；错误、偶然或越权的反馈不会在后台悄悄改写生产行为。

文章用 Issue 分类展示了完整路径。第一次运行漏掉了 `ready to spec` 标签，维护者在 Issue 中说明缺少什么，也解释为什么应该添加。定时运行的改进器读取这条证据，并提交只覆盖该经验的最小 Pull Request。观察、解释、修改和批准因此都有迹可循。

这套方法有四个可迁移的要点：

1. **记录理由，而不只记录投票。** 二元反馈只能表达偏好，具体解释才可能沉淀为领域知识。
2. **把执行与改进分离。** 执行任务的智能体不应在同一次运行里随意重写自己的生产指令。
3. **保持修改足够小。** 小改动更容易归因、测试、审查和回退。
4. **先建立验证机制。** 黄金样例、确定性检查与结果指标，能帮助团队区分真实改进和对噪声的迎合。

这是一篇公司案例，而不是受控实验。文章介绍了规模和操作方式，却没有量化审查质量提升、误报下降或改进器的维护成本。风险也没有消失，而是转移到反馈治理：如果权限、证据质量和批准边界不清晰，大量低质量反馈同样会让 skill 退化。

我的结论是，自我改进的智能体不应被理解为模型自行改变自己，更像一套严谨的维护系统：反馈先变成候选补丁，验证机制检查补丁，最后由人决定是否合并。这样才能让经验持续积累，同时让生产指令保持可见、可追责。

## 来源材料

### Anthropic：How Warp builds self-improving agents on Claude

- **发布日期：** 2026 年 8 月 26 日
- **作者：** Michael Segner
- **英文原文：** [阅读原文](https://claude.com/blog/how-warp-builds-self-improving-agents-on-claude)
- **官方中文版：** 未找到
- **转载说明：** 本文仅作摘要与出处标注，原文版权归 Anthropic 所有。

#### 原文要点

原文介绍 Warp 如何从临时修改提示词，转向基于 Agent Skills 的可复用反馈闭环。基础 skill 负责领域任务，定时运行的改进 skill 分析人类反馈并提出修改，两者职责清晰分离。

文章说明了为什么低摩擦、带理由的反馈比单纯数量更重要，为什么 skill 应写原则和原因，以及为什么改进器本身需要投入更多设计。Issue 分类案例追踪了一次漏标，从维护者反馈到生成 Pull Request，再到人工批准的完整过程。结尾还讨论了验证、专家反馈、通用改进器模板和组织级指标。
