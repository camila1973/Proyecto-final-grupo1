# TravelHub — Deployment Guide

All production deployments run through **GitHub Actions**. You do not run `pulumi up` manually in production — only for one-time initial setup or debugging locally.

---

## GitHub Secrets Required

Go to **Settings → Secrets and variables → Actions → New repository secret** and add all four:

| Secret | Required by | Value |
|---|---|---|
| `GCP_SA_KEY` | deploy, destroy, seed | Full JSON key of the deploy service account — see "Create the deploy service account" below |
| `GCP_PROJECT_ID` | deploy, destroy | Your GCP project ID, e.g. `travelhub-cbayona-prod` |
| `PULUMI_CONFIG_PASSPHRASE` | deploy, destroy, seed | Empty string `""` — this project uses no passphrase encryption |
| `CODECOV_TOKEN` | ci (optional) | Token from [codecov.io](https://codecov.io) for coverage reports — omit if you don't use Codecov |

That is everything. No AWS credentials, no other secrets.

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
