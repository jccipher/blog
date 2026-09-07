---
layout: post
title: Self-Improving Agents Need a Reviewable Feedback Loop
date: '2026-09-08 05:03:24 +0800'
lang: en
slug: ai-blog-anthropic-how-warp-builds-self-improving-agents-on-claude
permalink: /posts/ai-blog-anthropic-how-warp-builds-self-improving-agents-on-claude/
translation_url: /zh/posts/ai-blog-anthropic-how-warp-builds-self-improving-agents-on-claude/
categories:
  - AI
  - Industry Digest
tags:
  - Anthropic
  - AI Research
reading_time: 4
description: >-
  An analysis of Warp's two-skill pattern for turning human feedback into small,
  reviewable improvements to production agents.
run_mode: published
sources:
  - publisher: Anthropic
    title: How Warp builds self-improving agents on Claude
    url: 'https://claude.com/blog/how-warp-builds-self-improving-agents-on-claude'
    published_at: '2026-08-26'
    official_zh_url: null
    reuse_policy: summary-only
---

> Warp's pattern is deliberately modest: keep an agent's domain instructions in one skill, let a second skill study accumulated human feedback, and turn recurring lessons into a small proposed change. The improvement becomes durable only after people review and merge it.

## Editorial summary

Anthropic's case study begins with a familiar production failure. Warp's code-review agent could complete most of a task, yet its low-value comments created enough noise to undermine trust. Manual prompt edits and better repository context helped, but neither solved the deeper problem: feedback disappeared at the end of each session.

Warp answered with a two-skill loop. The inner, or base, skill contains the instructions and domain knowledge used during the task. People react to the resulting work where they already collaborate—a pull request or issue—and useful feedback includes the reason a suggestion was right or wrong. A scheduled outer, or improver, skill gathers those signals, compares the agent's output with the human response, and proposes a focused edit to the base skill.

The plain-file format is an important control, not merely a storage choice. A skill change can be diffed, discussed, approved, and merged through the same workflow as code. The next agent run inherits the accepted lesson, while rejected or misleading feedback does not silently rewrite production behavior.

Warp demonstrates the loop with issue triage. A first pass missed a `ready to spec` label; a maintainer explained both the missing label and the reasoning behind it. The scheduled improver gathered that evidence and opened a pull request containing the smallest corresponding rule change. This makes the learning path inspectable from observation to proposed update.

Several operational lessons generalize beyond triage:

1. **Capture reasons, not just votes.** A binary reaction measures preference, while a concrete explanation supplies reusable domain knowledge.
2. **Separate execution from improvement.** The task agent should not rewrite its own instructions opportunistically during the same run.
3. **Keep the delta narrow.** Small edits are easier to attribute, test, review, and reverse.
4. **Build verification first.** Golden examples, deterministic checks, and outcome metrics make it possible to distinguish genuine improvement from adaptation to noisy feedback.

The source is a company case study rather than a controlled evaluation. It reports scale and operating practices, but it does not quantify review-quality gains, false-positive reduction, or the maintenance cost of the improver. The pattern also transfers risk into curation: a large volume of weak feedback can degrade a skill unless authority, evidence quality, and approval boundaries are explicit.

My takeaway is that a self-improving agent should look less like a model changing itself and more like a disciplined maintenance system. Feedback becomes a candidate patch, verification tests the patch, and a person owns the merge. That structure lets learning compound without making production instructions invisible or unaccountable.

## Source material

### Anthropic: How Warp builds self-improving agents on Claude

- **Published:** August 26, 2026
- **Author:** Michael Segner
- **Original:** [Read the article](https://claude.com/blog/how-warp-builds-self-improving-agents-on-claude)
- **Official Chinese edition:** Not found
- **Reuse:** Summary and attribution; original copyright remains with Anthropic.

#### What the original covers

The article describes Warp's move from one-off prompt repair to a reusable feedback loop built with Agent Skills. It distinguishes the base skill that performs a domain task from the scheduled improver skill that analyzes human feedback and proposes edits.

It explains why detailed, low-friction feedback is more useful than raw volume, why skills should state principles and rationale, and why the improver deserves careful design. The issue-triage example follows a missed label from maintainer feedback through a generated pull request and human approval. The source closes with guidance on verification, expert feedback, reusable improver templates, and organization-level metrics.
