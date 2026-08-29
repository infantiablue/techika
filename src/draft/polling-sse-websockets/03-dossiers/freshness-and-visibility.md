# Freshness and visibility excerpts

## Capture metadata

- Captured: 2026-08-29
- Method: direct HTTPS retrieval with `curl -L --fail`, then HTML text extraction.
- Purpose: source material for browser visibility behavior.

## Page visibility

**Source:** [Page Visibility API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

> When the user minimizes the window, switches to another tab, or the document is entirely obscured by another window, the API sends a `visibilitychange` event to let listeners know the state of the page has changed.

**Source:** [Document: visibilitychange event - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)

> The event is not cancelable.

## SOURCES (SOURCE RECORD)

https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API  
→ Primary browser API reference for visibility state.

https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event  
→ Primary browser API reference for the visibility-change event.