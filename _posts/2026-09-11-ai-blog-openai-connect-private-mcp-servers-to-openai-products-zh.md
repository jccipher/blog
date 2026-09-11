---
layout: post
title: Secure MCP Tunnel：无需公开服务器的反向可达性
date: '2026-09-11 11:26:14 +0800'
lang: zh
slug: ai-blog-openai-connect-private-mcp-servers-to-openai-products
permalink: /zh/posts/ai-blog-openai-connect-private-mcp-servers-to-openai-products/
translation_url: /posts/ai-blog-openai-connect-private-mcp-servers-to-openai-products/
categories:
  - AI
  - Industry Digest
tags:
  - OpenAI
  - AI Research
reading_time: 5
description: 分析 OpenAI Secure MCP Tunnel 的仅出站架构、显式信任边界和运营权衡。
run_mode: published
sources:
  - publisher: OpenAI
    title: Making private MCP servers reachable without making them public
    url: >-
      https://developers.openai.com/blog/connect-private-mcp-servers-to-openai-products
    published_at: '2026-06-26'
    official_zh_url: null
    reuse_policy: summary-only
content_format: summary-source-v2
---

> OpenAI 的 Secure MCP Tunnel 反转了通常的可达性问题：私有网络中的客户侧客户端主动建立出站 HTTPS 路径，而 MCP 服务器不接收入站公网流量。架构缩窄了连接范围，却没有消除信任分析。

## 编辑摘要

许多高价值 MCP 服务器运行在企业网络、开发者笔记本或私有 Service Mesh 中。过去要让托管 AI 产品访问它们，团队往往需要公开端点、引入第三方隧道，或搭建 VPN 与网络对等连接。每个方案都会改变安全或运营模型：公网暴露削弱边界，第三方隧道把新供应商加入信任链，而广泛网络互通可能远超单个工具集成的需要。

Secure MCP Tunnel 在私有服务器旁运行一个小型客户端。客户端向 OpenAI 认证并主动建立出站 HTTPS 连接。OpenAI 产品把 MCP JSON-RPC 请求发送到托管隧道端点；服务为特定隧道排队，私有侧客户端取回请求、转发给获准的本地服务器，再沿同一路径返回响应或通知。

OpenAI 有意从长轮询开始。出站 HTTPS 更容易适配既有防火墙和代理，客户端轮询也提供天然的背压点。请求流式结果时，隧道可以转发中间的 Server-Sent Events。这比永久入站连接更符合常见运维方式，但可靠性、延迟、队列上限与重连行为仍需要生产验证。

信任边界仍然清晰。隧道身份与既有 OpenAI 组织和 Workspace 上下文绑定，私有 MCP 地址只在客户环境中使用。客户端开源且由客户运行，安全团队可以检查其出站连接、转发逻辑和目标配置。本地健康检查、日志、就绪状态与管理界面用于诊断问题。

企业认证也被纳入设计。OAuth Discovery 可以通过隧道进行，客户端支持自定义 CA、代理和 MCP 侧 mTLS。隧道不会自动暴露所有关联系统：如果授权服务器也是私有的，执行 OAuth 的组件仍必须能够访问它。这种限制有助于保持通道狭窄。

文章还介绍了面向获准私有 REST 目标的 Harpoon。客户注册带标签的目标，并限制方法、响应大小、超时、重定向和访问控制。这把同一模型扩展到 MCP 之外，同时避免成为通用网络桥梁。

采用前应重点回答四个问题：

1. 每个隧道身份能够访问哪些本地目标和方法？
2. 托管中继能看到哪些请求、响应与元数据？
3. 凭据如何轮换，日志保留多久，受损客户端如何撤销？
4. 断线、重复交付、背压和部分流式失败时会发生什么？

原文解释的是设计意图，不是正式威胁模型或性能基准。它没有公布可用性目标、延迟分布、独立安全审查或故障注入结果。我的结论是，仅出站可达性之所以有价值，正是因为它保留了熟悉的私有边界；实际安全性仍依赖窄配置、可审计客户端行为和严格身份管理。

---

> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。

## 来源材料

### OpenAI：Making private MCP servers reachable without making them public

- **发布日期：** 2026 年 6 月 26 日
- **作者：** Denys Kurylenko
- **英文原文：** [阅读原文](https://developers.openai.com/blog/connect-private-mcp-servers-to-openai-products)
- **官方中文版：** 未找到
- **转载说明：** 本文仅作摘要与出处标注，原文版权归 OpenAI 所有。

#### 原文要点

OpenAI 介绍了 Secure MCP Tunnel：客户侧客户端通过出站 HTTPS 连接 OpenAI 托管中继。该设计支持 MCP 请求、通知、流式传输、OAuth Discovery、自定义 CA、代理和双向 TLS，同时把真实 MCP 地址留在客户网络内部。

文章比较了这条窄通道与公网端点、第三方隧道、VPN 或网络对等连接，并介绍开源客户端、本地诊断工具、Codex 配置插件，以及 Harpoon 对获准私有 REST API 的标签化访问。
