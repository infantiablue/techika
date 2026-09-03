---
title: 'WebLLM vs Transformers.js: which in-browser LLM engine should you ship?'
description: >-
  Compare MLC's WebLLM and Hugging Face's Transformers.js v4 on a real browser
  workload: extracting structured economic indicators from central-bank meeting
  minutes into strict JSON. No marketing benchmarks — just actual outputs, code,
  and failure modes.
author: Truong Phan
type: article
status: published
image: >-
  /media/webllm-vs-transformersjs/d195c86d-e033-4c3f-8f6d-d0c1cafd25e2-ai-cover.png
date: '2026-09-02'
tags:
  - javascript
  - webgpu
  - llm
  - web-llm
  - transformers.js
publishedAt: '2026-09-03T09:23:26.007Z'
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

## One real task, both engines

Most in-browser AI demos show the same toy problem: a five-line summarizer or a casual chatbot. Those make for neat Twitter videos, but they do not reflect why people want browser inference in real products.

In a real app, you rarely want raw conversational prose. You want **structured data** extracted from messy documents — time-series indicators, form fields, action items with dates, or parsed financial statements — that can feed directly into a chart, a reactive state store, or an IndexedDB table.

To see how WebLLM and Transformers.js behave under real pressure, I tested both on a concrete document: **extracting economic data points from central-bank meeting minutes into a strict JSON schema.**

The source text was a dense macroeconomic summary from Federal Reserve meeting minutes. It covers fourth-quarter GDP expansion, labor market cooling, unemployment (4.4% in December), average hourly earnings (3.8%), PCE inflation (2.8% headline, 2.8% core), staff estimates (2.9% PCE, 3.0% core PCE), CPI numbers (2.7% and 2.6%), tariff impacts, trade deficits, and foreign central bank rate moves (Bank of England, Bank of Mexico, Bank of Japan).

The goal: extract every explicit, numerically grounded economic indicator into an array conforming to this contract:

```json
{
  "data_points": [
    {
      "measure": "unemployment rate",
      "economy": "US",
      "period": "December",
      "value": 4.4,
      "unit": "percent"
    }
  ]
}
```

If a metric is described only qualitatively (for example, "slightly below its 2024 pace"), `value` must be `null` with the qualifier preserved. No invented numbers, no prose commentary, and strict JSON validity.

To make it a fair test of what a user's browser can realistically load and run without an unbearable wait, I picked the most practical small instruction models available on each engine:

- **WebLLM**: `Llama-3.2-1B-Instruct-q4f16_1-MLC` (~1 GB download, 4-bit weights).
- **Transformers.js v4**: `onnx-community/Qwen2.5-0.5B-Instruct` (~350 MB download, 4-bit ONNX weights).

### With WebLLM: grammar-constrained JSON

WebLLM talks to the engine through an OpenAI-compatible interface:

```bash
npm install @mlc-ai/web-llm
```

```js
import { CreateMLCEngine } from "@mlc-ai/web-llm";

// 1B model: downloads ~1 GB of 4-bit weights into browser cache on first run
const engine = await CreateMLCEngine("Llama-3.2-1B-Instruct-q4f16_1-MLC", {
  initProgressCallback: (p) => {
    console.log(`${Math.round(p.progress * 100)}% loaded : ${p.text}`);
  },
});

const economicDataSchema = {
  type: "object",
  properties: {
    data_points: {
      type: "array",
      items: {
        type: "object",
        properties: {
          measure: { type: "string" },
          economy: { type: "string" },
          period: { type: "string" },
          value: { type: ["number", "null"] },
          unit: { type: "string" },
        },
        required: ["measure", "economy", "period", "value", "unit"],
      },
    },
  },
  required: ["data_points"],
};

const reply = await engine.chat.completions.create({
  messages: [
    {
      role: "system",
      content: "Extract economic data from central-bank meeting minutes into a JSON object.",
    },
    { role: "user", content: meetingMinutesText },
  ],
  // WebLLM compiles this schema to a WebAssembly grammar automaton:
  response_format: {
    type: "json_object",
    schema: JSON.stringify(economicDataSchema),
  },
  max_tokens: 1024,
});

const data = JSON.parse(reply.choices[0].message.content);
console.log(data.data_points);
```

WebLLM's `response_format` goes far beyond an instruction in the system prompt. Under the hood, MLC compiles the JSON schema into a grammar pushdown automaton inside its WebAssembly runtime. At every token-decoding step on the WebGPU device, it applies logit masking: any token that would produce invalid JSON or violate the schema is physically zeroed out before sampling.[[1]](https://github.com/mlc-ai/web-llm)[[9]](https://huggingface.co/spaces/mlc-ai/WebLLM-JSON-Playground) The generated text is guaranteed to be parseable JSON.

WebLLM also ships worked examples for the parts that are easy to get wrong: a Web Worker to keep the UI thread alive, a Service Worker for offline use, Chrome extension builds, multiple cache backends, and JSON mode with a schema.[[1]](https://github.com/mlc-ai/web-llm) Those examples are a large part of its value, because worker wiring and caching are where a naive integration actually breaks.

### With Transformers.js: prompt-based generation

The same task, expressed as a Hugging Face pipeline:

```bash
npm install @huggingface/transformers
```

```js
import { pipeline } from "@huggingface/transformers";

// 0.5B ONNX model: downloads ~350 MB of 4-bit weights
const generator = await pipeline(
  "text-generation",
  "onnx-community/Qwen2.5-0.5B-Instruct",
  { device: "webgpu", dtype: "q4" }
);

const output = await generator(
  [
    {
      role: "system",
      content: `Extract economic data points as a JSON object matching this schema:\n${JSON.stringify(economicDataSchema)}`,
    },
    { role: "user", content: meetingMinutesText },
  ],
  { max_new_tokens: 512 }
);

const raw = output[0].generated_text.at(-1).content;

// Transformers.js pipeline does not constrain grammar; you must parse and pray:
try {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const data = JSON.parse(cleaned);
  console.log(data.data_points);
} catch (err) {
  console.error("Parse failed — model emitted malformed or truncated JSON:", err);
}
```

Transformers.js uses a pipeline API. Because the text-generation pipeline does not currently feature a grammar-constrained decoding engine for ONNX in the browser, the schema lives entirely in the prompt text. The model has to generate valid JSON punctuation, quote keys, follow nesting, and close brackets purely from attention.

## What the engines actually produced

I fed both engines the exact same source document: Federal Reserve meeting minutes describing fourth-quarter GDP slowdown, 4.4% unemployment, 3.8% wage gains, PCE inflation (2.8% headline, 2.8% core), staff forecasts (2.9% PCE, 3.0% core PCE), CPI figures (2.7% and 2.6%), tariff drags, and foreign central bank decisions (Bank of England, Bank of Mexico, Bank of Japan).

Here is what each engine returned on the exact same input.

### WebLLM (`Llama-3.2-1B`): 100% valid JSON, conservative extraction

WebLLM returned a clean, parseable JSON object containing 15 data points:

```json
{
  "data_points": [
    { "measure": "GDP growth", "economy": "US", "period": "2025", "value": null, "unit": "percentage" },
    { "measure": "Labor market conditions", "economy": "US", "period": "2025", "value": null, "unit": "percentage" },
    { "measure": "Unemployment rate", "economy": "US", "period": "2025", "value": 4.4, "unit": "percent" },
    { "measure": "Total payrolls", "economy": "US", "period": "2025", "value": null, "unit": "number" },
    { "measure": "Average hourly earnings", "economy": "US", "period": "2025", "value": 3.8, "unit": "percentage" },
    { "measure": "Total consumer price inflation", "economy": "US", "period": "2025", "value": 2.8, "unit": "percentage" },
    { "measure": "Core consumer price inflation", "economy": "US", "period": "2025", "value": 2.8, "unit": "percentage" },
    { "measure": "Total PCE price inflation", "economy": "US", "period": "2025", "value": 2.9, "unit": "percentage" },
    { "measure": "Core PCE price inflation", "economy": "US", "period": "2025", "value": 3, "unit": "percentage" },
    { "measure": "Total PCE price inflation", "economy": "US", "period": "2025", "value": 2.7, "unit": "percentage" },
    { "measure": "Core PCE price inflation", "economy": "US", "period": "2025", "value": 2.6, "unit": "percentage" },
    { "measure": "Total goods trade deficit", "economy": "US", "period": "2025", "value": null, "unit": "number" },
    { "measure": "Nominal goods exports", "economy": "US", "period": "2025", "value": null, "unit": "number" },
    { "measure": "Nominal goods imports", "economy": "US", "period": "2025", "value": null, "unit": "number" },
    { "measure": "Foreign economic activity", "economy": "US", "period": "2025", "value": null, "unit": "number" }
  ]
}
```

What went well:

- **100% valid JSON.** It passed directly into `JSON.parse` without string surgery or regex patches.
- **Accurate numeric extraction.** It extracted all major rates mentioned in the text (4.4% unemployment, 3.8% wage gains, 2.8% PCE, 2.9% estimated PCE, 3.0% estimated core PCE, 2.7% CPI, 2.6% core CPI) and typed them as numbers, while properly assigning `null` to qualitative points.

Where it fell short:

- **Coarse temporal reasoning.** It defaulted `period` to `"2025"` for every single entry instead of preserving specific months ("December", "November") or quarters.
- **Label confusion.** It misattributed the CPI numbers (2.7% and 2.6%) under the name "PCE price inflation".

Those are semantic limitations of a 1B model, but crucially: **it never broke the application.** A frontend chart or dashboard can ingest this payload without throwing an exception.

### Transformers.js (`Qwen2.5-0.5B`): syntax crash, schema leakage, and hallucinations

Transformers.js returned an output that failed immediately at runtime:

```json
{
    "data_points": [
        {
            "measure": "real GDP",
            "economy": "US",
            "period": "2025 Q1",
            "value": null,
            "unit": "pct.",
            "reference_comparison": null,
            "note": null,
            "source_quote": null,
            "required": ["measure"]
        },
        {
            "measure": "unemployment",
            "economy": "US",
            "period": "December",
            "value": 4.4,
            "unit": "%",
            "reference_comparison": null,
            "note": null,
            "source_quote": null,
            "required": []
        },
        {
            "measure": "consumer_price_inflation",
            "economy": "US",
            "period": "2025 Q3",
            "value": null,
            "unit": "%",
            "reference_comparison": null,
            "note": null,
            "source_quote": null,
            "required": []
        },
        {
            "measure": "core_purchasing_power_prices_inflation",
            "economy": "US",
            "period": "2025 Q3",
            "value": null,
            "unit": "%",
            "reference_comparison": null,
            "note": null,
            "source_quote": null,
            "required": []
        },
        {
            "measure": "core_consumption_inflation",
            "economy": "US",
            "period": "2025 Q2",
            "value": null,
            "unit": "%",
            "reference_comparison": null,
            "note": null,
            "source_quote": null,
            "required": []
        },
        {
            "measure": "total_consumer_price_inflation",
            "economy": "US",
            "period": "2025 Q1",
            "value": null,
            "unit": "%",
            "reference_comparison": null,
            "note": null,
            "source_quote": null,
            "required": []
        },
        {
            "measure": "core_goods_inflation",
            "economy": "US",
            "period": "2025 Q2",
            "value": null,
            "unit": "%",
            "reference_comparison": null,
            "note": null,
            "source_quote": null,
            "required": []
        },
}
```

What went wrong:

- **A fatal syntax error.** The output ended with `},\n}` — a trailing comma and a missing closing bracket `]` for the `data_points` array. In JavaScript, `JSON.parse()` throws an uncaught `SyntaxError: Unexpected end of JSON input`. Your feature crashes before reaching the screen.
- **Schema leakage.** Notice `"required": ["measure"]` and `"required": []` inside every object. Because a 0.5B model does not have the capacity to cleanly separate the schema's meta-structure from data values, it echoed the schema's own keywords into the generated objects.
- **Hallucinations.** The source text never mentions "Q1", "Q2", or "Q3" for these metrics, yet the model hallucinated `"2025 Q1"`, `"2025 Q2"`, and `"2025 Q3"`. It also invented macroeconomic terminology that does not exist (`"core_purchasing_power_prices_inflation"`).
- **Near-zero numeric recall.** Across 7 attempted points, it captured only a single number: unemployment at 4.4. Everything else was `null`.
- **Token bloat.** Because it serialized every optional schema key as `null` and leaked schema keywords, it exhausted its token budget prematurely and truncated mid-payload.

### Side-by-side comparison

| Dimension | WebLLM (`Llama-3.2-1B`) | Transformers.js (`Qwen2.5-0.5B`) |
| --- | --- | --- |
| **JSON syntax** | 100% valid JSON (`JSON.parse` succeeds) | Malformed JSON (trailing comma, unclosed array) |
| **Schema enforcement** | Strict adherence via WebAssembly grammar mask | Schema leaked (`"required": [...]` inside objects) |
| **Extracted data points** | 15 complete points | 7 points before token exhaustion / cut-off |
| **Numbers captured** | 6 distinct metrics (4.4, 3.8, 2.8, 2.9, 3.0, 2.7) | 1 metric (unemployment 4.4% only) |
| **Hallucination risk** | Low: generic periods (`"2025"`), but factual | High: invented quarters (Q1, Q2, Q3) & fake metrics |
| **App failure mode** | Semantic imprecision (safe for rendering) | Fatal unhandled exception (`SyntaxError`) |

## What actually decides the choice

### 1. What model do you need, and is it available to run?

This dominates everything. WebLLM gives you a curated, compiled set and a real workflow for adding your own. Transformers.js gives you the whole Hub and more responsibility.

It also introduces a size-versus-capability floor. In my test, Transformers.js ran `Qwen2.5-0.5B` (~350 MB) while WebLLM ran `Llama-3.2-1B` (~1 GB). A 0.5B model is light and downloads in seconds, but as the results showed, sub-1B models struggle severely with factual grounding and complex formatting without task-specific fine-tuning. A 1B model crosses the threshold into usable reasoning, but demands roughly three times the initial download bandwidth.

Ask: *Is the exact model I care about available in the format this engine needs, or am I willing to take whichever reasonable model happens to be available?* If you need a specific capability and it is not in WebLLM's list, the cost of compiling is on you. If you just need "a small model that summarizes in the browser," both engines can do that.

### 2. Do you already speak the OpenAI chat API?

WebLLM is built around `engine.chat.completions.create`, with streaming, JSON mode, logit control, and seeding mirroring the OpenAI surface.[[1]](https://github.com/mlc-ai/web-llm) If your app is an OpenAI client today and you want the same shape locally, WebLLM drops in with almost no refactor.

Transformers.js is pipeline-based. You compose prompts and read `generated_text`; it does not pretend to be an OpenAI endpoint. That is not worse — it is more explicit — but it is a different contract, and your calling code will not look like your OpenAI code.

### 3. Do you need guaranteed-valid JSON?

This is where WebLLM has an undeniable advantage. Its structured output — constrained JSON generation plus schema support — is implemented inside the WebAssembly runtime, which means the generated text is constrained to obey the schema at the token level, not just *hoped* to.[[1]](https://github.com/mlc-ai/web-llm)[[9]](https://huggingface.co/spaces/mlc-ai/WebLLM-JSON-Playground)

When developers test LLMs on OpenAI's GPT-4o or Anthropic's Claude 3.5 Sonnet, prompt-based JSON extraction feels trivial. Frontier models have hundreds of billions of parameters; their attention mechanisms rarely drop a closing bracket or echo schema meta-keys.

In the browser, you are running **0.5B to 1B parameter models**. At that scale, an LLM simply cannot maintain document context, extract facts, adhere to JSON syntax, and ignore schema keywords without physical token masking. As the meeting minutes test demonstrated, prompt-only JSON on a 0.5B model resulted in leaked keywords (`"required": [...]`), hallucinated quarters, and an unclosed array that threw a runtime `SyntaxError`.

With Transformers.js you are on your own: prompt carefully, parse with `try`/`catch`, write defensive regex heuristics to repair malformed brackets, and decide what to do when the model emits invalid syntax. For a feature whose whole point is "the output is data, not chat," that difference is decisive. If your output must be parseable data, WebLLM's constrained generation is currently the only reliable path in the browser.

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

- you need guaranteed-valid structured data (JSON for charts, tables, or client state) without risking unhandled runtime syntax crashes;
- you already write OpenAI chat-completions calls and want the same shape locally;
- the model you want is in (or you will compile to) MLC format;
- you want the worked worker, service-worker, cache, and extension examples.

Choose **Transformers.js** when:

- you want to pull any published ONNX model off the Hugging Face Hub;
- you are doing broad ML tasks (embeddings, classification, translation, freeform generation) rather than strict schema extraction;
- you prefer the explicit pipeline model over an OpenAI-shaped API;
- you are prepared to write defensive parsers, retry logic, or train a custom ONNX checkpoint tuned for your output format.

Choose **neither** when the model is too big to ship, users share state, WebGPU reach is a real gap, or a server is cheaper at your scale.

## Bottom Line

The browser became a real place to run a model in 2026, and both engines are legitimate. But they are not interchangeable, and the feature grid hides the decision that matters: **one engine runs a curated set of compiled models through an OpenAI-compatible chat API with token-level constrained JSON; the other runs any ONNX model you can find, through a general pipeline, and leaves structured output and syntax validity entirely to you.**

For the kind of feature that takes pasted text and turns it into reliable application data, WebLLM's grammar-constrained generation is not an optional luxury — it is the line between a functioning feature and an uncaught exception. For a project that needs a specific model from the Hub, tasks like embeddings or translation, or custom ML pipelines, Transformers.js remains the more open door.

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
