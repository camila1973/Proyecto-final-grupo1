# TravelHub — Deployment Guide

All production deployments run through **GitHub Actions**. You do not run `pulumi up` manually in production — only for one-time initial setup or debugging locally.

---

## GitHub Secrets Required

Go to **Settings → Secrets and variables → Actions → New repository secret** and add the values used by the deployment and build workflows. The workflows and Pulumi expect the following secrets and configuration keys:

| Secret | Required by | Notes |
|---|---|---|
| `GCP_SA_KEY` | `deploy`, `destroy`, `seed` | Full JSON key of the deploy service account used by GitHub Actions (or configure Workload Identity Federation as an alternative). |
| `GCP_PROJECT_ID` | `deploy`, `destroy` | GCP project id (e.g. `travelhub-prod`). Pulumi and gcloud commands read this. |
| `PULUMI_CONFIG_PASSPHRASE` | `deploy`, `destroy`, `seed` | Set to empty string `""` for this repo (Pulumi secrets not encrypted with a passphrase). |
| `CODECOV_TOKEN` | `ci` (optional) | Optional — upload coverage reports to Codecov. |
| `SMTP_USER` | `deploy` | Pulumi writes this to Secret Manager (plain value). |
| `SMTP_PASS` | `deploy` | Pulumi writes this to Secret Manager (secret). |
| `SMTP_FROM` | `deploy` | Sender address used by notification emails (plain). |
| `STRIPE_SECRET_KEY` | `deploy` | Stripe secret key (secret Pulumi config). |
| `STRIPE_WEBHOOK_SECRET` | `deploy` | Stripe webhook secret (secret Pulumi config). |
| `STRIPE_PUBLISHABLE_KEY` | `deploy`, `mobile workflows`, `publish-release` | Build-time value used when compiling frontend/mobile; present in several workflows. |
| `AUTH_JWT_SECRET` | `deploy` | JWT secret used by services (secret Pulumi config). |
| `FIREBASE_PROJECT_ID` | `deploy` | Firebase project id (plain). |
| `FIREBASE_CLIENT_EMAIL` | `deploy` | Firebase service account client email (secret Pulumi config). |
| `FIREBASE_PRIVATE_KEY` | `deploy` | Firebase private key (secret — store with newline characters escaped). |

Notes:
- Pulumi will create per-service DB secrets named like `travelhub-db-url-<service>`; you do not need to create those manually.
- Mobile and some CI workflows reference `STRIPE_PUBLISHABLE_KEY` and will fail the build if it is not present.
- If you prefer not to store a long JSON service-account key in GitHub, consider configuring Workload Identity Federation (GCP) and giving the Actions runner an identity with the required roles.

### Quick Pulumi config examples

After the first `pulumi up` (or before building the frontend) you may want to set Pulumi config values that are consumed by the `deploy.yml` workflow. From the repo root run:

```bash
# inside pulumi/ directory: set plain values
cd pulumi
pulumi config set --stack prod smtpUser "smtp@example.com"
pulumi config set --stack prod smtpFrom "noreply@example.com"

# set secret values
pulumi config set --stack prod --secret smtpPass "super-secret-smtp-pass"
pulumi config set --stack prod --secret stripeSecretKey "sk_live_xxx"
pulumi config set --stack prod stripePublishableKey "pk_live_xxx"
pulumi config set --stack prod --secret authJwtSecret "replace-with-random-secret"

# set firebase (private key may contain newlines; easier to use GitHub secret and let the workflow set Pulumi)
pulumi config set --stack prod firebaseProjectId "my-firebase-project"
cd ..
```

Tip: For values that contain newlines (for example `FIREBASE_PRIVATE_KEY`) prefer setting them using the GitHub web UI or `gh secret` so newlines are preserved correctly. Example with the GitHub CLI:

```bash
printf '%s' "$FIREBASE_PRIVATE_KEY" | gh secret set FIREBASE_PRIVATE_KEY
```

### Helpful `gcloud` / `gsutil` snippets

If you need to create the Pulumi state bucket and grant the deployer SA access manually:

```bash
# create bucket
gcloud storage buckets create gs://travelhub-pulumi-state --location=us-central1 --uniform-bucket-level-access

# grant SA access to the bucket (replace ${SA_EMAIL})
gsutil iam ch serviceAccount:${SA_EMAIL}:roles/storage.objectAdmin gs://travelhub-pulumi-state
```

### Deploy env examples (local)

You can run Pulumi locally for debugging. Example with explicit stack and region:

```bash
PULUMI_STACK=prod REGION=us-central1 PULUMI_CONFIG_PASSPHRASE="" pulumi up --cwd pulumi

# read outputs
PULUMI_STACK=prod pulumi stack output --cwd pulumi
```

### Exact `pulumi config set` commands used by the workflows

These are the precise `pulumi config set` invocations the `deploy.yml` workflow runs (replace `prod` with your stack name if different). Run them from the repository root using `--cwd pulumi` or change directory into `pulumi/` first.

```bash
# plain values
pulumi config set --stack prod --cwd pulumi smtpHost "smtp.gmail.com"
pulumi config set --stack prod --cwd pulumi smtpUser "smtp@example.com"
pulumi config set --stack prod --cwd pulumi smtpFrom "noreply@example.com"
pulumi config set --stack prod --cwd pulumi stripePublishableKey "pk_live_xxx"
pulumi config set --stack prod --cwd pulumi firebaseProjectId "my-firebase-project"

# secret values (use --secret to encrypt into Pulumi state)
pulumi config set --stack prod --cwd pulumi --secret smtpPass "super-secret-smtp-pass"
pulumi config set --stack prod --cwd pulumi --secret stripeSecretKey "sk_live_xxx"
pulumi config set --stack prod --cwd pulumi --secret stripeWebhookSecret "whsec_xxx"
pulumi config set --stack prod --cwd pulumi --secret authJwtSecret "replace-with-random-secret"
pulumi config set --stack prod --cwd pulumi --secret firebaseClientEmail "firebase-client@example.iam.gserviceaccount.com"
pulumi config set --stack prod --cwd pulumi --secret firebasePrivateKey "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Note: The workflow sets these values from GitHub Secrets automatically before calling `pulumi up`. If you run the workflow, you do not need to run these manually unless you are debugging locally.

### Note on Service Account roles

The deploy service account needs a broad set of roles to provision infra. The `gcloud` snippet earlier in this doc lists the roles used by the project; keep that list as the minimal set for deployment. If you prefer tighter RBAC, grant the roles incrementally and test the workflow to see which permission fails.

---

## One-time setup (do this once before the first deploy)

### 1. Create a GCP project

```bash
gcloud projects create travelhub-prod --name="TravelHub"
gcloud config set project travelhub-prod
# Enable billing for the project in the GCP Console
```

### 2. Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  pubsub.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  vpcaccess.googleapis.com \
  compute.googleapis.com \
  iam.googleapis.com \
  storage.googleapis.com
```

### 3. Create the GCS bucket for Pulumi state

Pulumi needs a bucket to store its state. Create it once manually:

```bash
gcloud storage buckets create gs://travelhub-pulumi-state \
  --location=us-central1 \
  --uniform-bucket-level-access
```

### 4. Create the deploy service account

This is the identity that GitHub Actions uses to deploy everything:

```bash
# Create the SA
gcloud iam service-accounts create travelhub-deployer \
  --display-name="TravelHub CI Deployer"

PROJECT_ID=$(gcloud config get-value project)
SA_EMAIL="travelhub-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant required roles
for ROLE in \
  roles/run.admin \
  roles/cloudsql.admin \
  roles/redis.admin \
  roles/pubsub.admin \
  roles/secretmanager.admin \
  roles/artifactregistry.admin \
  roles/vpcaccess.admin \
  roles/compute.networkAdmin \
  roles/compute.subnetworkAdmin \
  roles/storage.admin \
  roles/iam.serviceAccountAdmin \
  roles/iam.securityAdmin \
  roles/resourcemanager.projectIamAdmin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$ROLE"
done

# Also grant the SA permission to act as itself (needed for Pulumi to bind it to Cloud Run)
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Grant the SA access to the Pulumi state bucket
gcloud storage buckets add-iam-policy-binding gs://travelhub-pulumi-state \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin"
```

### 5. Download the SA key and add it to GitHub Secrets

```bash
gcloud iam service-accounts keys create /tmp/travelhub-deployer-key.json \
  --iam-account="${SA_EMAIL}"

# Print the JSON — copy the entire output into the GCP_SA_KEY GitHub secret
cat /tmp/travelhub-deployer-key.json

# Delete the local file immediately
rm /tmp/travelhub-deployer-key.json
```

### 6. Set the GCP project ID in Pulumi config

Open `pulumi/Pulumi.yaml` and replace `YOUR_GCP_PROJECT_ID` with your actual project ID:

```yaml
config:
  gcp:project:
    value: travelhub-prod   # ← your real project ID here
  gcp:region:
    value: us-central1
```

Commit and push this change.

### 7. Add the GitHub Secrets

In your GitHub repository go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Name | Value |
|---|---|
| `GCP_PROJECT_ID` | Your project ID (e.g. `travelhub-prod`) |
| `GCP_SA_KEY` | The full JSON content of the key file from step 5 |
| `PULUMI_CONFIG_PASSPHRASE` | Empty string `""` |

---

## How to deploy

### Trigger a deployment via GitHub Actions (recommended)

1. Go to your repository on GitHub
2. Click **Actions** → **Deploy**
3. Click **Run workflow** → **Run workflow**

The workflow:
1. Authenticates to GCP with the service account
2. Runs `pulumi up` which:
   - Provisions all infrastructure (Cloud SQL, Memorystore, Pub/Sub, VPC, Artifact Registry, Secret Manager secrets)
   - Builds all 9 Docker images and pushes them to Artifact Registry
   - Creates/updates all 9 Cloud Run services
3. Deploys the frontend: builds the React SPA and syncs it to Cloud Storage

The first deploy takes ~15–20 minutes (Cloud SQL provisioning is slow). Subsequent deploys take ~5–10 minutes.

### Deploy from your local machine (debugging / one-off)

Only do this if you need to inspect state or debug. Always use CI for production.

```bash
# Authenticate with your personal GCP account
gcloud auth application-default login

# Install Pulumi dependencies
cd pulumi && npm install && cd ..

# Preview what would change (safe, no side effects)
PULUMI_CONFIG_PASSPHRASE="" pulumi preview --stack prod --cwd pulumi

# Deploy (prompts for confirmation)
PULUMI_CONFIG_PASSPHRASE="" pulumi up --stack prod --cwd pulumi

# Read outputs
PULUMI_CONFIG_PASSPHRASE="" pulumi stack output --stack prod --cwd pulumi
```

---

## What Pulumi manages

### Infrastructure
| Resource | GCP Service | Notes | Est. cost/month |
|---|---|---|---|
| VPC + subnet | Compute Engine | Private network for Memorystore | Free |
| VPC Access connector | Serverless VPC Access | 2× e2-micro; lets Cloud Run reach Memorystore | ~$12 |
| PostgreSQL | Cloud SQL 16 (db-f1-micro) | Single instance, 8 separate databases | ~$10 |
| Redis | Memorystore BASIC 1 GB | Shared by search-service + integration-service | ~$12 |
| Message broker | Pub/Sub | 3 topics + 3 subscriptions | Free (< 10 GB/mo) |
| Container registry | Artifact Registry | ~10 GB of Docker layers | ~$1–3 |
| Cloud Run | Cloud Run v2 | 9 services, scale-to-zero (min 0) | ~$0–5 |
| Frontend | Cloud Storage | Static SPA (< 1 GB) | < $1 |
| Secrets | Secret Manager | 8 secrets, accessed at startup only | < $1 |
| **Total** | | | **~$35–45/month** |

> Costs are estimates for `us-central1` at low/moderate traffic. Cloud Run is billed per request (CPU + memory only during invocations), so with min 0 instances it costs almost nothing at rest. The VPC connector and Cloud SQL instance are the fixed costs that run 24/7.

### Secrets (Secret Manager)
One secret per service that has a database, named `travelhub-db-url-{service}`:

| Secret name | Used by |
|---|---|
| `travelhub-db-url-auth-service` | auth-service |
| `travelhub-db-url-inventory-service` | inventory-service |
| `travelhub-db-url-booking-service` | booking-service |
| `travelhub-db-url-payment-service` | payment-service |
| `travelhub-db-url-notification-service` | notification-service |
| `travelhub-db-url-partners-service` | partners-service |
| `travelhub-db-url-search-service` | search-service |
| `travelhub-db-url-integration-service` | integration-service |

The `DATABASE_URL` secret contains the full PostgreSQL connection string including the password. Cloud Run injects it at startup via `secretKeyRef` — the plaintext password never appears in Cloud Run environment variable configuration.

### Vendor webhook secrets (Hotelbeds / TravelClick / RoomRaccoon)

Third-party webhook signing secrets used by `integration-service` are not created automatically by Pulumi in this repo. You must provision them in Secret Manager and make them available to the Cloud Run service. Recommended steps:

1. Create the secret in Secret Manager:

```bash
# replace NAME and VALUE
gcloud secrets create travelhub-webhook-hotelbeds --replication-policy="automatic"
printf '%s' "${HOTELBEDS_SECRET}" | gcloud secrets versions add travelhub-webhook-hotelbeds --data-file=-
```

2. Attach the secret to the Cloud Run service (so it becomes an env var at runtime):

```bash
# set SECRET_ENV_NAME on the Cloud Run service to point to Secret Manager secret latest version
gcloud run services update travelhub-integration-service \
  --region=us-central1 \
  --update-secrets WEBHOOK_SECRET_HOTELBEDS=travelhub-webhook-hotelbeds:latest
```

Repeat for `travelhub-webhook-travelclick` and `travelhub-webhook-roomraccoon` (env var names expected by the service: `WEBHOOK_SECRET_TRAVELCLICK`, `WEBHOOK_SECRET_ROOMRACCOON`).

Note: If you prefer to manage these via Pulumi, add Pulumi `appConfig` keys and secret manager creation to `pulumi/index.ts`, then run `pulumi up` so the change is tracked in IaC.

### FX conversion flag (`FX_MOCK`)

`integration-service` is deployed with `FX_MOCK=true` by default (see `pulumi/index.ts` where `plainEnv["FX_MOCK"] = "true"`). This means price conversions are mocked in production unless changed.

To change this permanently, update `pulumi/index.ts` to source the flag from `pulumi.Config()` or remove the hard-coded value, then run:

```bash
cd pulumi
pulumi up --stack prod
```

Avoid updating Cloud Run env vars manually when Pulumi controls the service; manual edits will be overwritten by the next `pulumi up`.

### Services (Cloud Run)
9 Cloud Run services, one per microservice. All use a shared service account (`travelhub-cloudrun@PROJECT.iam.gserviceaccount.com`).

### Frontend
Static files in a public Cloud Storage bucket (`travelhub-frontend-PROJECT`). SPA routing works because `notFoundPage: index.html` returns index.html for any missing path.

---

## Stack outputs

After `pulumi up`, these outputs are available:

```bash
PULUMI_CONFIG_PASSPHRASE="" pulumi stack output --stack prod --cwd pulumi
```

| Output | Description |
|---|---|
| `gatewayUrl` | HTTPS URL of the API Gateway Cloud Run service |
| `frontendUrl` | Public URL of the frontend (Cloud Storage) |
| `frontendBucket` | GCS bucket name (for manual `gcloud storage` commands) |
| `dbConnectionName` | Cloud SQL connection name (`PROJECT:REGION:INSTANCE`) |
| `redisHost` | Memorystore private IP |

---

## Tear down

To destroy all resources:

```bash
PULUMI_CONFIG_PASSPHRASE="" pulumi destroy --stack prod --cwd pulumi
```

> **Warning:** This deletes Cloud SQL (all databases), Memorystore, all Cloud Run services, all secrets, and the Artifact Registry. It does **not** delete the Pulumi state bucket (`gs://travelhub-pulumi-state`).

---

## Troubleshooting

**`pulumi up` fails on the first run with "stack not found"**
The workflow uses `upsert: true` which creates the stack automatically. If running locally, run `PULUMI_CONFIG_PASSPHRASE="" pulumi stack init prod --cwd pulumi` once.

**Cloud Run service fails to start (DATABASE_URL error)**
Check that the Cloud SQL instance is running and the Secret Manager secret for that service exists:
```bash
gcloud secrets list --filter="name:travelhub-db-url"
gcloud run services describe travelhub-search-service --region=us-central1 --format=json | jq '.spec'
```

**Docker push fails with auth error**
The CI step `gcloud auth configure-docker us-central1-docker.pkg.dev` must run before Pulumi. This is already in the workflow. Locally, run:
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

**Memorystore connection refused**
Cloud Run needs the VPC Access connector to reach Memorystore. Verify:
```bash
gcloud run services describe travelhub-search-service --region=us-central1 \
  --format='value(spec.template.metadata.annotations)'
```
Look for `run.googleapis.com/vpc-access-connector`.
