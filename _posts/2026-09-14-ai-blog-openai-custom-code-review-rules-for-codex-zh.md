---
layout: post
title: Codex 自定义审查规则：把仓库记忆变成聚焦检查
date: '2026-09-14 17:11:07 +0800'
lang: zh
slug: ai-blog-openai-custom-code-review-rules-for-codex
permalink: /zh/posts/ai-blog-openai-custom-code-review-rules-for-codex/
translation_url: /posts/ai-blog-openai-custom-code-review-rules-for-codex/
categories:
  - AI
  - Industry Digest
tags:
  - OpenAI
  - AI Research
reading_time: 5
description: 分析 OpenAI 的 Codex 自定义审查规则、评测结果，以及有范围的仓库指引如何补充 CI。
run_mode: published
sources:
  - publisher: OpenAI
    title: Custom Code Review rules for Codex
    url: 'https://developers.openai.com/blog/custom-code-review-rules-for-codex'
    published_at: '2026-07-20'
    official_zh_url: null
    reuse_policy: summary-only
content_format: summary-source-v2
---

> OpenAI 的自定义 Code Review 规则把审查者反复传递的知识写成有范围的仓库指引。它的价值不是替代测试，而是在 Pull Request 尚可修改时，让关键且不明显的不变量变得可见。

## 编辑摘要

文章从容量问题展开。编码智能体能够生成更大、周期更长的改动，OpenAI 称其每周 PR 数量自第四季度以来增长了一倍以上。代码产量提高后，压力会转移到审查环节：一个看似合理的 Diff 仍可能破坏旧 API 合约、跨越数据边界，或影响作者并不知道的下游使用方。

Codex Code Review 现在可以读取 `AGENTS.md` 中的自定义审查指引。仓库级规则可以放在根目录，服务特定规则则放在所约束文件附近。审查发现能够引用适用规则，让作者同时看到风险和仓库约定的安全修改路径。

OpenAI 用 app-server 的 `rawResponseItem/completed` 通知说明这一机制。该事件虽然标记为实验性，但 Codex Cloud 已经依赖这个线上名称。一次“清理式”重命名可能正常编译，却悄悄破坏真实集成。仓库规则因此明确把这一事件族视为外部接口，并要求保留兼容性或提供向后兼容方案。

它与传统自动化的边界很重要。测试和 Linter 适合确定性条件；仓库规则适合捕捉资深审查者不断解释、却难以编码的判断，例如兼容承诺、安全边界、日志限制和服务间隐含耦合。规则不应变成第二套格式规范。

OpenAI 报告称，在一套评测中，使用规则的变体找回了 98% 的必需自定义发现，而基线对照为 58.3%。评测还考察了对安全改动的克制、常规缺陷发现是否保留，以及结论是否可执行。文章没有公开完整数据集、不确定性或误报数量，因此该百分比应视为特定测试设置下的证据，而不是普遍审查质量分数。

文章给出的写法很务实：

1. 从审查者反复解释、且后果重大的不变量开始。
2. 把规则限制在对应目录或服务。
3. 同时说明风险与可接受的修复路径。
4. 尽量描述稳定结果，而不是容易变化的符号名。
5. 删除持续制造噪声的规则，把机械检查留给 CI。

建议的采用测试也很小：先添加两三条规则，再分别尝试一个违规改动、一个安全反例和一个无关改动。这一点尤其值得复用，因为它把指令视为需要评测的行为，而不是一段听起来准确就算完成的文字。

我的结论是，`AGENTS.md` 正在成为组织记忆与自动审查之间的接口。收益依赖持续整理：窄而明确的规则能提前暴露隐藏约束，宽泛或过时的规则则会制造大量貌似合理却无关的发现。分支保护、测试和必要的人工批准仍是强制层。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### OpenAI：Custom Code Review rules for Codex

- **发布日期：** 2026 年 7 月 20 日
- **作者：** Hari Srikanth
- **英文原文：** [阅读原文](https://developers.openai.com/blog/custom-code-review-rules-for-codex)
- **官方中文版：** 未找到
- **转载说明：** 本文仅作摘要与出处标注，原文版权归 OpenAI 所有。

#### 原文要点

文章解释了 Codex Code Review 如何应用 `AGENTS.md` 中的自定义指令、嵌套文件如何限定范围，以及为什么仓库规则适合测试和 Linter 难以表达的上下文检查。兼容性案例展示了一个能够编译的事件名修改如何破坏现有 Codex Cloud 使用方。

原文还介绍了内部评测、四项审查质量维度、规则编写建议和小规模上线实验，并明确把 Codex 定位为额外审查者，而不是测试、分支保护或必要批准的替代品。
