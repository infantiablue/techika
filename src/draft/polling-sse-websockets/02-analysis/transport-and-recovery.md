# Transport and recovery

## Thesis

The relevant distinction is not whether a transport feels “real time.” It is whether the required update direction and freshness justify the connection behavior the application must operate.

## Polling

Polling keeps the browser in control of each request. That makes it a suitable baseline for a public score board: ordinary HTTP request tracing, caching, authentication, and server error handling remain available. Its freshness is bounded by the interval and the time a request takes.

A recursive `setTimeout` is more reliable than an unguarded `setInterval` for a request loop. It schedules only after the prior request resolves, avoiding concurrent requests when a provider or network is slow. Backoff turns a temporary failure into fewer requests rather than a synchronized retry storm.

The client retains responsibility for retrying a failed poll and for presenting the age of the last accepted score. Those are application behaviors, not properties of HTTP itself.

## SSE

SSE moves the update trigger to the server while keeping data flow one-way. MDN describes the EventSource connection as one-way: the browser receives events and does not send events to the server on that stream.[1][2] This maps directly to a match centre where a central feed discovers a goal, card, or status change and many fans listen.

Event streams offer built-in recovery primitives. An event `id` sets the EventSource object's last-event ID, and a `retry` field controls how long the browser waits after a lost connection before reconnecting.[2] The browser-side responsibility shifts from making a retry loop to representing stream health and detecting a silent or stale source.

## WebSockets

MDN defines the WebSocket API as a two-way interactive session in which a browser sends messages and receives responses without polling.[3] This capability is useful for a score-operations console carrying frequent upstream commands as well as downstream state: match subscription, score correction, clock control, and acknowledgements.

The extra capability adds application-level recovery work. After a socket closes, reconnect code can reopen the transport, but it cannot automatically prove that the server restored authentication, subscriptions, sequencing, or missed corrections. A public score board can replace its latest score. An operator console needs a recovered authoritative state.

## Uncertainty and boundary

SSE and WebSocket behavior at intermediaries depends on the hosting environment: proxies, load balancers, browser connection limits, and authentication setup can change the operational result. The source material establishes browser API semantics, not a universal deployment guarantee. Validate the chosen path with the actual CDN, proxy, and provider before treating it as production-ready.

## SOURCES (LAYER 3 NAVIGATION)

[../03-dossiers/event-transport-mdn.md](../03-dossiers/event-transport-mdn.md)  
→ Raw MDN excerpts on EventSource one-way delivery, SSE retry fields, and WebSocket duplex sessions.

[../03-dossiers/methodology.md](../03-dossiers/methodology.md)  
→ Collection date, primary URLs, and the boundary between documented semantics and deployment-specific behavior.

## Sources

[1] https://developer.mozilla.org/en-US/docs/Web/API/EventSource — EventSource - Web APIs | MDN
[2] https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events — Using server-sent events - Web APIs | MDN
[3] https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API — WebSockets API - Web APIs | MDN