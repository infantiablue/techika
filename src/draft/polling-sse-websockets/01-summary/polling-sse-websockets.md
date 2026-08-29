---
title: Polling, Server-Sent Events, or WebSockets?
description: Build a working API-Football live score board with a server-side proxy, polling, backoff, visibility handling, stale labels, and a clear case for SSE or WebSockets.
author: Truong Phan
type: article
date: 2026-08-29
tags:
  - javascript
  - web-development
  - realtime
  - websocket
  - server-sent-events
---

A live score board does not need to act like the match official’s control room.

That distinction matters. A casual fan checking a result can tolerate a 30-second delay. A producer correcting a score or managing a live broadcast cannot. Both pages can say “live,” but they make different promises—and the transport should follow that promise.

The useful question is not “Which real-time technology should I use?” It is: **how old can this score be before it misleads the person looking at it?**

This guide starts with a football score board that polls one normal HTTP endpoint. It handles slow requests, failed requests, hidden tabs, and an old score label. Then it shows when server-to-browser SSE is enough and when two-way WebSockets are worth owning.

## Start with the promise

“Live” is a user expectation, not a protocol.

Write the expected freshness before selecting a transport:

| Screen | Honest promise | Simplest starting transport |
| --- | --- | --- |
| Results page | “Scores update within about a minute” | Polling every 60 seconds |
| Live match centre | “Goals and status changes appear within a few seconds” | SSE |
| Score-operations console | “Corrections and subscriptions take effect immediately” | WebSocket |

A one-minute interval means a fan may see a score that is already almost a minute old before network delay. That is normally acceptable for a results list. It is not acceptable if an operator is correcting a goal or a broadcaster is using the page as a production input.

## Build the working demo

The complete example is a separate package named `live-score-demo`. It does not need React, Next.js, or a database. It uses Node’s built-in HTTP server, a small browser script, and API-Football v3.

API-Football exposes live fixtures through `GET https://v3.football.api-sports.io/fixtures?live=all`. Direct requests require an `x-apisports-key` header. The fixtures feed is documented as updating every 15 seconds, while the recommended client call frequency for matches in progress is once per minute.[7] That last detail is important: polling every second would spend quota without making the provider update faster.

The package has this shape:

```text
live-score-demo/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── src/
│   └── api-football.js
├── test/
│   ├── api-football.test.js
│   └── server.test.js
├── .env.example
├── package.json
└── server.js
```

Create an API-Football account, copy `.env.example` to `.env`, and keep the key on the server:

```text
API_FOOTBALL_KEY=your-real-key
PORT=4173
```

Then run the tests and start the demo:

```bash
npm test
npm start
```

Open `http://localhost:4173`. If matches are in progress, the page renders them. If no match is live, it shows an honest empty state rather than inventing sample scores.

## Keep the API key out of the browser

The browser should not call API-Football directly. Anyone can inspect browser JavaScript and network headers. Instead, the local Node server owns the credential and exposes a smaller same-origin endpoint:

```text
Browser
  └─ GET /api/live-scores
       └─ Node server
            └─ GET https://v3.football.api-sports.io/fixtures?live=all
               x-apisports-key: server-only value
```

The server-side request is ordinary `fetch`:

```javascript
const upstream = await fetch(
  "https://v3.football.api-sports.io/fixtures?live=all",
  {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY },
    cache: "no-store",
  },
);

const payload = await upstream.json();
const updatedAt = new Date().toISOString();
```

The server does not return the entire provider payload. It maps each fixture into the fields the score board needs: fixture ID, league, teams, goals, status, elapsed time, and `updatedAt`. That smaller contract keeps provider-specific structure out of the UI and makes the mapping easy to test.

## Poll one request at a time

The browser polls the local endpoint once per minute. It uses recursive `setTimeout`, not `setInterval`, so a slow request cannot overlap the next one:

```javascript
const INTERVAL_MS = 60_000;
const MAX_BACKOFF_MS = 5 * 60_000;

let failures = 0;
let timerId;
let controller;

function schedule(delay) {
  clearTimeout(timerId);
  timerId = setTimeout(loadScores, delay);
}

async function loadScores() {
  if (document.visibilityState === "hidden") return;

  controller?.abort();
  controller = new AbortController();

  try {
    const response = await fetch("/api/live-scores", {
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);

    failures = 0;
    renderFixtures(body.fixtures);
    renderAge(body.updatedAt);
    schedule(INTERVAL_MS);
  } catch (error) {
    if (error.name === "AbortError") return;

    failures += 1;
    const delay = Math.min(INTERVAL_MS * 2 ** failures, MAX_BACKOFF_MS);
    showRetry(error.message, delay);
    schedule(delay);
  }
}
```

After the first failure, the one-minute interval becomes a two-minute retry. Repeated failures increase the delay until it reaches the five-minute cap. In a high-traffic deployment, add random jitter so thousands of tabs do not retry at the same instant.

## Pause hidden tabs and label old scores

The Page Visibility API fires `visibilitychange` when a document becomes hidden or visible.[4][5] The demo stops starting new polls while hidden and refreshes immediately when the fan returns:

```javascript
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") loadScores();
});
```

The UI also updates its age label every second. In this demo, `updatedAt` records when the proxy last accepted a successful API-Football response. When that time is more than 90 seconds old, the message changes from `Updated 42s ago` to `Updated 2m ago — scores may be delayed`.

This proves whether the browser has refreshed successfully; it does not prove when API-Football last changed the underlying fixture. If a provider supplies its own source timestamp, keep that separately. “Connected,” “recently fetched,” and “current at the source” are three different facts.

## Choose the smallest transport

```text
How quickly must a score change appear?
│
├─ Within roughly a minute; the browser only reads the score
│  └─ Polling
│     Browser ── GET /match ──> server ── JSON ──> browser
│
├─ Within seconds; updates travel only from server to browser
│  └─ Server-Sent Events
│     Browser ── EventSource /match-events ──> server
│     Browser <── goal / card / status event ─ server
│
└─ The browser must also send frequent live commands
   └─ WebSocket
      Browser <════════ messages both ways ════════> server
```

Polling is easy to cache, observe, authenticate, and test because every update is an ordinary HTTP request. Its limit is the interval: it checks even when nothing has changed.

SSE is a persistent HTTP connection that sends events from the server to the browser. `EventSource` is one-way; it receives events but does not send them back on that stream.[1][2] That is a good fit for a match centre where the server broadcasts a goal, a card, half-time, or full-time to many listening fans. The browser reconnects an event stream after interruption; the server can provide a `retry` value and event IDs for recovery.[2]

```text
id: 9842
event: score
data: {"homeScore":2,"awayScore":1,"clock":"78:14","updatedAt":"2026-08-29T03:58:00.000Z"}

retry: 5000
```

```javascript
function startScoreStream({ url, onData, onStatus }) {
  const stream = new EventSource(url);

  stream.addEventListener("score", (event) => {
    onData(JSON.parse(event.data));
    onStatus({ kind: "fresh" });
  });

  stream.onerror = () => {
    // EventSource reconnects itself; this only updates the visible state.
    onStatus({ kind: "reconnecting" });
  };

  return () => stream.close();
}
```

Do not add a second manual retry loop around `EventSource` without a specific reason. The browser already reconnects it. Keep the stale timer, because an open connection can still carry no new score.

WebSockets create a two-way interactive session: the browser can send messages and receive responses without polling.[3] They become justified for an operations console, not a public score board:

```text
operator sends: correct score, add stoppage time, change match status, subscribe to match
server sends: score accepted, correction rejected, scoreboard update, heartbeat
```

After a WebSocket reconnects, the application must restore authentication, subscriptions, and any missed state. Reopening the socket alone does not prove the operator is looking at the correct score. That recovery work is the cost of choosing WebSockets.

## Reliability rules for every transport

**Show source age separately from connection health.** A connected stream can be silent; a successful poll can return old data. Keep `updatedAt` and label stale scores.

**Back off failures.** Retrying every second makes an upstream outage worse. Cap the delay, and add jitter when a large audience may retry together.

**Treat background tabs as lower priority.** Pause polling. For SSE or WebSockets, decide explicitly whether background continuity is part of the product, then refresh or reconnect when the page becomes visible.

**Keep a fallback.** If a streaming path fails behind a proxy or deployment, the tested polling baseline is still a useful way to deliver a current-enough score.

## Bottom line

A persistent connection is not automatically better. It is an operational commitment.

For a public live score board, start with one-minute polling if that delay is acceptable. Add stale-score labels, avoid overlapping requests, back off errors, and refresh on return from a hidden tab. Move to SSE when goals and status changes should reach fans within seconds. Move to WebSockets only when the screen also needs to send frequent live commands and the team is prepared to restore state after reconnecting.

Choose the smallest transport that makes the cost of an old score acceptable.

## Sources

[1] https://developer.mozilla.org/en-US/docs/Web/API/EventSource — EventSource - Web APIs | MDN
[2] https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events — Using server-sent events - Web APIs | MDN
[3] https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API — WebSockets API - Web APIs | MDN
[4] https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API — Page Visibility API - Web APIs | MDN
[5] https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event — Document: visibilitychange event - Web APIs | MDN
[7] https://api-sports.io/documentation/football/v3 — API-Sports Football v3 documentation

## SOURCES (LAYER 2 NAVIGATION)

[Transport semantics and recovery](../02-analysis/transport-and-recovery.md)  
→ Evidence-led comparison of polling, SSE, and WebSockets, including reconnection ownership.

[Freshness and visibility](../02-analysis/freshness-and-visibility.md)  
→ Why source timestamps and page visibility shape a trustworthy score display.

[Working demo implementation](../02-analysis/working-demo.md)  
→ How the standalone API-Football package keeps credentials server-side and matches the provider’s call guidance.