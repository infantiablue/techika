# MDN event-transport excerpts

## Capture metadata

- Captured: 2026-08-29
- Method: direct HTTPS retrieval with `curl -L --fail`, then HTML text extraction.
- Purpose: source material for browser transport semantics only.

## EventSource and SSE

**Source:** [EventSource - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

> `EventSource` is a persistent connection between an HTTP server and a client, which sends text/event-stream format events from the server to the client.

**Source:** [Using server-sent events - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)

> This is a one-way connection, so you can't send events from a client to a server.

> `id` The event ID to set the `EventSource` object's last event ID value.

> `retry` The reconnection time. If the connection to the server is lost, the browser will wait for the specified time before attempting to reconnect.

## WebSockets

**Source:** [WebSocket API - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

> The WebSocket API makes it possible to open a two-way interactive communication session between the user's browser and a server. With this API, you can send messages to a server and receive responses without having to poll the server for a reply.

## SOURCES (SOURCE RECORD)

https://developer.mozilla.org/en-US/docs/Web/API/EventSource  
→ Primary browser API reference for EventSource.

https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events  
→ Primary browser API reference for SSE format and recovery fields.

https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API  
→ Primary browser API reference for WebSocket semantics.
