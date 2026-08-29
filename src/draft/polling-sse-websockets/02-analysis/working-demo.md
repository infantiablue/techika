# Working demo implementation

## Scope

The runnable example is an independent Node package, not a route or component inside the Techika site. It uses a server-side proxy because API-Football requires an `x-apisports-key` header, which must not be exposed in browser JavaScript.[7]

## Provider fit

API-Football documents `GET /fixtures?live=all` for fixtures in progress. Its fixtures data is updated every 15 seconds, while its recommended call rate for fixtures in progress is once per minute.[7] A one-minute browser poll therefore respects the recommended rate and demonstrates the article’s main argument: a faster transport does not make an upstream provider publish faster.

## Reliability path

The browser calls only `/api/live-scores`. The standalone Node server calls API-Football, adds the credential, and normalizes the provider response. The browser schedules the next request only after the current request settles, applies capped exponential backoff, pauses new work while hidden, refreshes when visible, and calculates a stale-data label from the server timestamp.

## Package boundary

The demo package lives outside the Techika application. It has its own `package.json`, HTTP server, public assets, tests, environment template, and run instructions. No Techika component, route, dependency, or stylesheet is required.

## SOURCES (LAYER 3 NAVIGATION)

[../03-dossiers/api-football.md](../03-dossiers/api-football.md)  
→ Provider endpoint, required header, documented update frequency, and recommended call rate.

## Sources

[7] https://api-sports.io/documentation/football/v3 — API-Sports Football v3 documentation
