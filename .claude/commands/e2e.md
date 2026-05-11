# E2E Testing (Maestro — Mobile)

E2E tests live under `e2e/mobile/`. A sibling `e2e/web/` for Playwright is planned but not yet implemented.

## Folder layout

```
e2e/
└── mobile/
    ├── config.yaml                        # shared appId (com.travelhub.mobile)
    ├── flows/
    │   └── register.yaml                  # registration happy-path scenario
    └── utils/
        ├── navigate-to-register.yaml      # sub-flow: home → Account screen → Register
        └── generate-test-email.js         # generates a unique timestamped email via runScript
```

## Prerequisites

```bash
brew install maestro          # once per machine
maestro --version             # verify
nx run-ios mobile             # build & launch on iOS simulator (must be running before test)
```

## Running locally

```bash
pnpm e2e:mobile               # run all flows in e2e/mobile/flows/
pnpm e2e:mobile:register      # run the registration flow only
pnpm e2e:mobile:record        # record a video of the registration flow
nx e2e mobile                 # same as e2e:mobile via Nx
```

## Key design decisions

- **On Android, run Maestro against a release APK, not debug + Metro** — debug builds depend on Metro to serve the JS bundle; on the Pixel_10 AVD, sustained IO contention causes Android's spell-checker (`Editor.updateSpellCheckSpans`) to ANR on the first keystroke into a TextInput, killing any flow that fills a form. Release APKs embed the JS bundle, start cold in <2s, and avoid Metro entirely. Build with `pnpm run:android -- --variant=release` before invoking Maestro. The `expo-build-properties` plugin in `mobile/app.json` is configured with `android.usesCleartextTraffic: true` so `http://10.0.2.2:3000` (gateway as seen from the emulator) isn't blocked by Android's default release cleartext policy.
- **`openLink: travelhub:///account`** — used instead of tapping the tab bar. iOS 26's Liquid Glass tab bar is not traversable by Maestro's XCUITest driver regardless of `testID`, `tabBarTestID`, or text matching. Deep links via Expo Router's scheme are the reliable alternative.
- **`runScript` for unique emails** — `utils/generate-test-email.js` sets `output.TEST_EMAIL` to `testuser+<timestamp>@example.com` so each run registers a fresh account. Reference it in flows as `${output.TEST_EMAIL}`.
- **`textContentType="oneTimeCode"`** on both password fields in `mobile/app/(auth)/register.tsx` — suppresses iOS's "Use Strong Password?" system sheet, which otherwise blocks `inputText`.
- **`register-title` testID** on the "Create account" heading — tapped after the confirm-password `inputText` to dismiss the keyboard before the checkbox tap, since `hideKeyboard` is not supported by React Native Paper inputs and the keyboard would otherwise intercept subsequent taps.
- **`autoCorrect={false}`** added to firstName and lastName fields — prevents iOS autocorrect from silently rewriting character-by-character input.

## Adding a new flow

1. Create `e2e/mobile/flows/<name>.yaml` with an `appId` config section and `---` separator.
2. Extract any reusable navigation into `e2e/mobile/utils/`.
3. Add testIDs to source components as needed — keep additions minimal and co-located with the flow they support.
4. Run with `pnpm e2e:mobile` to verify all flows still pass.
