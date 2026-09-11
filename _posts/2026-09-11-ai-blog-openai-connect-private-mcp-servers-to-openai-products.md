---
layout: post
title: 'Secure MCP Tunnel: Reverse Reachability Without a Public Server'
date: '2026-09-11 11:26:14 +0800'
lang: en
slug: ai-blog-openai-connect-private-mcp-servers-to-openai-products
permalink: /posts/ai-blog-openai-connect-private-mcp-servers-to-openai-products/
translation_url: /zh/posts/ai-blog-openai-connect-private-mcp-servers-to-openai-products/
categories:
  - AI
  - Industry Digest
tags:
  - OpenAI
  - AI Research
reading_time: 5
description: >-
  An analysis of OpenAI's Secure MCP Tunnel architecture, outbound-only
  transport, explicit trust boundaries, and operational tradeoffs.
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

> OpenAI's Secure MCP Tunnel reverses the usual reachability problem: a customer-run client inside the private network opens an outbound HTTPS path, while the MCP server never accepts inbound public traffic. The architecture narrows connectivity, but does not remove the need to reason about trust.

## Editorial summary

Many valuable MCP servers live on enterprise networks, developer laptops, or private service meshes. Connecting them to a hosted AI product has often meant publishing an endpoint, adding a third-party tunnel, or building VPN or peering infrastructure. Each choice changes the security or operating model: public exposure weakens a boundary, another tunnel provider adds a vendor to the trust path, and broad network connectivity may exceed what one tool integration needs.

Secure MCP Tunnel places a small client next to the private server. That client authenticates to OpenAI and establishes an outbound HTTPS connection. OpenAI products send MCP JSON-RPC requests to a hosted tunnel endpoint; the service queues work for a tunnel, the private-side client collects it, forwards it to an approved local server, and returns responses or notifications through the same path.

OpenAI deliberately began with long polling. Outbound HTTPS works with familiar firewalls and proxies, while client-side polling supplies a natural backpressure point. The tunnel can relay intermediate server-sent events when streaming is requested. This is operationally less novel than a permanent inbound route, though reliability, latency, queue limits, and reconnection behavior still need production testing.

The trust boundary remains explicit. Tunnel identity is tied to existing OpenAI organization and workspace context; the private MCP address is used only inside the customer environment. The client is open source and customer-run, so security teams can inspect its outbound connection, forwarding behavior, and destination configuration. Local health checks, logs, readiness, and an admin interface support diagnosis.

Enterprise authentication is treated as part of the design. OAuth discovery can traverse the tunnel, and the client supports custom certificate authorities, proxies, and MCP-side mutual TLS. The tunnel does not automatically expose related systems: a private authorization server must still be reachable by the component performing OAuth. That constraint helps keep the path narrow.

The article also introduces Harpoon for approved private REST targets. Customers register labeled destinations and constrain methods, response size, timeouts, redirects, and access. This extends the model beyond MCP without turning it into a general network bridge.

Four review questions matter before adoption:

1. Which local destinations and methods can each tunnel identity reach?
2. What request, response, and metadata are visible to the hosted relay?
3. How are credentials rotated, logs retained, and compromised clients revoked?
4. What happens during disconnects, duplicate delivery, backpressure, and partial streaming failure?

The source explains design intent, not a formal threat model or benchmark. It does not publish availability targets, latency distributions, independent security review, or failure-injection results. My takeaway is that outbound-only reachability is a useful primitive precisely because it preserves a familiar private boundary. Its safety still depends on narrow configuration, auditable client behavior, and disciplined identity management.

---

> **Source boundary:** The section below contains a sourced paraphrase and attribution. Unless the metadata records explicit compatible permission, read the complete original at the official link.

## Source material

### OpenAI: Making private MCP servers reachable without making them public

- **Published:** June 26, 2026
- **Author:** Denys Kurylenko
- **Original:** [Read the article](https://developers.openai.com/blog/connect-private-mcp-servers-to-openai-products)
- **Official Chinese edition:** Not found
- **Reuse:** Summary and attribution; original copyright remains with OpenAI.

#### What the original covers

OpenAI describes Secure MCP Tunnel, an outbound HTTPS connection from a customer-run client to an OpenAI-hosted relay. The design supports MCP requests, notifications, streaming, OAuth discovery, private certificate authorities, proxies, and mutual TLS while keeping the actual MCP address inside the customer network.

The article compares this narrow path with public endpoints, third-party tunnels, and broad VPN or peering arrangements. It also explains the open-source client, local diagnostic tooling, a Codex setup plugin, and Harpoon's labeled access to approved private REST APIs.
