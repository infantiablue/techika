# Freshness and visibility

## Thesis

A live score board is trustworthy only when it distinguishes connection success, the last successful fetch, and the age of the underlying score. These timestamps answer different questions.

## Score age

The standalone demo attaches an `updatedAt` value when its server accepts a successful API-Football response. The browser compares it with its own clock and displays an explicit stale state when the age exceeds the product’s threshold. This measures successful delivery through the proxy, not the provider’s internal update time.

This separates known facts from inference:

- **Known:** the proxy says when it last accepted an API response.
- **Known:** the browser received that normalized response.
- **Inferred:** a recent successful fetch makes a current score more likely, but does not prove the provider changed recently.
- **Uncertain:** provider delay, caches, clock skew, and queues can change the underlying score age.

A successful response does not settle the final two points. This is why a stale label stays visible after a request completes.

## Visibility

The Page Visibility API gives the document a visibility state and sends `visibilitychange` when it changes. MDN describes the event as an opportunity to behave differently after a user backgrounds or returns to a page.[4][5] For a public score board, stopping scheduled polls while hidden and refreshing when visible aligns work with the fan’s attention.

The trade-off is explicit: a hidden page no longer maintains the foreground freshness promise. That is harmless when it refreshes on return. It is not harmless if background continuity is a defined product requirement. That requirement should be tested, not assumed from a connection type.

## Status model

| UI state | What it means | Evidence needed |
| --- | --- | --- |
| Fresh | The latest `updatedAt` is inside the freshness threshold | Score-source timestamp |
| Refreshing | A request or stream update is in progress | Client state |
| Retrying | The last attempt failed and another is scheduled | Client error and retry time |
| Reconnecting | An SSE or WebSocket transport is recovering | Transport state |
| Stale | No accepted score update meets the freshness promise | Source age, not connection status |

This model is transport-neutral. It works for a poll response, an SSE event, or a WebSocket message.

## SOURCES (LAYER 3 NAVIGATION)

[../03-dossiers/freshness-and-visibility.md](../03-dossiers/freshness-and-visibility.md)  
→ Raw MDN excerpts about `visibilitychange` and background behavior.

[../03-dossiers/methodology.md](../03-dossiers/methodology.md)  
→ Collection notes and source attribution.

## Sources

[4] https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API — Page Visibility API - Web APIs | MDN
[5] https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event — Document: visibilitychange event - Web APIs | MDN