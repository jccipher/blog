---
layout: post
title: 'Custom Codex Review Rules: Turn Repository Memory into Focused Checks'
date: '2026-09-14 17:11:07 +0800'
lang: en
slug: ai-blog-openai-custom-code-review-rules-for-codex
permalink: /posts/ai-blog-openai-custom-code-review-rules-for-codex/
translation_url: /zh/posts/ai-blog-openai-custom-code-review-rules-for-codex/
categories:
  - AI
  - Industry Digest
tags:
  - OpenAI
  - AI Research
reading_time: 5
description: >-
  An analysis of OpenAI's custom Codex review rules, their evaluation results,
  and how scoped repository guidance complements CI.
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

> OpenAI's custom Code Review rules turn recurring reviewer knowledge into scoped repository guidance. Their value is not replacing tests; it is making consequential, non-obvious invariants visible at the moment a pull request can still be changed.

## Editorial summary

The article starts from a capacity problem. Coding agents can produce larger changes over longer periods, and OpenAI says its weekly pull-request volume has more than doubled since Q4. More code shifts pressure toward review, where a plausible diff can still violate an old API contract, cross a data boundary, or break a consumer the author does not know exists.

Codex Code Review can now read custom review guidance from `AGENTS.md`. Repository-wide rules can live at the root, while service-specific rules can sit closer to the files they govern. A finding can cite the applicable guidance, giving an author both the concern and the repository's intended safe path.

OpenAI illustrates the idea with the `rawResponseItem/completed` app-server notification. Although marked experimental, Codex Cloud consumes that wire name. A cleanup that renames it could compile while silently breaking a real integration. A repository rule calls out the event family as an external surface and asks reviewers to preserve compatibility or add a backward-compatible alternative.

The distinction from conventional automation matters. Tests and linters are best for deterministic conditions. Repository rules capture judgment that is hard to encode but repeatedly explained by experienced reviewers: compatibility promises, security boundaries, logging restrictions, or known coupling between services. They should not become a second style guide.

OpenAI reports an evaluation in which rule-guided variants recovered 98% of required custom findings, compared with 58.3% for the baseline control. The evaluation also considered restraint on safe changes, retention of ordinary bug finding, and actionability. The article does not provide the complete suite, uncertainty estimates, or false-positive counts, so the percentage should be treated as evidence for this tested setup rather than a universal review-quality score.

The writing guidance is pragmatic:

1. Start with a consequential invariant reviewers repeatedly explain.
2. Scope guidance to the directory or service it governs.
3. State both the risk and an acceptable repair path.
4. Describe durable outcomes instead of fragile symbol names where possible.
5. Remove rules that create noise, and leave mechanical checks in CI.

The proposed adoption test is small: add two or three rules, open a representative pull request, and try one violating change, one safe counterexample, and one unrelated change. That is a useful operational pattern because it treats instructions as behavior that must be evaluated, not prose that is correct merely because it sounds precise.

My takeaway is that `AGENTS.md` becomes an interface between institutional memory and automated review. The gain depends on curation. Narrow rules can expose hidden constraints early; broad or stale rules can flood authors with plausible but irrelevant findings. Branch protection, tests, and required human approvals remain the enforcement layer.

---

> **Source boundary:** The section below contains a sourced paraphrase and attribution. Unless the metadata records explicit compatible permission, read the complete original at the official link.

## Source material

### OpenAI: Custom Code Review rules for Codex

- **Published:** July 20, 2026
- **Author:** Hari Srikanth
- **Original:** [Read the article](https://developers.openai.com/blog/custom-code-review-rules-for-codex)
- **Official Chinese edition:** Not found
- **Reuse:** Summary and attribution; original copyright remains with OpenAI.

#### What the original covers

The article explains how Codex Code Review applies custom instructions from `AGENTS.md`, how nested files scope guidance, and why repository rules are useful for contextual checks that tests and linters do not express well. A compatibility example shows how a compiling event-name change could break an existing Codex Cloud consumer.

It also describes an internal evaluation, four review-quality dimensions, rule-writing recommendations, and a small rollout experiment. OpenAI explicitly positions Codex as an additional reviewer rather than a replacement for tests, branch protections, or required approvals.
