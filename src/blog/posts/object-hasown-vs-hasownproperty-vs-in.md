---
title: Object.hasOwn() vs hasOwnProperty() vs in — The JS Property Check Showdown
description: >-
  Understand the difference between Object.hasOwn(), hasOwnProperty(), and the
  in operator in JavaScript. Includes edge cases, performance notes, and a
  polyfill for older environments.
author: Truong Phan
type: article
status: draft
image: ''
date: '2026-08-31'
tags:
  - javascript
imageAlt: >-
  JavaScript property check comparison showing Object.hasOwn, hasOwnProperty,
  and in operator
---
With a long history of development (and chaos), JS has accumulated multiple ways to do the same thing — check if an object has a property. This leads to confusion, subtle bugs, and endless Reddit threads. This article breaks down the three main approaches so you can pick the right one and move on.

## The Three Contenders

```javascript
const user = { name: "Alice", age: 30 };

// 1. Object.hasOwn() — ES2022, static method on Object
Object.hasOwn(user, "name");        // true
Object.hasOwn(user, "toString");    // false (ignores prototype)

// 2. hasOwnProperty() — instance method, ES5
user.hasOwnProperty("name");        // true
user.hasOwnProperty("toString");    // false (ignores prototype)

// 3. in operator — checks prototype chain too
"name" in user;                     // true
"toString" in user;                 // true (checks prototype!)
```

At first glance, #1 and #2 look identical. #3 is the odd one out — it walks the prototype chain. But the devil is in the edge cases.

## Edge Case: Objects Without a Prototype

This is where `hasOwnProperty()` bites you:

```javascript
const dict = Object.create(null);  // no prototype!
dict.key = "value";

dict.hasOwnProperty("key");
// TypeError: dict.hasOwnProperty is not a function

Object.hasOwn(dict, "key");        // true — works fine
"key" in dict;                     // true — works fine
```

`Object.create(null)` creates an object with `null` as its prototype. No `Object.prototype` means no `hasOwnProperty` method. This pattern is common for dictionaries/maps where you don't want prototype pollution.

**Bottom line:** If you use `hasOwnProperty()`, you must guard it:

```javascript
// The safe but verbose way
Object.prototype.hasOwnProperty.call(dict, "key");  // true

// Or just use Object.hasOwn()
Object.hasOwn(dict, "key");  // true, clean, no guard needed
```

## Edge Case: Shadowed `hasOwnProperty`

Someone (or a library) can shadow the method:

```javascript
const obj = {
  hasOwnProperty: () => false,  // malicious or accidental
  realProp: "value"
};

obj.hasOwnProperty("realProp");   // false — LIES!
Object.hasOwn(obj, "realProp");   // true — correct
"realProp" in obj;                // true — correct
```

This is rare in application code but common in CTF challenges and security-sensitive contexts. `Object.hasOwn()` bypasses the instance entirely.

## The `in` Operator: When You *Want* Prototype Checks

Sometimes you *do* want to check the prototype chain:

```javascript
class Animal {
  constructor(name) { this.name = name; }
  speak() { return "..."; }
}

class Dog extends Animal {
  speak() { return "Woof"; }
}

const dog = new Dog("Rex");

Object.hasOwn(dog, "speak");     // false — it's on the prototype
dog.hasOwnProperty("speak");     // false
"speak" in dog;                  // true — finds it on Animal.prototype

// Practical use: checking if a method exists anywhere in the chain
if ("speak" in dog) {
  dog.speak();  // safe to call
}
```

The `in` operator is also the only way to check for properties on `null`/`undefined` without throwing:

```javascript
// These throw:
null.hasOwnProperty("x");
Object.hasOwn(null, "x");

// This works:
"x" in null;  // false (but also: don't do this)
```

Actually, `"x" in null` throws `TypeError` too. The only safe check on `null`/`undefined` is `Object.hasOwn()` — it returns `false` instead of throwing:

```javascript
Object.hasOwn(null, "x");        // false
Object.hasOwn(undefined, "x");   // false
```

Wait, let me verify that:

```javascript
> Object.hasOwn(null, "x")
TypeError: Cannot convert undefined or null to object
```

Right — `Object.hasOwn()` also throws on `null`/`undefined`. The only truly safe universal check is a helper:

```javascript
function hasProp(obj, key) {
  return obj != null && Object.hasOwn(obj, key);
}
```

## Performance: Does It Matter?

Microbenchmarks show negligible differences in modern engines:

```javascript
const obj = { a: 1, b: 2, c: 3 };
const ITERATIONS = 10_000_000;

console.time("Object.hasOwn");
for (let i = 0; i < ITERATIONS; i++) Object.hasOwn(obj, "a");
console.timeEnd("Object.hasOwn");  // ~180ms

console.time("hasOwnProperty");
for (let i = 0; i < ITERATIONS; i++) obj.hasOwnProperty("a");
console.timeEnd("hasOwnProperty"); // ~170ms

console.time("in operator");
for (let i = 0; i < ITERATIONS; i++) "a" in obj;
console.timeEnd("in operator");    // ~200ms
```

Differences are ~10-20% — noise in real applications. Choose for correctness, not speed. The JIT optimizes all three heavily.

## When to Use Which

| Scenario | Recommended |
|---|---|
| Modern code (ES2022+), own-property check | `Object.hasOwn(obj, key)` |
| Legacy ES5 support needed | `Object.prototype.hasOwnProperty.call(obj, key)` |
| Need prototype chain included | `"key" in obj` |
| Dictionary objects (`Object.create(null)`) | `Object.hasOwn(obj, key)` |
| Security-sensitive / untrusted objects | `Object.hasOwn(obj, key)` |
| Quick REPL / one-liners | `"key" in obj` (shortest) |

## The "Just Use `Object.hasOwn()`" Rule

For application code in 2024+, `Object.hasOwn()` is the default choice:

- No prototype chain surprises
- Works on `Object.create(null)` objects
- Can't be shadowed
- Clear intent: "own property only"
- Standardized in ES2022, supported everywhere (Chrome 93+, Firefox 92+, Safari 15.4+, Node 16.9+)

The only reason to reach for something else:
- **`in` operator** when you explicitly want prototype-inclusive checks
- **Polyfill** when supporting ancient environments (IE11, old Node)

## Polyfill for `Object.hasOwn()`

If you need to support pre-ES2022 environments, here's a spec-compliant polyfill:

```javascript
if (!Object.hasOwn) {
  Object.hasOwn = function(object, property) {
    if (object == null) {
      throw new TypeError("Cannot convert undefined or null to object");
    }
    return Object.prototype.hasOwnProperty.call(Object(object), property);
  };
}
```

Key details this handles:
- Throws `TypeError` on `null`/`undefined` (matches spec)
- Coerces primitives via `Object(object)` so `Object.hasOwn("foo", "length")` works
- Uses `call` to avoid shadowing issues

**Mini version** (if you control the call sites and never pass `null`/`undefined`):

```javascript
if (!Object.hasOwn) {
  Object.hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
}
```

## Bonus: `Reflect.has()` — The Fourth Option

`Reflect.has(obj, key)` exists and behaves like the `in` operator (prototype-inclusive):

```javascript
Reflect.has(user, "name");      // true
Reflect.has(user, "toString");  // true — checks prototype
```

It throws on `null`/`undefined` like `Object.hasOwn()`. The difference from `in`:
- `Reflect.has()` is a function (can be passed as callback)
- `Reflect.has()` returns `false` for non-objects instead of throwing (wait, it throws too)

```javascript
Reflect.has(null, "x");  // TypeError
```

So `Reflect.has()` is essentially `in` as a function. Use it when you need a callable (e.g., `Object.keys(obj).filter(Reflect.has.bind(null, obj))`), otherwise `in` is more readable.

## Real-World Anti-Patterns

### 1. The `hasOwnProperty` Guard That Isn't

```javascript
// Common but wrong — still breaks on Object.create(null)
function hasProp(obj, key) {
  return obj && obj.hasOwnProperty(key);
}

// Correct
function hasProp(obj, key) {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

// Modern
function hasProp(obj, key) {
  return obj != null && Object.hasOwn(obj, key);
}
```

### 2. Checking Array Indices with `in`

```javascript
const arr = ["a", "b", "c"];
arr[5] = "f";  // sparse array

"5" in arr;           // true
Object.hasOwn(arr, "5");  // true
"3" in arr;           // false — hole
Object.hasOwn(arr, "3");  // false — hole

// But:
arr.hasOwnProperty("3");  // false — hole
```

Sparse arrays have "holes" — indices that were never set. All three correctly report `false` for holes.

### 3. The `for...in` Trap

```javascript
const obj = Object.create({ inherited: true });
obj.own = true;

for (const key in obj) {
  console.log(key);  // "own", "inherited"
}

// Filter with hasOwn:
for (const key in obj) {
  if (Object.hasOwn(obj, key)) {
    console.log(key);  // "own" only
  }
}
```

`for...in` iterates enumerable properties including inherited ones. `Object.hasOwn()` filters to own properties only.

## Browser Support Reality Check (2024)

| Environment | `Object.hasOwn` |
|---|---|
| Chrome | 93+ (Jun 2021) |
| Firefox | 92+ (Sep 2021) |
| Safari | 15.4+ (Mar 2022) |
| Edge | 93+ (Sep 2021) |
| Node.js | 16.9+ (Sep 2021) |
| Deno | 1.14+ (Sep 2021) |
| Bun | 1.0+ (Sep 2023) |

If your `browserslist` targets "last 2 versions" or "defaults", you're covered. IE11 needs the polyfill.

## Summary

- **`Object.hasOwn(obj, key)`** — modern default. Safe, explicit, unshadowable.
- **`obj.hasOwnProperty(key)`** — legacy. Breaks on `Object.create(null)` and shadowed methods. Avoid in new code.
- **`"key" in obj`** — prototype-inclusive. Use when you *want* inherited properties.
- **Polyfill** — 3 lines, spec-compliant, drop it in and forget it.

Pick one, be consistent, and stop bikeshedding in PR reviews.

---

## P/S

As with the [isNaN article](/posts/isNaN-vs-Number_isNaN), this one will probably attract a [Reddit thread](https://www.reddit.com/r/javascript/comments/) debating the polyfill's `Object(object)` coercion vs. strict `null` checks. The spec says throw on `null`/`undefined` — the polyfill matches that. If your codebase passes `null` to property checks, fix the call sites, not the polyfill.
