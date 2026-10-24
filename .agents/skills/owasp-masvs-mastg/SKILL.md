# OWASP MASVS and MASTG Reference

Use this guide when reviewing authentication, local storage, network communication, permissions, deep links, imported data, analytics, crash reporting, or release security for Clash One.

## Primary references
- OWASP Mobile Application Security project: https://mas.owasp.org/
- MASVS (mobile application security verification standard): https://mas.owasp.org/MASVS/
- MASTG (mobile application security testing guide): https://mas.owasp.org/MASTG/
- MAS Checklist: https://mas.owasp.org/checklists/
- Mobile Application Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Mobile_Application_Security_Cheat_Sheet.html
- Secrets Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Input Validation Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html

## Apply proportionately
1. Identify assets, trust boundaries, attacker-controlled inputs, and the consequences of compromise.
2. Review secrets and configuration. Anything bundled into a mobile client must be treated as recoverable; `EXPO_PUBLIC_*` variables are public.
3. Check local storage and backups against the sensitivity of each value. Do not move secrets into plain storage as a convenience.
4. Check TLS, API authentication, authorization assumptions, and safe handling of failed requests.
5. Validate imported JSON, deep links, remote responses, and persisted data at boundaries. A TypeScript type assertion is not runtime validation.
6. Minimize sensitive information in logs, analytics, and Sentry events; redact before sending where appropriate.
7. Review dependency and native-permission changes for necessity and risk.
8. Record findings with impact, evidence, remediation, and tests. Do not claim compliance or security certification merely because a checklist was consulted.

## Clash One-specific boundaries
- The official Clash of Clans API is https://developer.clashofclans.com/. Do not infer that it provides local timers, complete inventories, or Clash One-derived progression.
- Treat player tags, imported village data, account state, and analytics identifiers as potentially sensitive.
- Do not weaken Android platform protections or disable TLS validation to bypass a problem.
- Separate verified findings from assumptions and note any checks that require a physical device or release build.

This is a review aid, not a substitute for the full standards or a professional security assessment.
