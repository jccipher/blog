---
layout: post
title: "Building Games with Astra: Give the Agent a World It Can Inspect"
date: 2026-09-06 07:29:37 +0800
lang: en
slug: ai-blog-openai-how-to-build-games-with-astra
permalink: /posts/ai-blog-openai-how-to-build-games-with-astra/
translation_url: /zh/posts/ai-blog-openai-how-to-build-games-with-astra/
categories: [AI, Industry Digest]
tags: [OpenAI, AI Research]
reading_time: 6
description: "An analysis of OpenAI's Astra game-building workflow across playable feedback, inspectable state, multiscale rendering, tests, and performance measurement."
run_mode: published
sources:
  - publisher: OpenAI
    title: "Building games with Astra"
    url: "https://developers.openai.com/blog/how-to-build-games-with-astra"
    published_at: "2026-09-04"
    official_zh_url: null
    reuse_policy: summary-only
---

> OpenAI's game-building case study is not mainly a story about asking Astra for more code. It is a story about making a simulated world observable: repeatable scenes, exposed state, browser tests, visual checkpoints, and performance counters let an agent investigate the gap between “it runs” and “it feels right.”

## Editorial summary

Thomas Ricouard's Void Explorer begins with an experience-level requirement: every visible star should be reachable, and a player should be able to travel continuously from interstellar space to a planet's surface. Astra turns that direction into a browser game containing 2,048 star systems and more than 10,000 procedurally generated planets. The headline scale is striking, but the article's more durable lesson is how the project creates feedback at several levels at once.

Ricouard defines the desired experience and visual direction before prescribing the implementation. Generated concept art establishes a palette and gives orbital flight, high-speed travel, atmospheric entry, and landing concrete visual targets. Astra then proposes a TypeScript and Vite application using Three.js, eventually moving the renderer from WebGL2 to Three.js's WebGPU architecture while preserving the existing simulation, navigation, and terrain systems.

The crucial step is giving Astra ways to inspect the running game. Void Explorer exposes a small JavaScript interface with current body, flight mode, terrain readiness, camera state, draw calls, triangle counts, terrain queues, and buffered data. Named scenes provide repeatable starting points for orbit, descent, and landing. Playwright can load those scenes, wait for readiness, capture screenshots, and inspect the underlying state. Separate journey tests still operate the real controls, preventing a prepared test scene from being mistaken for proof that the transition works.

This is an important agent-design pattern. Natural-language feedback such as “the planet nearly disappears” is useful but underspecified. A reproducible scene, screenshot, streaming counters, and state trace turn it into an investigation. Astra can connect a visual symptom to speed curves, terrain scheduling, level-of-detail handoffs, geometry generation, or rendering policy, make a change, and rerun the same check. The human remains responsible for deciding whether appearance and control feel are acceptable.

The multiscale world makes those observability tools necessary. Light-year distances and a person standing beside a spacecraft cannot share one naive coordinate system without losing precision. The simulation separates large physical addresses from small local offsets and renders relative to an observer kept near the origin. Planets begin as seeded descriptions and reveal more geometry only where needed. Distant proxy spheres, cube-sphere quadtrees, local terrain patches, collision surfaces, atmosphere, and clouds all have to describe the same world while becoming ready at different times.

The article gives unusually concrete examples of measurement-guided iteration. A screen-size policy reduces distant proxy geometry from 51,200 to 7,040 triangles in a controlled comparison. Indexed terrain keeps 241,952 triangles while reducing transferred buffers from about 35 MB to 15 MB. A refinement policy cuts discarded scheduled terrain jobs from 6,074 to 13 in a fixed-latency simulation. These results isolate geometry allocation, data transfer, and scheduling waste; the article correctly avoids presenting them as end-user frame-rate benchmarks.

The workflow also spans authored assets and procedural systems. Astra converts approved ship concepts into a Blender model and runtime asset, while the planets, terrain, clouds, rings, and stars remain code-generated. Two other games explore procedural water: Sunwake ties the same wave model to rendering and boat buoyancy, while Hollowflux makes water react to movement and conduct attacks. In each case, the simulation is not decoration; it is shared by visuals and gameplay.

Four practical patterns stand out:

1. **Specify the experience, then preserve constraints.** Visual references and interaction goals give the agent a stable target while implementation changes underneath.
2. **Expose state intentionally.** A small debug interface can be more valuable to an agent than another paragraph of description.
3. **Combine prepared scenes with real journeys.** Deterministic checkpoints accelerate diagnosis, while end-to-end controls verify that the player can actually reach them.
4. **Measure the subsystem you changed.** Geometry counts, transferred bytes, discarded jobs, frame intervals, and screenshots answer different questions; none should stand in for the others.

The source is a first-person project report, not a controlled comparison of agent-assisted and conventional development. It does not disclose total build time, token or compute cost, intervention rate, or how much code required later correction. Its headless Chromium measurements use SwiftShader software rendering rather than Ricouard's GPU. The planetary terrain uses heightfields and therefore excludes caves, overhangs, and destructible tunnels. Those limitations do not weaken the engineering patterns, but they constrain broader claims about productivity or general game quality.

My main takeaway is that agentic software development improves when the artifact can explain itself. A playable tab alone is ambiguous, and a test suite alone cannot judge feel. By exposing world state, fixing starting conditions, collecting measurements, and keeping human playtesting in the loop, the project gives Astra enough evidence to act independently without pretending that aesthetic judgment has been automated.

## Source material

### OpenAI: Building games with Astra

- **Published:** September 4, 2026
- **Author:** Thomas Ricouard
- **Original:** [Read the article](https://developers.openai.com/blog/how-to-build-games-with-astra)
- **Official Chinese edition:** Not found
- **Reuse:** Summary and attribution; original copyright remains with OpenAI.

#### What the original covers

The article documents Void Explorer, a browser-based procedural space game built with Astra in Codex. The game lets players travel among thousands of star systems, approach planets from space, enter their atmospheres, land, walk on the surface, return to the ship, and take off again.

Ricouard starts from intended player experience and generated visual references. Astra proposes the application architecture, works in TypeScript, Vite, and Three.js, moves the renderer toward WebGPU, and uses node materials and Three.js Shading Language for atmosphere, water, lighting, and other effects. Web Workers prepare terrain geometry, while Vitest and Playwright cover repeatability, coordinate behavior, browser interactions, and journeys through the game.

The source explains how seeded procedural planets, observer-relative coordinates, multiple levels of detail, shared terrain functions, terrain streaming, collision readiness, atmosphere, and cloud systems work together during continuous descent. It also reports controlled measurements of proxy geometry, mesh data transfer, discarded terrain jobs, draw calls, triangle counts, and headless frame intervals, with explicit qualifications about what those tests do and do not measure.

Astra also turns concept images into an authored Blender spacecraft and integrates the exported asset into the procedural world. Two additional projects, Sunwake and Hollowflux, use procedural water as both a visual and gameplay system. The article closes with a simple path for publishing browser games through the Sites plugin and links to playable versions of all three projects.

The piece presents detailed implementation evidence and acknowledges limits, including the use of heightfield terrain and the distinction between software-rendered test timings and hardware frame rate. It remains one creator's case study and does not establish comparative productivity, cost, or reliability across other teams and game genres.
