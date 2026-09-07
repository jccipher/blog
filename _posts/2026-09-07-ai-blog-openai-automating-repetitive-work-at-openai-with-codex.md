---
layout: post
title: "Codex and Runme: Turn Repetition into Reviewable Operational Memory"
date: 2026-09-07 07:37:30 +0800
lang: en
slug: ai-blog-openai-automating-repetitive-work-at-openai-with-codex
permalink: /posts/ai-blog-openai-automating-repetitive-work-at-openai-with-codex/
translation_url: /zh/posts/ai-blog-openai-automating-repetitive-work-at-openai-with-codex/
categories: [AI, Industry Digest]
tags: [OpenAI, AI Research]
reading_time: 5
description: "An analysis of how OpenAI's Runme workflow combines Codex, review gates, WebMCP, and reusable operational records."
run_mode: published
sources:
  - publisher: OpenAI
    title: "Automating repetitive work at OpenAI with Codex"
    url: "https://developers.openai.com/blog/automating-repetitive-work-at-openai-with-codex"
    published_at: "2026-08-25"
    official_zh_url: null
    reuse_policy: summary-only
---

> Jeremy Lewi's Runme case study treats repetitive engineering work as a context and governance problem, not merely a scripting problem. Codex executes inside a notebook that preserves the goal, approval points, commands, evidence, dead ends, and decisions for the next run.

## Editorial summary

OpenAI engineer Jeremy Lewi describes a recurring pattern from cloud infrastructure and model evaluations: after solving a difficult operational task, another similar task arrives with different quotas, configuration details, or failure modes. Conventional automation can remove stable steps, but creating and maintaining a separate tool for every changing workflow can become another layer of work.

His alternative is Runme, an open-source notebook application built to collaborate with Codex. A notebook combines Markdown, executable code cells, HTML, instructions, outputs, tables, and charts. Instead of asking an agent to infer an entire process from chat history, Lewi writes a short goal, asks it to review a previous run, requires a detailed plan, sets an approval point before execution, and instructs it to record commands, results, and interpretation.

The notebook is more than a convenient interface. It gives the workflow a durable state that both a person and an agent can inspect. During an evaluation run, Codex updates the plan and records progress. Lewi concentrates on consequential forks—choosing an evaluation system, deciding whether new infrastructure is justified, or suggesting an approved fallback when quota blocks provisioning. The final artifact captures successful steps and dead ends, along with the reasons behind decisions that would otherwise disappear inside a conversation.

Runme notebooks can be stored in Google Drive, and each notebook produces a companion `*.index.md` file that Drive can index. This turns past runs into discoverable context without introducing a separate document repository. The design is intentionally cumulative: a completed run improves the materials available to the next run, so operational knowledge becomes a maintained input rather than a retrospective chore.

Agents interact with the client-side Runme application through WebMCP. The application registers browser tools for reading its instructions and documentation and for running bounded JavaScript that reads or updates notebook content. Because Runme is a static web application, browser-side tools avoid adding a server only to expose an MCP endpoint and keep the notebook interaction close to where its data is already handled.

Four practices are broadly reusable:

1. **Make the goal an artifact.** A persistent, editable goal is easier to review than intent scattered across chat turns, and it gives long-running work a stable reference point.
2. **Put approvals at decision boundaries.** Human review is most useful before costly or consequential action, not as continuous supervision of every mechanical step.
3. **Record interpretation beside output.** A command transcript alone does not explain whether a result is healthy, why an alternative was rejected, or what should change next time.
4. **Design memory for retrieval.** Useful history must be searchable and compact enough for an agent to find the relevant precedent; merely accumulating notebooks is not knowledge management.

The article is a first-person workflow account, not a benchmark. It does not quantify total time saved, intervention frequency, notebook maintenance cost, or how often a previous run remains applicable. The approach also depends on disciplined curation. Incorrect or stale conclusions can become highly discoverable, and a detailed record can expose operational information unless storage permissions and retention are managed carefully.

WebMCP reduces integration infrastructure, but browser-side tools still require narrow capabilities, visible data boundaries, and review of consequential actions. Likewise, automatic approval review does not remove the need for explicit human ownership of choices such as provisioning infrastructure or changing an evaluation configuration.

My main takeaway is that the highest-leverage automation target is not the command sequence; it is the loss of context between runs. Runme makes the work product and the operating manual the same artifact. When that artifact preserves evidence, constraints, approvals, and reasoning, an agent can take on more repetition without forcing people to surrender the decisions that shape risk.

## Source material

### OpenAI: Automating repetitive work at OpenAI with Codex

- **Published:** August 25, 2026
- **Author:** Jeremy Lewi
- **Original:** [Read the article](https://developers.openai.com/blog/automating-repetitive-work-at-openai-with-codex)
- **Official Chinese edition:** Not found
- **Reuse:** Summary and attribution; original copyright remains with OpenAI.

#### What the original covers

Lewi recounts repetitive work from provisioning Kubernetes clusters and running evaluations for new models and features. He explains that he now uses Codex with Runme rather than building a separate fixed automation for every recurring task.

A Runme notebook begins with a goal and instructions to examine prior work, propose a plan, wait for approval, and document execution. Codex updates the notebook while it works; Lewi reviews the plan, helps choose among consequential alternatives, and suggests approved options when constraints such as exhausted quota block the initial route.

The resulting notebook retains commands, output, interpretation, decisions, and unsuccessful paths. Runme supports mixed Markdown, code, HTML, tables, and charts, stores notebooks in Google Drive, and creates a Markdown index that makes previous runs easier for an agent to discover.

The article also describes Runme's use of WebMCP to register browser-side tools in a static client application. Those tools expose bounded notebook operations and documentation without requiring a new server-side MCP service. The closing argument is that capturing intent and evidence during execution can make operational knowledge reusable while preserving human review for the decisions that matter.
