---
title: The simple notes about what is Javascript and how it works, from legacy to modern
description: Comprehensive and short explanations about main concepts of the Javascript language
author: Truong Phan
type: article
image: /media/simple-notes-javascript/banner.jpg
date: 2021-14-09
tags:
  - javascript
  - callback queue
  - event loop
---
Javascript is one of the most language for web development nowadays. It has a complicated history with many subsets which could make beginners misunderstood the core concept behind this powerful language, and I am one of them. As the result, I decide to research and try to comprehend the fundamentals before go deeper with advanced tools sucha as frameworks or libraries. This post is more like my personal notes, which have been documented from [many sources](#credits) to have a clear and concise overview about Javascript.

## The History

The 1990s was the period when internet have been adopted and many important technologies were created. At that Tim, two dominant browsers are Netscape’s Navigator and Microsoft’s Internet Explorer, with the well-know legal battle lately. In September 1995,  Brandan Eich, a Netscape programmer, developed a new scripting language in just 10 days. It was originally named Mocha, then LiveScript and, finally, JavaScript.

## The Standards

In 1997, JavaScript has been adopted rapidly, it’s obvious that the language would need to be properly maintained and standardized. Therefore, Netscape handed the job of building a language specification to the European Computer Manufacturers Association (ECMA), an organization founded with the goal of standardizing computing. The ECMA specifications were labeled ECMA-262 and ECMAScript languages included JavaScript, JScript, and ActionScript.

ECMA-262 had three revisions from 1997 to 1999, but nearly 10 years later, version 4 was abandoned due to disagreements on the direction of the language and features. Many of modern features, such as generators, iterators, and destructuring assignments, arrow function, classes ...  have been included in more recent ECMAScript specifications. The latest edition is 11th, officially known as ECMAScript 2020, was published in June 2020. One of the features of ECMAScript 2020 is the nullish coalescing operator, `??`, returns its right-hand side operand when its left-hand side is `null` or `undefined`. This contrasts with the `||` operator, which uses the right value if left-hand side is falsy

```javascript
console.log(true  ?? "not defined") // true
console.log(false ?? "not defined") // false
console.log(undefined ?? "not defined") // "not defined"
console.log(null      ?? "not defined") // "not defined"
```

```javascript
//Compared with the OR operator ||

console.log(true  || "not defined") // true
console.log(false || "not defined") // "not defined"

console.log(undefined || "not defined") // "not defined"
console.log(null      || "not defined") // "not defined"
```

## The Engine

The first JavaScript engines were mere interpreters, but all relevant modern engines use just-in-time compilation for improved performance. It runs inside a hosting environment, which for most developers is the typical web browser or Node.js. For instance, the V8 is one of the most popular Javascript engine, which powers Google Chrome and Node.js. There are anothers such as Charka (Microsoft Edge), Spider Monkey (Firefox) ...

A regular javascript engine consists of two main components:

* **Memory Heap** — this is where the memory has been allocated
* **Call Stack** — this is a data structure which records basically where in the program we are (JavaScript is a single-threaded programming language, which means it has a single Call Stack)

> Each entry in the Call Stack is called a *Stack Frame*. “**Blowing the stack**” — this happens when you reach the maximum Call Stack size.

### The Runtime

There are APIs in the browser or Node.js that have been used by almost any Javascript developers (e.g. “setTimeout”,  “https.request“ …). Those APIs, however, are not provided by the Engine. They are attached from the [hosted environment](#the-environment) which could be Node.js (http, fs … packages) or any kind of browser (DOM manipulation, AJAX, websocket …) like the diagram below.

![The Javascript Runtime Engine](/media/simple-notes-javascript/js-the-engine.png)

Finally, you may hear about **event loop** *which is responsible for executing the code, collecting and processing events, and executing queued sub-tasks* and the **callback queue** which is responsible for sending functions to the track for processing in the event loop, it follows the queue data structure to maintain the correct sequence. Take a look at the example below to understand how callback works.

```javascript
// Callback Function Example
function greet(name, myFunction) {
  console.log("Hello World");
  // execute callback function only after the greet() is executed
  myFunction(name);
}

// callback function
function callNameBack(name) {
  // calling the function after 2 seconds
  setTimeout(console.log, 2000, `Called ${name}`);
}

greet("Truong", callNameBack);

```

## The Language

JavaScript is often described as a [prototype-based language](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Object_prototypes) — to provide inheritance, objects can have a prototype object, which acts as a template object that it inherits methods and properties from.

![The Javascript Object Cheat Sheet](/media/simple-notes-javascript/js-object-cheatsheet.jpg)

## The Environment

Unlike most programming languages, the JavaScript language has no concept of input or output. It is designed to run as a scripting language in a host environment, and it is up to the host environment to provide mechanisms for communicating with the outside world. . The most common host environment is the browser, but JavaScript interpreters can also be found in a huge list of other places, including Adobe Acrobat, Adobe Photoshop, SVG images, Yahoo’s Widget engine, server-side environments such as  [Node.js](http://nodejs.org/) , NoSQL databases like the open source  [Apache CouchDB](http://couchdb.apache.org/) , embedded computers, complete desktop environments like  [GNOME](http://www.gnome.org/)  (one of the most popular GUIs for GNU/Linux operating systems), and others.

## Credits

* [https://blog.sessionstack.com/tagged/tutorial](https://blog.sessionstack.com/tagged/tutorial)
* [https://ecma-international.org/ecma-262/](https://ecma-international.org/ecma-262/)
* [https://kangax.github.io/compat-table/es6/](https://kangax.github.io/compat-table/es6/)
* [https://www.springboard.com/blog/history-of-javascript/](https://www.springboard.com/blog/history-of-javascript/)
