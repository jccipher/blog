---
layout: post
title: Cowork 内置浏览器：把委托任务与个人会话分开
date: '2026-09-28 07:53:00 +0800'
lang: zh
slug: ai-blog-anthropic-cowork-built-in-browser
permalink: /zh/posts/ai-blog-anthropic-cowork-built-in-browser/
translation_url: /posts/ai-blog-anthropic-cowork-built-in-browser/
categories:
  - AI
  - Industry Digest
tags:
  - Anthropic
  - AI Research
reading_time: 3
description: 解析 Cowork 的隔离式内置浏览器、它与 Claude in Chrome 的分工及实际安全边界。
run_mode: published
sources:
  - publisher: Anthropic
    title: Claude gets its own browser in Cowork
    url: 'https://claude.com/blog/cowork-built-in-browser'
    published_at: '2026-08-26'
    official_zh_url: null
    reuse_policy: summary-only
content_format: summary-source-v2
---

> Cowork 的内置浏览器建立了一层有用的分隔：委托给 Claude 的网页工作可以在“Claude 的浏览器”里完成，而不必借用用户完整的个人浏览会话。这样能减少意外暴露，但不会消除提示词注入和凭据风险。

## 编辑摘要

Anthropic 正在 Claude Cowork 桌面端内直接加入浏览器。任务需要访问网页时，Claude 可以在侧边栏打开独立浏览器，导航、阅读、点击、输入、填写表单，并处理没有连接器的门户。用户可以继续留在 Cowork，无需安装扩展，也不必交出已经打开的个人标签页。

这项设计给两种浏览器方式划出了明确分工。内置浏览器适合委托型任务，例如收集研究资料、下载本月账单，或完成边界清晰的门户流程；当任务就是操作用户眼前已经打开、已有登录态的页面——例如收件箱、CRM 或共享文档——Claude in Chrome 仍然更合适。

隔离是这里最重要的产品思路。Claude 的浏览器不会自动继承个人标签页、书签或密码。用户可以从支持的浏览器按站点导入登录信息；银行、邮箱和单点登录凭据默认排除，除非用户明确选择。已经使用 Claude in Chrome 的人会继续以它为默认，也可以在设置中切换偏好浏览器。

不过，隔离只是降低范围，并非绝对安全。导入的凭据仍然代表真实权限，读取任意网页的智能体也仍会面对提示词注入。Anthropic 表示内置浏览器采用与 Claude in Chrome 相同的探针和动作检查，并建议先从可信网站开始。独立会话能减少旁路可见性，却无法证明获准网站中的每条隐藏指令都是善意的。

部署条件也会影响可靠性。功能将面向 Pro、Max 与 Team 计划，在 macOS、Windows 和 Linux 桌面端陆续推出，初期标注为 beta；Enterprise 管理员可以通过组织设置进行管理。网页端和移动端能够远程驱动这一浏览器，但前提是桌面应用保持打开并联网。

团队的实际策略应围绕任务来设计：为委托工作建立专用浏览上下文，只导入完成任务所需的最少账号；非必要时不要加入敏感身份系统；在提交表单或改动正式记录前保留人工复核。“Claude 的浏览器”和“我的浏览器”这一区别，只有在权限策略继续维护它时才真正有价值。

我的结论是，浏览器隔离正在成为智能体界面设计的一部分。任务碰到网页，并不意味着助手必须拿到范围最大的现有会话。给智能体一个独立、按用途授权的工作空间，会让权限更容易理解，也让故障更容易被限制。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### Anthropic：Claude gets its own browser in Cowork

- **发布日期：** 2026 年 8 月 26 日
- **英文原文：** [阅读原文](https://claude.com/blog/cowork-built-in-browser)
- **官方中文版：** 未找到
- **转载说明：** 本文仅作摘要与出处标注，原文版权归 Anthropic 所有。

#### 原文要点

原文介绍 Claude Cowork 的应用内浏览器。它能够导航网站并完成网页步骤，无需额外安装扩展，同时把独立浏览器里的委托任务与 Claude in Chrome 对当前个人页面的操作区分开来。

文章还说明了按站点导入登录信息、敏感账号默认排除、浏览器偏好设置、共用的提示词注入防护、不同计划的开放范围与管理员控制，并指出网页端或移动端远程驱动依赖桌面应用持续在线。
