# Player API `x-app-key` Security Review

## Scope and status

This review covers the mobile client's use of the `x-app-key` header. The server implementation for the configured `EXPO_PUBLIC_BACKEND_URL` is not present in this repository, so backend enforcement cannot be verified from this codebase alone.

**Status: client-side finding documented; server-side verification remains open.**

## Finding

The app sends an Expo public environment value in the `x-app-key` request header. The legacy variable was named `EXPO_PUBLIC_APP_SECRET`; that name does not make it secret. Expo embeds `EXPO_PUBLIC_*` values in the client bundle, where a user can inspect or extract them.

The app now prefers `EXPO_PUBLIC_APP_KEY` and retains the legacy variable as a temporary fallback. Both are public client configuration, not credentials.

## Required backend verification

Before considering this issue resolved, inspect the deployed backend route that handles `GET /player/:tag` and verify:

1. The `x-app-key` value is not the sole authentication or authorization control.
2. The route validates and normalizes player tags and returns bounded, predictable error responses.
3. The official Clash of Clans API token remains exclusively on the server and is never returned to the app.
4. Rate limits and abuse controls are enforced server-side; a public header or CORS policy is not treated as proof of a trusted app.
5. Upstream requests have timeouts and sensible caching/rate-limit behavior.
6. Logs and telemetry do not include API tokens, the client key, or unnecessary player payloads.
7. If the header value is currently treated as a secret, remove that trust assumption and rotate the credential after deploying the backend fix.

## Resolution criteria

- Backend route and deployment source are identified and reviewed.
- Any authorization or abuse-prevention weakness is fixed server-side.
- Integration tests prove that missing/invalid client headers cannot bypass actual access controls, and that rate limits work independently of the public header.
- The app's legacy `EXPO_PUBLIC_APP_SECRET` fallback can be removed once all build environments use `EXPO_PUBLIC_APP_KEY` and the backend contract is confirmed.

## References

- [Expo environment variables](https://docs.expo.dev/guides/environment-variables/) — public-prefixed variables are inlined into the client bundle.
- [Clash of Clans API developer portal](https://developer.clashofclans.com/) — the upstream game API credential belongs on the trusted backend, not in the mobile app.
