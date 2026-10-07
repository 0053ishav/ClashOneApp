# Clash One

**Clash One** is an Android companion app for Clash of Clans progression.

It helps players track upgrades, research, builders, Builder Base progression, multiple accounts, notifications, and Android home-screen widgets without relying on the game being open.

> Clash One is an independent project by Strnge Labs and is not affiliated with Supercell.

## What it does

- Track Home Village builder upgrades
- Track Laboratory research
- Track Hero and Pet upgrades
- Track Builder Base upgrades
- View upcoming upgrades across an account
- Support multiple Clash of Clans accounts
- Provide Android home-screen widgets
- Send upgrade completion notifications
- Import supported village data
- Build progression and planning features on top of a shared game-data model

## Data and the Clash of Clans API

Clash One uses the [Clash of Clans API](https://developer.clashofclans.com/) for data that the API actually exposes.

The API is **not** treated as the source of client-side timers or all progression state. Clash One also uses imported village data, its own persisted account state, and its game-data pipeline to derive progression information.

- **Clash of Clans API** — live game/player data that the API exposes
- **Imported game data** — village/progression information supplied by supported imports
- **Clash One game data** — entity metadata, levels, costs, durations, and other static data
- **Progression logic** — derived state calculated by Clash One
- **Local storage** — account and app state required by the client
- **Backend/CDN services** — shared application and game-data resources

## Tech stack

- Expo SDK 54
- React Native 0.81
- TypeScript
- Expo Router
- `react-native-android-widget`
- Zustand
- MMKV
- Expo SQLite
- RevenueCat
- Google Mobile Ads
- Sentry
- PostHog

Clash One is currently focused on **Android** because Android home-screen widgets are a core product feature.

## Repository structure

```text
app/                 Expo Router screens
components/          Reusable UI components
hooks/               React hooks
services/            API, account, progression and data services
store/               Client state
types/               Shared TypeScript types
utils/               Shared utilities
assets/              Images and widget assets
config/              Runtime configuration
.github/             CI, releases and repository automation
```

## Development

### Requirements

- Node.js 20.19+
- npm
- Android Studio / Android SDK for local Android development
- An Expo development build for native functionality

Install dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run start
```

Run on Android:

```bash
npm run android
```

Run linting:

```bash
npm run lint
```

Run TypeScript checks:

```bash
npm run typecheck
```

Run Expo project health checks:

```bash
npm run doctor
```

## Environment variables

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

Do not commit `.env.local`, API credentials, access tokens, or other private configuration.

Expo `EXPO_PUBLIC_*` variables are embedded into the client bundle and **must not contain secrets**. Anything that must remain secret belongs on a trusted backend or in the appropriate secret store.

## Git workflow

`main` is protected.

```text
feature/fix branch
       ↓
Pull Request → main
       ↓
CI
       ↓
review
       ↓
merge
```

Do not push directly to `main`.

Branch names should follow:

- `feature/<name>`
- `fix/<name>`
- `refactor/<name>`
- `chore/<name>`
- `hotfix/<name>`

See [CONTRIBUTING.md](CONTRIBUTING.md) for the repository workflow.

## CI and releases

Pull requests must pass the required **Lint & Typecheck** check and the protected `main` branch also enforces repository rules.

CI currently validates:

- dependency installation from the lockfile
- ESLint
- TypeScript
- Expo project health

Security automation also runs dependency review and CodeQL analysis.

Releases are tag-driven:

```text
version + CHANGELOG
       ↓
merge to main
       ↓
git tag vX.Y.Z
       ↓
GitHub Actions
       ↓
GitHub Release
```

## Security

Please do not publish credentials, player identifiers, API keys, tokens, or other sensitive information in issues or pull requests.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

The project is maintained by **Strnge Labs**. Licensing terms will be added before external redistribution is enabled.
