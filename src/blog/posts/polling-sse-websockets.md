---
title: 'Polling, Server-Sent Events, or WebSockets? A live football scoreboard example'
description: >-
  Build a live football scoreboard with Node.js, API-Football, safe polling,
  retry backoff, visibility handling, and honest stale-data labels.
author: Truong Phan
type: article
date: '2026-08-29'
tags:
  - javascript
  - web-development
  - polling
  - server-sent-events
  - websocket
image: >-
  /media/polling-sse-websockets/8f00d5dd-3cc8-497b-b550-8eb1bc927297-ai-cover.png
imageAlt: 'Polling, Server-Sent Events, or WebSockets? A live football scoreboard example'
---

A live scoreboard does not need to act like the match official's control room.

That distinction matters. A fan checking a result can normally tolerate a short delay. An operator correcting a score or managing a live broadcast cannot. Both screens may say “live,” but they make different promises. The transport should follow that promise.

The useful question is not, “Which real-time technology should I use?” It is:

> **How old can this score be before it misleads the person looking at it?**

In this tutorial, we will build a working football scoreboard with Node.js and API-Football. We will begin with normal HTTP polling, then make it reliable by preventing overlapping requests, backing off failures, pausing hidden tabs, and showing when the data may be stale.

After the demo works, we will compare it with Server-Sent Events (SSE) and WebSockets. The goal is not to choose the most advanced technology. It is to choose the smallest one that keeps the product's promise.

## Begin with the freshness promise

“Live” is a user expectation, not a protocol.

Before writing code, define how quickly a change must reach the screen:

| Screen | Honest promise | Simplest starting transport |
| --- | --- | --- |
| Results page | Scores update within about a minute | Polling every 60 seconds |
| Live match centre | Goals and status changes appear within a few seconds | SSE |
| Score-operations console | Corrections and commands take effect immediately | WebSocket |

If we poll once per minute, a change may happen immediately after one request. The next request will not begin for almost another minute, and the network adds a little more delay. That is usually acceptable for a public results page. It is not acceptable for a production control screen.

The data provider also sets a limit. API-Football documents its live fixtures feed as updating every 15 seconds and recommends one call per minute for fixtures in progress.[[6]](https://api-sports.io/documentation/football/v3) Polling it every second would spend quota without making the provider publish new data any faster.

For this demo, our promise is simple: **the page checks for new scores once per minute and warns the fan when its last successful update is more than 90 seconds old.** Polling is enough for that.

## What we are going to build

The browser must not call API-Football directly because the request needs a private API key. Anyone can inspect browser JavaScript and network headers. Instead, a small Node server will own the key and expose a limited same-origin endpoint:

```text
Browser
  └─ GET /api/live-scores
       └─ Node server
            └─ GET https://v3.football.api-sports.io/fixtures?live=all
               x-apisports-key: server-only value
```

The server will also normalize the provider response. The browser only needs the league, teams, goals, match status, elapsed time, and update timestamp. Keeping that contract small prevents provider-specific fields from spreading through the UI.

We do not need React, Express, a database, or a WebSocket library for this example. Node's built-in HTTP server and the browser's built-in Fetch API are enough.

The finished project has this structure:

```text
live-score-demo/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── src/
│   └── api-football.js
├── .gitignore
├── .env.example
├── package.json
└── server.js
```

## Step 1: Create the project

This tutorial uses Node.js 20 or newer because it includes `fetch`, `AbortSignal.timeout`, and environment-file support.

Create the folders:

```bash
mkdir -p live-score-demo/public live-score-demo/src
cd live-score-demo
```

Create `package.json`:

```json
{
  "name": "live-score-demo",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20.6"
  },
  "scripts": {
    "start": "node --env-file=.env server.js"
  }
}
```

There are no dependencies to install. The `private` field prevents us from accidentally publishing this demonstration as an npm package.

## Step 2: Add the API key

Create an account at API-Football and get an API key. Then create `.env.example`:

```text
API_FOOTBALL_KEY=replace-with-your-api-key
PORT=4173
```

Copy it to a local `.env` file:

```bash
cp .env.example .env
```

Replace the placeholder in `.env` with the real key. Do not commit `.env` to a public repository. In a deployed application, store the same value in the hosting platform's environment-variable settings.

Create `.gitignore` now, before the first commit:

```text
.env
```

## Step 3: Fetch and normalize live fixtures

Create `src/api-football.js`:

```javascript
const LIVE_FIXTURES_URL =
  "https://v3.football.api-sports.io/fixtures?live=all";

function normalizeFixture(item) {
  return {
    id: item.fixture.id,
    league: item.league.name,
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    homeGoals: item.goals.home,
    awayGoals: item.goals.away,
    status: item.fixture.status.short,
    elapsed: item.fixture.status.elapsed,
  };
}

export async function fetchLiveFixtures(apiKey) {
  if (!apiKey) throw new Error("API_FOOTBALL_KEY is not configured");

  const response = await fetch(LIVE_FIXTURES_URL, {
    headers: {
      "x-apisports-key": apiKey,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`API-Football returned HTTP ${response.status}`);
  }

  const payload = await response.json();

  const providerErrors = Array.isArray(payload.errors)
    ? payload.errors
    : Object.values(payload.errors || {});

  if (providerErrors.length > 0) {
    throw new Error("API-Football rejected the request");
  }

  if (!Array.isArray(payload.response)) {
    throw new Error("API-Football returned an unexpected response");
  }

  return payload.response.map(normalizeFixture);
}
```

There are three details worth noticing:

1. The API key is read by the server and never returned to the browser.
2. The ten-second timeout prevents a slow upstream request from staying open indefinitely.
3. The mapping function creates our own response shape instead of exposing the complete provider payload.

The provider may add fields in the future without affecting our page. If it changes a field we actually use, we only need to update this one mapping function.

## Step 4: Build the local proxy

Create `server.js`:

```javascript
import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLiveFixtures } from "./src/api-football.js";

const port = Number(process.env.PORT || 4173);
const apiKey = process.env.API_FOOTBALL_KEY;
const publicDirectory = join(dirname(fileURLToPath(import.meta.url)), "public");

const publicFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
]);

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");

  if (request.method === "GET" && url.pathname === "/api/live-scores") {
    try {
      const fixtures = await fetchLiveFixtures(apiKey);

      sendJson(response, 200, {
        fixtures,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
      sendJson(response, 502, {
        error: "Live scores are temporarily unavailable",
      });
    }
    return;
  }

  const publicFile = publicFiles.get(url.pathname);

  if (request.method === "GET" && publicFile) {
    const [fileName, contentType] = publicFile;
    response.writeHead(200, { "content-type": contentType });
    createReadStream(join(publicDirectory, fileName)).pipe(response);
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

server.listen(port, () => {
  console.log(`Live scores: http://localhost:${port}`);
});
```

The server exposes only three public files and one API route. This explicit list is intentionally boring: it avoids turning a tutorial's static-file handler into a path-traversal problem.

The `updatedAt` value records when our proxy accepted a successful provider response. It does **not** prove when the provider last changed a fixture. If a provider supplies its own trustworthy source timestamp, keep both values because they answer different questions:

- `fetchedAt`: when our server received the response;
- `sourceUpdatedAt`: when the data source says the score changed.

For this provider response, we only have enough evidence to expose the first meaning, so the field is called `updatedAt` and explained honestly in the interface.

## Step 5: Create the page

Create `public/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="A small live football scoreboard using safe HTTP polling."
    />
    <title>Live Football Scores</title>
    <link rel="stylesheet" href="/styles.css" />
    <script src="/app.js" type="module"></script>
  </head>
  <body>
    <main class="scoreboard">
      <header>
        <p class="eyebrow">API-Football demo</p>
        <h1>Live football scores</h1>
        <p id="status" role="status" aria-live="polite">Loading scores…</p>
      </header>

      <section id="fixtures" aria-label="Matches"></section>
    </main>
  </body>
</html>
```

The status has `aria-live="polite"`, so a screen reader can announce updates without interrupting the current sentence. We will build fixture elements with DOM methods instead of inserting provider text through `innerHTML`.

Create `public/styles.css`:

```css
:root {
  color-scheme: dark;
  font-family: system-ui, sans-serif;
  background: #08130e;
  color: #f4f7f5;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(circle at top, #173c2a, #08130e 55%);
}

.scoreboard {
  width: min(720px, calc(100% - 32px));
  margin: 0 auto;
  padding: 64px 0;
}

.eyebrow {
  color: #7ee2a8;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 8px 0;
  font-size: clamp(2rem, 7vw, 4rem);
}

#status {
  min-height: 1.5em;
  color: #b8c8bf;
}

#status[data-state="stale"],
#status[data-state="error"] {
  color: #ffca80;
}

#fixtures {
  display: grid;
  gap: 12px;
  margin-top: 32px;
}

.fixture {
  padding: 18px;
  border: 1px solid #2f4a3b;
  border-radius: 14px;
  background: rgb(14 32 23 / 88%);
}

.fixture-meta,
.team {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.fixture-meta {
  margin-bottom: 14px;
  color: #9db1a5;
  font-size: 0.875rem;
}

.team {
  padding: 7px 0;
  font-size: 1.05rem;
}

.score {
  font-size: 1.35rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

.empty {
  padding: 28px;
  border: 1px dashed #3b5b49;
  border-radius: 14px;
  color: #b8c8bf;
  text-align: center;
}
```

The CSS is not part of the transport decision, so keep it simple. Its only important jobs are to make the score easy to scan and to give delayed or failed states enough contrast.

## Step 6: Poll one request at a time

Create `public/app.js`:

```javascript
const POLL_INTERVAL_MS = 60_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const STALE_AFTER_MS = 90_000;

const fixturesElement = document.querySelector("#fixtures");
const statusElement = document.querySelector("#status");

let failures = 0;
let timerId;
let controller;
let updatedAt;
let retryAt;

function schedule(delay) {
  clearTimeout(timerId);
  timerId = setTimeout(loadScores, delay);
}

function setStatus(message, state = "fresh") {
  statusElement.textContent = message;
  statusElement.dataset.state = state;
}

function formatAge(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m`;
}

function updateAge() {
  if (!updatedAt) return;

  const age = Date.now() - new Date(updatedAt).getTime();
  const message = `Updated ${formatAge(age)} ago`;

  if (retryAt) {
    const retryDelay = Math.max(0, retryAt - Date.now());
    setStatus(
      `${message} — refresh failed; retrying in ${formatAge(retryDelay)}`,
      "error",
    );
    return;
  }

  if (age > STALE_AFTER_MS) {
    setStatus(`${message} — scores may be delayed`, "stale");
  } else {
    setStatus(message);
  }
}

function addTextElement(parent, className, text) {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  parent.append(element);
}

function createTeam(name, goals) {
  const team = document.createElement("div");
  team.className = "team";
  addTextElement(team, "team-name", name);
  addTextElement(team, "score", goals ?? "–");
  return team;
}

function createFixture(fixture) {
  const article = document.createElement("article");
  article.className = "fixture";

  const meta = document.createElement("div");
  meta.className = "fixture-meta";
  addTextElement(meta, "league", fixture.league);

  const clock = fixture.elapsed
    ? `${fixture.status} · ${fixture.elapsed}'`
    : fixture.status;
  addTextElement(meta, "clock", clock);

  article.append(
    meta,
    createTeam(fixture.homeTeam, fixture.homeGoals),
    createTeam(fixture.awayTeam, fixture.awayGoals),
  );

  return article;
}

function renderFixtures(fixtures) {
  fixturesElement.replaceChildren();

  if (fixtures.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No matches are live right now.";
    fixturesElement.append(empty);
    return;
  }

  fixturesElement.append(...fixtures.map(createFixture));
}

async function loadScores() {
  if (document.visibilityState === "hidden") return;

  controller?.abort();
  controller = new AbortController();
  setStatus("Refreshing scores…");

  try {
    const response = await fetch("/api/live-scores", {
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || `Request failed with ${response.status}`);
    }

    failures = 0;
    retryAt = undefined;
    updatedAt = body.updatedAt;
    renderFixtures(body.fixtures);
    updateAge();
    schedule(POLL_INTERVAL_MS);
  } catch (error) {
    if (error.name === "AbortError") return;

    failures += 1;
    const delay = Math.min(
      POLL_INTERVAL_MS * 2 ** failures,
      MAX_BACKOFF_MS,
    );

    retryAt = Date.now() + delay;

    if (updatedAt) updateAge();
    else setStatus(`${error.message}. Retrying in ${formatAge(delay)}.`, "error");
    schedule(delay);
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    clearTimeout(timerId);
    controller?.abort();
  } else {
    loadScores();
  }
});

setInterval(updateAge, 1_000);
loadScores();
```

There is more code here than a basic `setInterval(fetch, 60_000)`, but each part protects a real behavior.

### Why recursive `setTimeout` is safer than `setInterval`

`setInterval` starts work on a fixed clock. If a request takes longer than the interval, another request can begin before the first one finishes. Slow networks can therefore create several in-flight requests and allow an older response to arrive after a newer one.

In our loop, `schedule()` runs only after the current request succeeds or fails. There is never more than one scheduled poll, and the previous request is aborted before a new one begins.

### Why failed requests back off

The first failure changes the normal one-minute delay to two minutes. Further failures increase it to four minutes, then stop growing at the five-minute cap.

```text
Normal:   60 seconds
Failure 1: 2 minutes
Failure 2: 4 minutes
Failure 3+: 5 minutes
```

An outage should create less traffic, not more. In a large deployment, add a small random offset, called jitter, so thousands of browsers do not retry at exactly the same moment.

### Why hidden tabs stop polling

The Page Visibility API sends a `visibilitychange` event when the page becomes hidden or visible.[[4]](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)[[5]](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event) A public scoreboard does not need to consume quota while nobody is looking at it, so we stop its timer and abort the active browser request. When the fan returns, we refresh immediately rather than waiting for the old schedule.

This is a product choice, not a universal rule. If background continuity is part of the requirement, keep the connection and test how the target browsers handle it.

### Why the old scores stay on screen after an error

`renderFixtures()` runs only after a successful response. When the next request fails, the page keeps the last known scores and changes the status message.

Removing the score would throw away useful information. Keeping it without an age label would make old information look current. The combination—last known data plus an explicit warning—is more honest.

## Step 7: Run the scoreboard

Make sure `.env` contains the real API key, then start the server:

```bash
npm start
```

Open [http://localhost:4173](http://localhost:4173). If matches are in progress, the page will list them. If no match is live, it will show an honest empty state.

You can verify the failure behavior without waiting for a provider outage:

1. Load the page successfully.
2. Stop the Node server.
3. In the browser's developer tools, open the **Network** panel.
4. Wait for the next request or reload the page.
5. Confirm that the previous fixtures remain visible and the status shows a retry delay.
6. Start the server again and return to the tab to trigger an immediate refresh.

![The live scoreboard demo](/media/polling-sse-websockets/a60ab543-904e-4537-b668-fc163339e723-live-score-demo.jpg)

Also switch to another tab for more than a minute. The Network panel should show no new score requests while the page is hidden. Returning to the page should start one request immediately.

## What does `updatedAt` really prove?

A reliable live interface separates three facts that are often mixed together:

| Signal | What it proves | What it does not prove |
| --- | --- | --- |
| Connected | The transport is open | The score is current |
| Last successful fetch | Our proxy recently accepted a response | The provider recently changed the fixture |
| Source timestamp | The source reports when its data changed | The browser received it without delay |

Our demo only controls the middle signal. A successful request makes a current score more likely, but provider delay, caches, queues, and clock differences can still affect the true age.

This distinction also matters for streaming. An SSE or WebSocket connection can remain open while no useful event arrives. “Connected” should never be used as a synonym for “fresh.” Keep the age label whichever transport you choose.

## Polling, SSE, and WebSockets compared

The three approaches solve different communication problems:

```text
How quickly must a score change appear?
│
├─ Within roughly a minute; the browser only reads the score
│  └─ Polling
│     Browser ── GET /api/live-scores ──> server
│     Browser <──────── JSON response ─── server
│
├─ Within seconds; updates travel from server to browser
│  └─ Server-Sent Events
│     Browser ── EventSource connection ─> server
│     Browser <──── goal / card / status ─ server
│
└─ The browser must also send frequent live commands
   └─ WebSocket
      Browser <════════ messages both ways ════════> server
```

### Polling

Polling uses ordinary HTTP requests. It is easy to inspect in browser tools, trace in server logs, protect with normal authentication, and test with normal request-response checks.

Its main weakness is the interval. The browser asks even when nothing has changed, and a change waits until the next request. For our one-minute freshness promise, that is a reasonable trade-off.

One production detail is not visible in this single-user demo: every browser request currently becomes an API-Football request. Before serving many users, cache the normalized response on the server for the provider's allowed interval. Otherwise, 1,000 open tabs can turn one useful upstream call into 1,000 calls. In a multi-instance deployment, use a cache shared by those instances rather than a separate in-memory cache in each process.

### Server-Sent Events

SSE keeps one HTTP connection open and sends text events from the server to the browser. The browser's `EventSource` interface receives events but does not send events back on the same stream.[[1]](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)[[2]](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)

That direction matches a public match centre: one central feed discovers a goal, card, half-time, or final whistle, then broadcasts it to many fans.

An SSE message is plain text. A blank line ends each event:

```text
id: 9842
event: score
data: {"homeScore":2,"awayScore":1,"clock":"78:14","updatedAt":"2026-08-29T03:58:00.000Z"}
retry: 5000

```

The fields have specific purposes:

- `event` gives the message a type;
- `data` carries the payload;
- `id` lets the browser remember the last received event;
- `retry` tells the browser how long to wait before reconnecting.

The client is small because `EventSource` already owns reconnection:

```javascript
const stream = new EventSource("/api/live-score-events");

stream.addEventListener("score", (event) => {
  const score = JSON.parse(event.data);
  renderScore(score);
  updateAge(score.updatedAt);
});

stream.onerror = () => {
  showStatus("Reconnecting…");
};

window.addEventListener("pagehide", () => stream.close());
```

Do not add a second retry loop unless your application has a specific recovery rule. The browser already reconnects an `EventSource`. Your responsibilities are to show its state, preserve or replay missed events, and detect stale data even when the connection remains open.

SSE becomes worthwhile when the server already has a timely central feed to broadcast. Replacing our one-minute browser poll with an SSE connection would not make API-Football update more frequently. If the server still polls the provider once per minute, it can only push that one-minute-old knowledge sooner after receiving it.

### WebSockets

WebSockets create a two-way interactive session. The browser can send messages and receive messages without opening a new HTTP request for each exchange.[[3]](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

That capability is useful for an operations console:

```text
operator → subscribe to match 123
operator → correct home score to 2
operator → add five minutes of stoppage time

server → subscription accepted
server → correction rejected: version conflict
server → authoritative match state
```

The difficult part is not opening the socket. It is recovering the application after the socket closes.

After reconnecting, the client may need to:

1. authenticate again;
2. restore match subscriptions;
3. provide the last processed sequence number;
4. receive missed events or request a fresh snapshot;
5. resolve commands whose acknowledgements were lost.

Reopening the connection alone does not prove that the operator is looking at the authoritative score. This recovery work is the real cost of WebSockets, and a read-only public scoreboard receives little value from paying it.

## Reliability rules for every transport

The protocol changes, but the trust rules remain the same.

### Show data age separately from connection health

A connected stream can be silent. A successful poll can return cached data. Keep a meaningful source or fetch timestamp and show when it passes the product's stale threshold.

### Back off failures

Retrying every second makes an upstream outage worse. Cap the retry delay. Add jitter when a large audience may reconnect together.

### Decide what hidden tabs should do

For polling, pausing is usually the cheapest choice. For SSE and WebSockets, decide whether background continuity is required, then refresh or restore state when the page becomes visible.

### Recover state, not only the connection

After any gap, the latest full score is often more valuable than a list of missed changes. An operator workflow may also need event IDs, command IDs, and conflict handling. Choose the recovery model before choosing the transport.

### Test the real deployment path

Browser APIs define client behavior, but proxies, CDNs, load balancers, timeouts, authentication, and connection limits can change the operational result. Test SSE or WebSockets through the same infrastructure that production will use.

### Keep a polling fallback when it is useful

A tested HTTP snapshot endpoint remains valuable even after adding a stream. It can initialize the page, recover authoritative state after a gap, support environments where streaming fails, and make incidents easier to diagnose.

## A practical decision rule

Use **polling** when:

- the browser only reads data;
- tens of seconds or a minute of delay is acceptable;
- the upstream provider itself updates on an interval;
- simple HTTP operation is valuable.

Use **SSE** when:

- changes should reach the browser within seconds;
- messages mainly travel from server to browser;
- automatic browser reconnection fits the recovery model;
- the server already has timely events to broadcast.

Use **WebSockets** when:

- both sides send frequent, low-latency messages;
- the application needs live commands, acknowledgements, or subscriptions;
- the team is prepared to restore authentication and authoritative state after reconnecting.

## Conclusion

A persistent connection is not automatically better. It is an operational commitment.

For this public live-score page, one-minute polling matches the provider's guidance and the product's freshness promise. The important work is not adding a fashionable protocol. It is preventing overlapping requests, backing off failures, respecting hidden tabs, protecting the API key, and telling the fan when a score may be old.

Move to SSE when a central feed can push goals and status changes within seconds. Move to WebSockets only when the screen also needs frequent live commands and the application is ready to recover state after a broken connection.

Choose the smallest transport that makes the cost of an old score acceptable.

## Sources

1. [MDN: EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
2. [MDN: Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
3. [MDN: WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
4. [MDN: Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
5. [MDN: Document visibilitychange event](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)
6. [API-Sports Football v3 documentation](https://api-sports.io/documentation/football/v3)
