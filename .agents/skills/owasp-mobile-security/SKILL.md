---
name: owasp-mobile-security
description: Use for security reviews and changes involving secrets, local storage, network requests, imported data, deep links, analytics, logging, dependencies, permissions, or Android release configuration.
---

# OWASP Mobile Security for Clash One

This is a project-focused checklist derived from official OWASP guidance, not a reproduction of the full OWASP Cheat Sheet Series and not a security certification. Read the linked primary sources for complete and current guidance.

## Primary references

- OWASP Mobile Application Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Mobile_Application_Security_Cheat_Sheet.html
- OWASP MASVS: https://mas.owasp.org/MASVS/
- OWASP MASTG: https://mas.owasp.org/MASTG/
- OWASP Secrets Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OWASP Input Validation Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- OWASP Vulnerable Dependency Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html
- Official Clash of Clans API: https://developer.clashofclans.com/

OWASP MASVS applies to mobile client security; remote backend/API security needs separate server-side assessment. Use MASVS/MASTG as a risk-based reference, not as a claim of compliance.

## Review checklist

### Secrets and configuration
- Never hardcode private credentials, signing material, backend admin keys, or service secrets into the app.
- Treat every `EXPO_PUBLIC_*` value as public: it can be included in the shipped client bundle.
- Check commits, logs, CI output, build configuration, and error reports for accidental secret exposure.
- If a secret is exposed, recommend revocation/rotation; deleting it from the latest commit alone is insufficient.

### Local data and privacy
- Identify what account/player data is stored, where it is stored, how long it persists, and whether it is needed.
- Do not store authentication secrets in plain preferences or ordinary app storage. Use platform-backed secure storage for actual secrets where applicable.
- Do not invent cryptography or implement custom encryption.
- Consider backups, screenshots, app-switcher snapshots, widget surfaces, caches, analytics, and crash reports as possible data-leak paths.
- Minimize collection and retention; redact identifiers and payloads unless necessary for diagnosis.

### Network and API
- Use HTTPS and normal platform TLS validation. Never disable certificate validation to bypass a connection issue.
- Validate response shapes at network boundaries; don't trust a TypeScript cast as validation.
- Do not put backend-only credentials in the mobile client.
- Enforce authorization on the server for protected operations; client-side checks are not a security boundary.
- Apply sensible timeouts, error handling, and rate-limit behavior without leaking sensitive server details.
- Use the official Clash of Clans API only as documented and never assume it provides local timers or all derived progression.

### Imported JSON and deep links
- Treat imported files, deep-link parameters, remote configuration, and CDN content as untrusted.
- Validate schema, size, required fields, enums, numeric ranges, and unknown/missing identifiers before use.
- Avoid unsafe deserialization and avoid passing untrusted values into navigation, filesystem paths, queries, or commands without validation.
- Test malformed, oversized, partial, and unexpected-version inputs.
- Keep import failure from overwriting valid account state with incomplete data.

### Logging, analytics, and crash reporting
- Never log API tokens, passwords, secret headers, or full sensitive payloads.
- Review Sentry breadcrumbs, exception context, PostHog properties, and console logs for sensitive fields.
- Capture useful error context with minimal user data.
- Do not claim that data is private or excluded from collection without verifying SDK configuration and actual behavior.

### Dependencies and build/release
- Review new dependencies for maintainer health, permissions, transitive risk, and necessity.
- Keep lockfile changes intentional and inspect dependency/security alerts.
- Protect GitHub Actions permissions and secrets; pin third-party actions according to repository policy.
- Keep development/preview configuration separate from production billing, identifiers, and secrets.
- Check Android manifest permissions, exported components, deep links, backups, signing, and release configuration when relevant.

## Security review workflow

1. Define the asset, threat, trust boundary, and affected data.
2. Trace data from source through validation, storage, network/logging, and display.
3. Map findings to the relevant OWASP cheat sheet or MASVS category.
4. Prioritize concrete exploitability and impact; distinguish confirmed issues from hypotheses.
5. Add regression tests or a repeatable manual verification step.
6. Fix the root cause, not only the visible symptom.
7. Re-run checks and report unresolved risks. Do not claim the app is "OWASP compliant" based on this checklist alone.
