# Expo Project Structure Guidance

Use this guide when adding features, moving files, changing routing, or deciding where domain logic belongs in Clash One.

## Primary reference
- Expo blog, App Folder Structure Best Practices: https://expo.dev/blog/expo-app-folder-structure-best-practices
- Expo Router documentation: https://docs.expo.dev/router/introduction/
- Expo Router error handling: https://docs.expo.dev/router/error-handling/
- Expo SDK documentation: https://docs.expo.dev/

The blog may describe newer Expo templates or SDK versions than this repository uses. Clash One currently targets Expo SDK 54; adapt examples to the installed version and verify APIs against version-matched documentation instead of copying snippets blindly.

## Repository rules
- Keep `app/` focused on Expo Router routes, layouts, and route-level composition.
- Put reusable UI in the existing component locations and domain behavior in domain/service modules; do not turn route files into general-purpose business-logic containers.
- Keep progression calculations outside widgets and UI. Widgets should consume prepared, typed state from the appropriate domain/service layer.
- Keep persistence, remote API access, generated game data, and presentation concerns separate.
- Avoid creating folders solely to satisfy a generic convention. Follow the current repository's established structure unless a concrete problem warrants a change.
- Avoid broad moves or renames without a migration plan, import update, and tests.
- Preserve route naming and deep-link behavior when changing Expo Router files.
- Use explicit types and validate untrusted runtime data; TypeScript types do not validate JSON at runtime.

## Change procedure
1. Inspect the current tree and neighboring feature implementations before proposing a new location.
2. Explain why the new boundary or folder is needed.
3. Make the smallest coherent change and update imports/tests together.
4. Run typecheck, lint, and relevant tests. Run Expo Doctor when config or dependencies change.
5. For route/layout/native changes, note any Android smoke test required.
