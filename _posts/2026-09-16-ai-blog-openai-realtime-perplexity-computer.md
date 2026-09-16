---
layout: post
title: How Perplexity Brought Voice Search to Millions Using the Realtime API
description: >-
  Perplexity, a company focused on building user-friendly products, used
  OpenAI's Realtime-1.5 API to enhance voice interaction in its products, such
  as Perplexity Comet and Perplexity Computer. This editorial summary explores
  the strategies, challenges, and lessons learned from integrating voice search
  into their platforms.
date: '2026-09-16 12:40:44 +0800'
lang: en
slug: ai-blog-openai-realtime-perplexity-computer
permalink: /posts/ai-blog-openai-realtime-perplexity-computer/
translation_url: /zh/posts/ai-blog-openai-realtime-perplexity-computer/
categories:
  - AI
  - Industry Digest
tags:
  - OpenAI
  - AI Research
reading_time: 3
run_mode: published
content_format: summary-source-v2
bilingual_scope: summary
sources:
  - publisher: OpenAI
    title: How Perplexity Brought Voice Search to Millions Using the Realtime API
    url: 'https://developers.openai.com/blog/realtime-perplexity-computer'
    published_at: '2026-03-25'
    official_zh_url: null
    reuse_policy: summary-only
---
> Perplexity leveraged Realtime-1.5 to enable voice-based interaction in its products, aiming to improve usability and user experience. The company faced challenges with context management, audio standardization, environmental tuning, and tool distribution, which are detailed in this summary.

## Editorial summary

Perplexity, a company focused on creating user-friendly products, used OpenAI's Realtime-1.5 API to bring voice interaction to its platforms, including Perplexity Comet and Perplexity Computer. The company aimed to make these products fully usable through voice, emphasizing the satisfaction of being able to simply say what one wants and watch it be executed. Realtime-1.5 was used in production to manage millions of voice sessions monthly. However, the integration of voice search brought several challenges, including context management, audio standardization across different platforms, tuning for real-world environments, and managing tool distribution within the model's capabilities.

One of the key challenges was managing long-form content, such as multi-hour podcasts. Initially, sending large chunks of text caused the model to lose context, leading to unstable behavior. Perplexity addressed this by breaking content into smaller chunks of 2,000 tokens and feeding them incrementally, which improved stability. Additionally, the company learned that not all context should be treated the same way within the model. For example, using the 'user' role for too much context made the model act as if the user was narrating content rather than asking a question.

Another challenge was standardizing audio across different product surfaces, such as Ask, Comet, and Computer. Each product used different client stacks, leading to inconsistent audio performance. Perplexity built an SDK in Rust to abstract these differences, ensuring all clients sent the same audio contract to the Realtime API. This involved resampling audio to 48 kHz mono, applying WebRTC APM for noise reduction, and encoding for transport.

Tuning voice detection (VAD) for real-world environments was also crucial. Perplexity tested in noisy environments like San Francisco bars to ensure voice interaction worked in messy conditions. They also introduced 'voice lock' to handle pauses in user input, allowing users to hold the floor during complex tasks.

Finally, Perplexity focused on using only core tools, limiting the number to under ten, to ensure stability and usability. They provided explicit instructions on when and how to use each tool, ensuring outputs were structured and clear rather than mixed with inline instructions. This approach helped maintain a consistent interaction pattern closer to what the model had been trained on.

---

> **Source boundary:** Source attribution follows. Only the summary is bilingual and narrated.

---

> **Source boundary:** The section below contains a sourced paraphrase and attribution. Unless the metadata records explicit compatible permission, read the complete original at the official link.

## Source material

### OpenAI: How Perplexity Brought Voice Search to Millions Using the Realtime API

- Published: 2026-03-25
- Original: [How Perplexity Brought Voice Search to Millions Using the Realtime API](https://developers.openai.com/blog/realtime-perplexity-computer)

Read the complete original at the official link. Original copyright remains with OpenAI.
