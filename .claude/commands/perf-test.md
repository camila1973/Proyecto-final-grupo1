# Performance Testing

k6 scenarios are organized under `performance-tests/scenarios/smoke/` and `performance-tests/scenarios/load/`. Each scenario reads `GATEWAY_URL` from the environment and can run locally or via GitHub Actions.

## Scenario layout

```
performance-tests/scenarios/
├── smoke/
│   ├── search.js    # 3 VUs × 2 min — quick sanity check after deploy
│   └── booking.js   # 1 VU × 5 iterations — provisional cart functional coverage
└── load/
    └── search.js    # ramp 0→30 VUs, 4 min hold, ramp down — SLA gate (p95 ≤ 800ms)
```

## Running locally

```bash
cd performance-tests

# Smoke tests
GATEWAY_URL=http://localhost:3000 k6 run scenarios/smoke/search.js
GATEWAY_URL=http://localhost:3000 k6 run scenarios/smoke/booking.js

# Load tests
GATEWAY_URL=http://localhost:3000 k6 run scenarios/load/search.js

# npm shortcuts (source .env for GATEWAY_URL automatically)
npm run test:smoke:search    # search smoke
npm run test:smoke:booking   # booking smoke
npm run test:load:search     # search load
```

HTML report is written to `performance-tests/results/summary*.html` after each run. JSON raw output goes to `performance-tests/results/results*.json`.

## Running via GitHub Actions

`.github/workflows/performance-testing.yml` — manually triggered (Actions → Performance Testing → Run workflow).

**Inputs:**

| Input | Default | Description |
|---|---|---|
| `profile` | `smoke` | `smoke` or `load` — selects which search scenario to run |
| `gateway_url` | _(blank)_ | API Gateway URL; falls back to the `GATEWAY_URL` repository variable if blank |

**Notes:**
- Runs `scenarios/<profile>/search.js`. To add the booking scenario, duplicate the "Run k6" step with `scenarios/smoke/booking.js`.
- Results are uploaded as a GitHub Actions artifact (`k6-results-<profile>-<run_id>`, retained 7 days) even when thresholds fail.
- `concurrency.group: load-testing` ensures only one load test runs at a time; a new dispatch cancels any in-flight run.
