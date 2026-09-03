---
title: 'WebLLM vs Transformers.js: which in-browser LLM engine should you ship?'
description: >-
  Compare MLC's WebLLM and Hugging Face's Transformers.js v4 for browser-native
  LLM inference — model ecosystems, API shape, structured output, workers, and
  an honest measurement protocol. One small task, both engines, no marketing
  numbers.
author: Truong Phan
type: article
status: draft
date: '2026-09-02'
tags:
  - javascript
  - browser
  - webgpu
  - llm
  - web-llm
  - transformers.js
imageAlt: 'WebLLM vs Transformers.js: which in-browser LLM engine should you ship?'
---
Somebody asked me recently whether they could add a small LLM to a web app without standing up a model server. The honest answer in 2026 is yes, but the harder question comes immediately after: *which way?*

There are now two mature JavaScript engines that run language models entirely in the browser:

- **WebLLM** by MLC-AI, an in-browser inference engine accelerated with WebGPU, exposed through an OpenAI-compatible API.[[1]](https://github.com/mlc-ai/web-llm)
- **Transformers.js v4** by Hugging Face, a rewritten C++/WebGPU runtime that runs ONNX models from the Hugging Face Hub.[[2]](https://github.com/huggingface/transformers.js)

Both advertise the same headline — *run a model locally, no server calls* — and both can feel like the obvious pick if you read only their own READMEs. That is exactly why I wanted to compare them on one real task instead of a feature grid.

The useful question is not, "Which library is faster?" It is:

> **Which engine gets you from "I want an LLM in the browser" to a working feature without handing your users a ten-second frozen page and a multi-gigabyte download?**

In this article I will build one small task with both engines, look honestly at where they differ, and give you a decision rule. I am deliberately not going to hand you benchmark numbers — not because they do not exist, but because the numbers floating around are vendor claims that disagree with each other (more on that later).

## Why this is possible now

In-browser LLM inference only became practical because WebGPU shipped in every major browser. By November 2025 Chrome, Firefox, Safari, and Edge all enable it by default.[[3]](https://web.dev/blog/webgpu-supported-major-browsers) WebGPU gives the browser direct access to the GPU for general compute, not just drawing, which is what lets a model run at a usable speed instead of crawling through pure JavaScript.

How many people that actually covers is less settled. Estimates in 2026 range from roughly 70% of global users to more than 80%, depending on the source and the browser mix.[[4]](https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/)[[5]](https://www.alphonsolabs.com/browser-trends-2026/) That gap matters: whatever engine you pick, you still need a fallback for the people your numbers do not reach. Do not build for the WebGPU majority and hope the rest are not paying users.

## What both engines actually are

Before any code, the important thing: **the two engines are different products even though they both "run a model in the browser."**

| | WebLLM | Transformers.js |
| --- | --- | --- |
| Model format | MLC-compiled models (WebGPU kernels via MLC-LLM + TVM) | ONNX models from the Hugging Face Hub |
| API shape | OpenAI-compatible `chat.completions` endpoint | Task-based `pipeline()` calls (text-generation, embeddings, etc.) |
| Structured output | Constrained JSON generation in its WASM runtime | You prompt for JSON and validate it yourself |
| Workers / extensions | First-class examples for Web Worker, Service Worker, Chrome extension | Runs in workers; ecosystem emphasis differs |
| Who controls available models | You pick from a maintained list, or compile your own | You can pull any published ONNX model |

The model format column is the one people most often miss. It is the biggest practical difference between the two, and it will decide most of your reality.

### WebLLM runs a curated set of compiled models

WebLLM does not load arbitrary weights. Models are compiled to a specific format — WebGPU and WebAssembly kernels built with MLC-LLM and the Apache TVM compiler — so the engine can talk to the GPU efficiently without relying on a performant WebGPU kernel library that did not exist until recently.[[6]](https://arxiv.org/abs/2412.15803)

The trade-off: you choose from the models the project maintains, or you compile your own with MLC-LLM. The maintained list includes Llama, Phi, Gemma, Mistral, Qwen, and Hermes families, and you can request additions via an issue.[[1]](https://github.com/mlc-ai/web-llm) That is a real constraint. If your feature really needs a model that is not in the list, WebLLM is not a drop-in — it is a small compilation project.

### Transformers.js runs ONNX models from the Hub

Transformers.js consumes standard ONNX models from the Hugging Face Hub. That is a huge existing catalog, plus any model you export to ONNX yourself. The underlying runtime for WebGPU is ONNX Runtime Web, and the v4 rewrite moved the heavy lifting into a C++/WebGPU backend.[[2]](https://github.com/huggingface/transformers.js)[[7]](https://huggingface.co/docs/transformers.js)

The trade-off: more choice, but you carry more responsibility for whether a given model actually runs well on your user's hardware. Just because it is on the Hub does not mean it is tuned for WebGPU in your browser.

## One task, both engines

To compare them fairly I used a small, boring task that most browser-AI features actually look like: **paste a block of meeting notes, get back a list of action items.** It is small enough that a slow model finishes, it is a real product feature, and it gives me something concrete to hold both engines against.

### With WebLLM

We skip the model server entirely and talk to the engine through the same chat-completions interface you would use against an OpenAI endpoint:

```bash
npm install @mlc-ai/web-llm
```

```js
import { CreateMLCEngine } from "@mlc-ai/web-llm";

// Loading a model downloads weights on first run. Show progress.
const engine = await CreateMLCEngine("Llama-3.1-8B-Instruct-q4f32_1-MLC", {
  initProgressCallback: (p) => {
    console.log(`${Math.round(p.progress * 100)}% loaded : ${p.text}`);
  },
});

const messages = [
  { role: "system", content: "Extract the action items from the notes as a JSON list. Each item has a person, a task, and a due date when one is mentioned." },
  { role: "user", content: "…paste meeting notes here…" },
];

const reply = await engine.chat.completions.create({ messages });
console.log(reply.choices[0].message.content);
```

For a quicker first test, pick a smaller model — for example **`Llama-3.2-1B-Instruct-q4f16_1-MLC`** (1B) or **`Qwen2-1.5B-Instruct-q4f16_1-MLC`** — both of which are in the current model list. The model list lives under the MLC-AI Hugging Face org, and the exact identifiers are maintained in `src/config.ts` of the repo, so check it before you hard-code one.[[8]](https://huggingface.co/mlc-ai) If you already write OpenAI API calls, this API shape is why WebLLM feels instantly familiar.

WebLLM also ships worked examples for the parts that are easy to get wrong: a Web Worker to keep the UI thread alive, a Service Worker for offline use, Chrome extension builds, multiple cache backends, and JSON mode with a schema.[[1]](https://github.com/mlc-ai/web-llm) Those examples are a large part of its value, because worker wiring and caching are where a naive integration actually breaks.

### With Transformers.js

The same idea, expressed as a Hugging Face pipeline task:

```bash
npm install @huggingface/transformers
```

```js
import { pipeline } from "@huggingface/transformers";

// device: 'webgpu' routes compute to the GPU when available.
const generator = await pipeline(
  "text-generation",
  "HuggingFaceTB/SmolLM2-360M-Instruct",
  { device: "webgpu" }
);

const output = await generator(
  "Extract the action items as a JSON list. Each item has a person, a task, and a due date when one is mentioned.\n\n…meeting notes here…",
  { max_new_tokens: 200 }
);

console.log(output[0].generated_text);
```

The pipeline API is task-oriented rather than chat-completion-oriented. You are not calling `chat.completions`; you are running a *text-generation* pipeline with a prompt. That model — SmolLM2-360M, a 360M-parameter model — is tiny by design, which is both an advantage (fast, small download) and a warning (it will extract weaker output than an 8B model).

This is the moment the comparison stops being fair in a tidy way: WebLLM's catalog skews toward bigger instruction models, while Transformers.js happily runs a 360M model. Apples-to-apples here means *matching the task and the goal*, not matching parameter counts, and being honest that bigger != better when the model must download on a user's connection.

## What actually decides the choice

### 1. What model do you need, and is it available to run?

This dominates everything. WebLLM gives you a curated, compiled set and a real workflow for adding your own. Transformers.js gives you the whole Hub and more responsibility.

Ask: *Is the exact model I care about available in the format this engine needs, or am I willing to take whichever reasonable model happens to be available?* If you need a specific capability and it is not in WebLLM's list, the cost of compiling is on you. If you just need "a small model that summarizes in the browser," both engines can do that.

### 2. Do you already speak the OpenAI chat API?

WebLLM is built around `engine.chat.completions.create`, with streaming, JSON mode, logit control, and seeding mirroring the OpenAI surface.[[1]](https://github.com/mlc-ai/web-llm) If your app is an OpenAI client today and you want the same shape locally, WebLLM drops in with almost no refactor.

Transformers.js is pipeline-based. You compose prompts and read `generated_text`; it does not pretend to be an OpenAI endpoint. That is not worse — it is more explicit — but it is a different contract, and your calling code will not look like your OpenAI code.

### 3. Do you need guaranteed-valid JSON?

This is where WebLLM has a real differentiator. Its structured output — constrained JSON generation plus schema support — is implemented inside the WebAssembly runtime, which means the generated text is constrained to obey the schema, not just *hoped* to.[[1]](https://github.com/mlc-ai/web-llm)[[9]](https://huggingface.co/spaces/mlc-ai/WebLLM-JSON-Playground)

With Transformers.js you are on your own: prompt carefully, parse with `try`/`catch`, validate against a schema, and decide what to do when the model returns prose. For a feature whose whole point is "the output is data, not chat," that difference is worth a lot. If your output must be parseable data, test WebLLM's constrained generation first.

### 4. How much scaffolding are you ready to build?

Both engines will produce a working chat in less than a minute. The cost shows up in the parts a demo skips:

- **Workers.** Running a model on the main thread will freeze your UI while it generates tokens. You need a Web Worker regardless of engine. WebLLM's documentation and examples treat this as a supported path (including worker state recovery in recent releases); the Chromium-extension + service-worker combination is a documented example.[[1]](https://github.com/mlc-ai/web-llm)
- **Caching.** A model ships as multi-gigabyte weights. WebLLM offers concrete cache-backend choices — the browser Cache API, IndexedDB, the origin private file system (OPFS), and an experimental cross-origin backend — each a real engineering decision with its own failure modes.[[1]](https://github.com/mlc-ai/web-llm) You will face the same storage problem with Transformers.js, but the guidance is thinner.

### 5. The honest "neither" case

A feature where a model helps is not automatically a feature where browser inference helps. If any of these are true, consider a server instead:

- Users need a big, state-of-the-art model you would never download to their device.
- Multiple users share context or need the same conversation state.
- Many users run browsers without WebGPU, and you do not want to maintain two paths.
- A prompt is hot, and per-request server cost is cheaper than forcing every user to download gigabytes.

Client inference wins when the model is small enough to ship, privacy is a product requirement, offline matters, or you want zero marginal server cost at scale. "Runs entirely in the browser" is a feature, not an automatic win.

## Usable speed, or vendor hype?

WebLLM's paper reports it can retain up to 80% of native performance on the same device.[[6]](https://arxiv.org/abs/2412.15803) Hugging Face announces Transformers.js v4 offers large speed-ups over its previous version and is "faster than AWS inference."[[10]](https://huggingface.co/blog/transformersjs-v4)

Those are claims to respect, not to reproduce. "Up to 80% of native" is measured against a specific GPU workload; "faster than AWS inference" is a vendor line and almost certainly does not mean the model is *better*, just that the comparison measured what the vendor wanted. I am not going to repeat either as the number that decides for you, because a feature grid of marketing claims is exactly what this article is trying to avoid.

What you can measure on your own machine in about fifteen minutes, with both engines:

1. **Time to first token** — how long after the user hits "Generate" before anything appears. Start the clock at click, not after the model loads once.
2. **Tokens per second** — how fast the model streams the rest. This is the number users feel.
3. **Model download size** — what the user pays once, on their connection.
4. **JS heap / GPU memory** — especially on a laptop with shared graphics memory.
5. **Behavior with no WebGPU** — does the app degrade to WASM, or break?

Run the exact model you would ship, on the hardware your users actually have, and write down the numbers. If a vendor claims a number that would change your decision, reproduce it before you trust it.

## A practical decision rule

Choose **WebLLM** when:

- you already write OpenAI chat-completions calls and want the same shape locally;
- you need guaranteed-valid structured output (constrained JSON);
- the model you want is in (or you will compile to) MLC format;
- you want the worked worker, service-worker, cache, and extension examples.

Choose **Transformers.js** when:

- you want to pull any published ONNX model off the Hugging Face Hub;
- you are doing broad ML tasks (embeddings, extraction, generation) rather than one chat endpoint;
- you prefer the explicit pipeline model over an OpenAI-shaped API;
- you are comfortable owning prompt engineering and output validation yourself.

Choose **neither** when the model is too big to ship, users share state, WebGPU reach is a real gap, or a server is cheaper at your scale.

## Bottom Line

The browser became a real place to run a model in 2026, and both engines are legitimate. But they are not interchangeable, and the feature grid hides the decision that matters: **one engine runs a curated set of compiled models through an OpenAI-compatible chat API with constrained JSON; the other runs any ONNX model you can find, through a general pipeline, and leaves structured output to you.**

For the kind of feature that takes pasted text and returns usable data, WebLLM's structured generation and worked worker examples pull ahead. For a project that needs a specific model from the Hub or a range of ML tasks, Transformers.js is the more open door.

Decide on model availability and output contract first, speed second — and measure the speed yourself. The numbers floating around do not agree, and the difference between two engines you can actually ship is not the marketing line; it is whether a real user gets a working feature without a frozen page and a download they regret.

## Sources

1. [MLC-AI WebLLM, GitHub README](https://github.com/mlc-ai/web-llm)
2. [Hugging Face Transformers.js, GitHub](https://github.com/huggingface/transformers.js)
3. [WebGPU is now supported in major browsers — web.dev](https://web.dev/blog/webgpu-supported-major-browsers)
4. [WebGPU 2026: 70% Browser Support — byteiota](https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/)
5. [12 Browser Trends 2026 — alphonsolabs](https://www.alphonsolabs.com/browser-trends-2026/)
6. [WebLLM: A High-Performance In-Browser LLM Inference Engine — arXiv](https://arxiv.org/abs/2412.15803)
7. [Transformers.js documentation — Hugging Face](https://huggingface.co/docs/transformers.js)
8. [MLC-AI model hub on Hugging Face (WebLLM / MLC models)](https://huggingface.co/mlc-ai) — the current prebuilt list is also maintained in [`src/config.ts`](https://github.com/mlc-ai/web-llm/blob/main/src/config.ts) in the web-llm repo.
9. [WebLLM JSON Playground — Hugging Face Spaces](https://huggingface.co/spaces/mlc-ai/WebLLM-JSON-Playground)
10. [Transformers.js v4: Now Available on NPM! — Hugging Face blog](https://huggingface.co/blog/transformersjs-v4)