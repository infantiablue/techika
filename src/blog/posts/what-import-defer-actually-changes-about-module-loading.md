---
title: What "import defer" Actually Changes About Module Loading
description: >-
  A three-way showdown: eager import vs dynamic import() vs import defer. What
  each defers, what each returns, and the three sharp edges that decide when it
  helps.
author: Truong Phan
type: article
status: published
image: >-
  /media/what-import-defer-actually-changes-about-module-loading/d3afe748-7f0f-4432-8712-82e2696bb4fd-ai-cover.png
date: '2026-09-01'
tags:
  - javascript
imageAlt: What "import defer" Actually Changes About Module Loading
---
## The proposal, in short

**Deferring Module Evaluation** (a.k.a. `import defer`) is a [TC39 Stage 3 proposal](https://github.com/tc39/proposal-defer-import-eval) championed by Nicolò Ribaudo. The motivation is straightforward: ES modules made loading sane but kept one CommonJS luxury out of reach — paying CPU only for what you actually use.

The syntax is namespace-only:

```javascript
import defer * as charting from "./charting.js";
// charting is a deferred namespace object
// the module graph is fetched, parsed, and linked — but NOT executed
// first property access (charting.renderChart) triggers synchronous evaluation
```

The key distinction from `import()`:

- `import()` defers *loading* (network) — returns a Promise, forces `await`
- `import defer` defers *execution* (CPU) — returns a namespace synchronously, no async required

Safari Technology Preview 251 (released 2026-08-26) shipped it as a headline feature. As of writing, it's the only engine that supports it — Node 24, Bun 1.3, and Chrome all reject the syntax.

---

## The three contenders

| Aspect | `import * as ns from "mod"` | `import("mod")` | `import defer * as ns from "mod"` |
| --- | --- | --- | --- |
| **What's deferred** | Nothing — eager evaluation | Loading (fetch + parse + link) | Execution (module body) |
| **Returns** | Module namespace object | Promise&lt;ModuleNamespace&gt; | Deferred module namespace object |
| **Forces** | Nothing | `await` / `.then()` | Nothing — synchronous access |
| **When module runs** | At import time (startup) | When `import()` is called | On first property access |
| **Error timing** | Immediate (startup) | At `await` point | On first property access |

The mental model: `import defer` gives you a *proxy* to the module namespace. The proxy is fully linked — you can pass it around, destructure it, spread it — but touching any property forces the module graph to execute right there, synchronously.

---

## Edge case 1: Top-level await breaks deferral
The proposal states it directly:
> *"it's thus impossible to defer evaluation of modules that use top-level await"*
This isn't a bug — it's a fundamental constraint. Here's why.
### The conflict in one sentence
`import defer` promises: *"Give me a namespace now; run the module body when I first touch it."*
Top-level await says: *"I cannot produce my exports until this async work finishes."*
Those two guarantees cannot both be true.
### What the engine actually does
```javascript
// utils.mjs
const config = await fetch("/api/config.json").then(r => r.json());
//               ↑ This MUST complete before `process` can exist
export function process(input) {
  return config.transform(input);
}
```
When you write:
```javascript
// heavy.mjs
import defer * as utils from "./utils.mjs";
//                ↑ Engine sees TLA in utils
//                  Falls back to eager evaluation
//                  The fetch fires RIGHT HERE
```
The engine cannot hand you a deferred proxy for `utils` because `utils`'s exports don't exist yet — they're trapped behind that `await`. So it evaluates `utils` immediately. You still get a namespace object, but the async work already happened.
### It propagates through the whole graph
```javascript
// chart.mjs
import defer * as utils from "./utils.mjs"; // utils has TLA
export function renderChart(data) {
  return utils.process(data);
}
// main.mjs
import defer * as chart from "./chart.mjs";
//                      ↑ chart ALSO evaluates eagerly
//                        because it depends on utils
```
If **any module in the dependency chain** uses top-level await, **every module that depends on it** evaluates eagerly. There's no "partial deferral" — the engine can't construct `chart`'s exports without `utils` finishing first.

| Scenario | What happens |
|---|---|
| `import defer` → pure sync graph | Works as intended: evaluation on first property access |
| `import defer` → graph with TLA anywhere | **Eager evaluation** at import time for the entire affected subgraph |
| `import()` → graph with TLA | Works fine: the `await` is exactly what `import()` expects |
### Practical decision rule
```javascript
// ❌ DON'T use import defer if your module (or its deps) do this:
const data = await fetch("/config");
const db = await openDB();
const wasm = await WebAssembly.instantiateStreaming(fetch("mod.wasm"));
// ✅ DO use import() instead — it embraces the asynchrony:
const { process } = await import("./utils.js");
```

`import defer` is for *synchronous* module graphs only. If your feature needs async initialization, `import()` isn't a fallback — it's the correct tool.

---

## Edge case 2: The re-throwing namespace

A deferred namespace that hits an evaluation error **re-throws on every property access** — unlike a plain namespace where the error is "baked in" once.

```javascript
// broken.mjs
throw new Error("oops at evaluation");

// main.mjs
import defer * as broken from "./broken.mjs";

try {
  broken.anything; // throws "oops at evaluation"
} catch (e) {
  console.log(e.message); // "oops at evaluation"
}

broken.somethingElse; // throws AGAIN — "oops at evaluation"
```

Compare with eager import:

```javascript
import * as broken from "./broken.mjs";
// throws ONCE at import time, never again
```

This matters for retry logic. With `import defer`, a transient failure (network blip during dynamic import of a sub-module) isn't cached — every access retries.

---

## Edge case 3: Different namespace objects

`import defer * as ns` gives you a **different object** than `import * as ns` for the same module.

```javascript
import * as eager from "./mod.js";
import defer * as deferred from "./mod.js";

console.log(eager === deferred); // false
console.log(eager.foo === deferred.foo); // true (same export, different namespace object)
```

This is intentional — the deferred namespace is a distinct proxy with its own evaluation state. Don't mix them expecting identity checks to pass.

---

## Support table (honest, dated 2026-09-01)

| Environment | Status |
| --- | --- |
| Safari Technology Preview 251+ | ✅ Full support |
| Safari (stable) | ❌ Not yet |
| Chrome | ❌ Proposed (no flag) |
| Firefox | ❌ No public position |
| Node.js 24 | ❌ SyntaxError |
| Bun 1.3 | ❌ SyntaxError |
| Deno | ❌ No support |

This is an explainer with a dated support note — not a "start using it today" guide. When Chrome and Node land it, the support table updates and the tutorial variant (Brief C in the research) becomes viable.

---

## Bottom line

**Reaching for \`import()\` means you want lazy *loading*; reaching for \`import defer\` means you want lazy *execution*.**

Use eager `import` by default — it's predictable, well-supported, and the module graph is usually small enough.

Reach for `import()` when the module is *large and conditionally needed* (code-splitting, routes, heavy libs the user may never touch).

Reach for `import defer` when the module *must load upfront* (shared dependencies, CSP constraints, no network hop allowed) but its *execution cost* is the problem — and you need synchronous access without `await`.

The feature is real, the semantics are sharp, and Safari shipped it first. The rest of the ecosystem will catch up — but the mental model is worth learning now.
