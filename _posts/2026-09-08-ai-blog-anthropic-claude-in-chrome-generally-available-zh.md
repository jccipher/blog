---
layout: post
title: "Claude in Chrome 全面开放：自主操作重新划定风险边界"
date: '2026-09-08 14:06:14 +0800'
lang: zh
slug: ai-blog-anthropic-claude-in-chrome-generally-available
permalink: /zh/posts/ai-blog-anthropic-claude-in-chrome-generally-available/
translation_url: /posts/ai-blog-anthropic-claude-in-chrome-generally-available/
categories: [AI, Industry Digest]
tags: [Anthropic, AI Research]
reading_time: 4
description: "解析 Claude in Chrome 的全面开放、自主操作、分层提示词注入防御与仍然存在的风险。"
run_mode: published
content_format: summary-source-v2
bilingual_scope: summary
sources:
  - publisher: Anthropic
    title: "Claude in Chrome is generally available"
    url: "https://claude.com/blog/claude-in-chrome-generally-available"
    published_at: "2026-08-26"
    official_zh_url: null
    reuse_policy: summary-only
---

> Claude in Chrome 全面开放后更容易部署，但自动批准操作改变了安全问题的重心。关键不再是智能体能否点击，而是网页内容、用户意图和每个拟执行动作，能否在点击前得到可靠校验。

## 编辑摘要

Anthropic 宣布 Claude in Chrome 已面向所有付费 Claude 计划开放。扩展可以跨标签页工作，并操作没有原生连接器的网站，包括内部仪表盘、遗留系统和供应商门户，同时沿用浏览器中已经登录的账号。

风险影响最大的变化，是自动批准操作。Claude 不再必须为每次导航、点击或文本输入请求人工确认，而可以自行批准它判断为安全的动作。安全分类器会把拟执行动作与用户最初的请求进行比较，发现不一致就阻止；用户也可以关闭该功能，恢复逐项确认。

Anthropic 用分层的提示词注入防御解释为什么现在扩大开放。网页内容通过工具结果进入模型，因此专门训练的探针会先检查结果中是否存在可疑指令，并提醒 Claude 谨慎处理。公司还持续扩充攻击样本库，来源包括自动攻击系统、外部红队与真实世界监控；一旦当前模型被新攻击突破，相应样本会进入后续训练和线上防护。

文章给出的评测数字很有价值，但需要谨慎解读。在更强的新攻击集上，攻击到达未附加额外防护的模型后，Opus 4.5 的成功率为 17.6%，Opus 5 为 3.8%。加入探针和自动批准分类器后，Anthropic 报告 Sonnet 5、Opus 5 与 Mythos 5 没有成功攻击，Fable 5 为 0.3%；人工复核认为残留成功案例均属低严重度。

这些结果并不意味着浏览器智能体从此绝对安全。Anthropic 明确说提示词注入仍在演化；不同结果还涉及模型、攻击集、评分流程和人工复核方式的变化。观测到零成功率，只能说明特定样本和测试框架下的表现，不能变成对所有未来网页的数学保证。

实际部署时有三条边界值得保留：

1. **自动批准必须可以随时撤回。** 处理敏感业务的团队需要快速恢复到逐项人工确认。
2. **域名策略可以收窄暴露面。** 企业管理员能够限制扩展只在批准域名运行，减少带登录态访问的范围。
3. **浏览器权限不等于桌面权限。** 此版本只支持 Chrome；访问本地文件和其他应用仍需桌面端，也尚未覆盖移动端和其他 Chromium 浏览器。

我的结论是，自主性的质量不应按“少打断人多少次”衡量，而应看中断策略是否准确。优秀的浏览器智能体不是点击得最自由，而是能稳定区分日常推进与那些必须因内容、意图或后果而请人复核的时刻。

---

> **来源分界：** 原文出处如下；语音仅覆盖摘要。

## 来源材料

### Anthropic：Claude in Chrome is generally available

- **发布日期：** 2026 年 8 月 26 日
- **英文原文：** [阅读原文](https://claude.com/blog/claude-in-chrome-generally-available)
- **官方中文版：** 未找到
- **转载说明：** 本文仅作摘要与出处标注，原文版权归 Anthropic 所有。

#### 原文要点

原文宣布 Claude in Chrome 向所有付费计划开放，并引入由安全分类器保护的自动操作批准。扩展可通过已有浏览器会话阅读和操作网站，也能覆盖没有连接器的系统。

文章的大部分篇幅用于介绍提示词注入防御，包括持续更新的攻击训练集、检查工具结果的探针、把动作与用户请求对照的分类器，以及升级后的红队评测。结尾列出了安装方式、企业域名控制与当前平台限制。
