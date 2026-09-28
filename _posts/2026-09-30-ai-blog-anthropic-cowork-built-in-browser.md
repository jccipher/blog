---
layout: post
title: Cowork's Built-In Browser Separates Delegation from Your Personal Session
date: '2026-09-28 07:53:00 +0800'
publication_date: '2026-10-01'
lang: en
slug: ai-blog-anthropic-cowork-built-in-browser
permalink: /posts/ai-blog-anthropic-cowork-built-in-browser/
translation_url: /zh/posts/ai-blog-anthropic-cowork-built-in-browser/
categories:
  - AI
  - Industry Digest
tags:
  - Anthropic
  - AI Research
reading_time: 3
description: >-
  An analysis of Cowork's isolated built-in browser, its division of labor with
  Claude in Chrome, and its operational safety boundaries.
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

> Cowork's built-in browser creates a useful separation: delegated web work can happen in Claude's browser instead of borrowing the user's entire personal browsing session. That reduces accidental exposure, but it does not remove prompt-injection or credential risk.

## Editorial summary

Anthropic is adding a browser directly to Claude Cowork in the desktop app. When a task needs the web, Claude can open a side-panel browser, navigate pages, read information, click, type, fill forms, and work through portals that do not offer a connector. The user can remain in Cowork rather than installing an extension or handing over an already-open personal tab.

The design introduces a clear division of labor. The built-in browser is intended for delegated work: gather research, retrieve invoices, or complete a bounded portal workflow while the user continues elsewhere. Claude in Chrome remains the better fit when the task concerns the exact page and account session already open in the user's browser, such as an inbox, CRM, or shared document.

Isolation is the strongest product idea here. Claude's browser does not automatically inherit personal tabs, bookmarks, or passwords. Users can import logins one site at a time from supported browsers, while banking, email, and single-sign-on credentials are excluded unless explicitly selected. Existing Claude in Chrome users keep that as the default and can change the preferred browser in settings.

The boundary is helpful, not absolute. Imported credentials still grant real authority, and any agent reading arbitrary pages remains exposed to prompt injection. Anthropic says the built-in browser uses the same probes and action checks as Claude in Chrome, while also recommending that users begin with trusted sites. A separate session limits collateral visibility; it cannot prove that every instruction embedded in a permitted site is benign.

Rollout and availability also shape reliability. The feature is arriving for Pro, Max, and Team plans in the macOS, Windows, and Linux desktop apps, initially in beta, while Enterprise administrators can manage it in organization settings. Web and mobile clients can steer the browser only while the desktop app remains open and online.

For teams, the practical policy should be task-oriented: create a dedicated browser context with the minimum accounts required for the delegated job, keep sensitive identity providers out unless necessary, and require review before consequential submissions or record changes. The distinction between “Claude's browser” and “my browser” is most valuable when access policy preserves it.

My takeaway is that browser isolation is becoming part of agent interface design. A useful assistant should not need the broadest available session merely because a task touches the web. Giving the agent a separate, purpose-scoped workspace makes permission easier to reason about and failure easier to contain.

---

> **Source boundary:** The section below contains a sourced paraphrase and attribution. Unless the metadata records explicit compatible permission, read the complete original at the official link.

## Source material

### Anthropic: Claude gets its own browser in Cowork

- **Published:** August 26, 2026
- **Original:** [Read the article](https://claude.com/blog/cowork-built-in-browser)
- **Official Chinese edition:** Not found
- **Reuse:** Summary and attribution; original copyright remains with Anthropic.

#### What the original covers

The announcement introduces an in-app browser for Claude Cowork that can navigate sites and complete web steps without a separate extension. It contrasts delegated tasks in the isolated built-in browser with work on the user's current page through Claude in Chrome.

The source explains per-site login import, excluded sensitive account categories, browser preference settings, shared prompt-injection safeguards, plan availability, and administrator controls. It also notes that remote steering from web or mobile depends on the desktop application remaining open and online.
