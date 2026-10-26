# React Native Security Guide

Use this guide for React Native/Expo code that handles credentials, local persistence, networking, WebViews, deep links, imported files, analytics, crash reporting, or third-party SDKs.

## Primary reference
- Official React Native Security guide: https://reactnative.dev/docs/security
- OWASP Mobile Application Security: https://mas.owasp.org/
- OWASP Mobile Application Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Mobile_Application_Security_Cheat_Sheet.html

## Rules for this repository
- Never embed API secrets, private keys, service credentials, or signing credentials in the app bundle. Public client configuration is not a secret.
- Keep secrets out of `EXPO_PUBLIC_*` variables, source control, logs, analytics, screenshots, and crash reports.
- Choose storage according to sensitivity. MMKV/AsyncStorage-style persistence is not automatically secure secret storage; use platform-backed secure storage when a real secret must be stored on-device.
- Assume all client-side checks can be bypassed. Enforce authorization and privileged operations on the server.
- Use HTTPS and validate server responses. Do not disable TLS validation.
- Treat WebView content, deep-link parameters, imported JSON, clipboard content, and remote payloads as untrusted.
- Avoid unsafe WebView JavaScript bridges and validate allowed navigation origins if a WebView is necessary.
- Request only permissions needed for a clear feature and explain their purpose.
- Keep analytics and Sentry payloads minimal; scrub tokens, account data, and imported payloads.
- Review dependency additions for maintenance, native permissions, transitive dependencies, and build impact.

## Working procedure
1. Trace data from its source to storage, network, UI, logs, and third-party SDKs.
2. State the threat and the layer responsible for mitigating it.
3. Prefer root-cause fixes and explicit boundary validation.
4. Add regression tests for parsing, redaction, permission, or authorization behavior where practical.
5. Verify with relevant typecheck, lint, tests, and Android smoke tests. Clearly distinguish checks actually run from checks still needed.

For Clash of Clans integration, use https://developer.clashofclans.com/ as the authority for API behavior. Never treat locally derived progression or imported game data as API-verified data.
