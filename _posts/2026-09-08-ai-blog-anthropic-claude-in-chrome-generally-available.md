---
layout: post
title: "Claude in Chrome: Autonomy Moves the Risk Boundary"
date: '2026-09-08 14:06:14 +0800'
lang: en
slug: ai-blog-anthropic-claude-in-chrome-generally-available
permalink: /posts/ai-blog-anthropic-claude-in-chrome-generally-available/
translation_url: /zh/posts/ai-blog-anthropic-claude-in-chrome-generally-available/
categories: [AI, Industry Digest]
tags: [Anthropic, AI Research]
reading_time: 4
description: "An analysis of Claude in Chrome's broader availability, autonomous actions, layered prompt-injection defenses, and remaining risk."
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

> General availability makes Claude in Chrome easier to deploy, but autonomous approval changes the security question. The important control is no longer whether the agent can click; it is how content, intent, and each proposed action are checked before the click occurs.

## Editorial summary

Anthropic says Claude in Chrome is now available on every paid Claude plan. The extension can work across tabs and interact with sites that lack native connectors, including internal dashboards, legacy systems, and vendor portals, while using the accounts already signed in to the browser.

The product change with the largest risk impact is automatic action approval. Instead of asking a person to approve each navigation, click, or text entry, Claude can approve actions it judges safe. A classifier compares the proposed action with the user's original request and blocks mismatches; users can turn the feature off and return to manual approval.

Anthropic frames the release around layered prompt-injection defenses. Web content enters the model through tool results, so trained probes inspect those results for suspicious instructions and warn Claude to treat them cautiously. The company also trains against a growing attack library assembled from automated attackers, external red teams, and real-world monitoring. Successful attacks are fed back into later training and deployed safeguards.

The published evaluation numbers are useful but need careful reading. On a stronger current attack set, attacks reaching an unprotected model succeeded 17.6% of the time against Opus 4.5 and 3.8% against Opus 5. With probes and the automatic-approval classifier, Anthropic reports no successful attacks against Sonnet 5, Opus 5, or Mythos 5, and a 0.3% success rate against Fable 5; the surviving cases were manually classified as low severity.

Those results do not prove that browser agents are permanently safe. Anthropic explicitly describes prompt injection as a moving target, and the comparison spans changed models, stronger attacks, a new grading pipeline, and manual review. A zero observed rate is evidence about a particular harness and sample, not a mathematical guarantee about every future page.

For operators, three boundaries matter:

1. **Approval automation should remain reversible.** Teams with sensitive workflows need an easy path back to per-action confirmation.
2. **Domain policy narrows exposure.** Enterprise administrators can limit the extension to approved domains, reducing where authenticated browser access is available.
3. **Browser access is not desktop access.** The extension works in Chrome; local files and other applications still require the desktop app, and mobile and other Chromium browsers are not supported in this release.

My takeaway is that autonomy should be measured by the quality of its interruption policy, not by the absence of interruptions. The best browser agent is not the one that clicks most freely; it is the one that reliably distinguishes routine progress from a moment when content, intent, or consequence demands human review.

---

> **Source boundary:** Source attribution follows; narration covers the summary only.

## Source material

### Anthropic: Claude in Chrome is generally available

- **Published:** August 26, 2026
- **Original:** [Read the article](https://claude.com/blog/claude-in-chrome-generally-available)
- **Official Chinese edition:** Not found
- **Reuse:** Summary and attribution; original copyright remains with Anthropic.

#### What the original covers

The announcement expands Claude in Chrome to all paid Claude plans and introduces autonomous action approval guarded by a safety classifier. It explains how the extension can read and operate websites through existing browser sessions, including systems without connectors.

Most of the article describes prompt-injection defenses: training on evolving attacks, probes that screen tool results, action classifiers that compare a planned action with the user's request, and updated red-team evaluations. It reports results for several Claude 5 models, explains changes in the evaluation and grading setup, and closes with installation, enterprise domain controls, and platform limitations.
