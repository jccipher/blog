---
layout: post
title: 智能体 Skills 需要行为测试，而不只是写得好的说明
date: '2026-09-28 07:53:00 +0800'
publication_date: '2026-09-26'
lang: zh
slug: ai-blog-openai-eval-skills
permalink: /zh/posts/ai-blog-openai-eval-skills/
translation_url: /posts/ai-blog-openai-eval-skills/
categories:
  - AI
  - Industry Digest
tags:
  - OpenAI
  - AI Research
reading_time: 3
description: 解析 OpenAI 用于评估 Skill 路由、执行、风格、效率与回归的系统化方法。
run_mode: published
content_format: summary-source-v2
bilingual_scope: summary
sources:
  - publisher: OpenAI
    title: Testing Agent Skills Systematically with Evals
    url: 'https://developers.openai.com/blog/eval-skills'
    published_at: '2026-01-22'
    official_zh_url: null
    reuse_policy: summary-only
---

> Skill 是可执行行为，因此质量应通过触发测试、轨迹、确定性检查和评分标准衡量，而不能只审查文字。

## 编辑摘要

OpenAI 建议把智能体 Skill 当作一个小型软件产品。在编写说明前先定义结果、过程、风格与效率目标，运行失败时才能分类，而不是事后争论标准。

推荐的测试集刻意保持精简但覆盖不同路径：显式调用、隐式调用、上下文调用和负向对照。手动运行暴露环境与顺序假设，JSONL 轨迹则支持对命令、生成文件、构建结果、token 用量和权限升级进行确定性检查。

规则无法覆盖全部质量维度，因此文章加入人工质检与基于 rubric 的评分，用于评估风格和判断。Skill 成熟后，应把真实失败转化为回归案例，并按风险选择运行时冒烟测试和仓库清洁检查。

这种方法让 Skill 变更可审查，但评估集仍可能过拟合提示词或环境。团队应保留负向对照、轮换真实案例，并区分“成功路由”与“成功完成任务”。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### OpenAI：Testing Agent Skills Systematically with Evals

- **发布日期:** 2026/1/22
- **英文原文:** [阅读原文](https://developers.openai.com/blog/eval-skills)
- **转载说明:** 本文仅作摘要与出处标注，原文版权归 OpenAI 所有。

#### 原文要点

原文依次说明如何定义成功、编写示例 Skill、手动触发、设计显式与隐式提示集、使用 JSONL 确定性评分器和 rubric 质检，并补充命令、token、构建、运行时、仓库清洁度与沙箱权限检查。
