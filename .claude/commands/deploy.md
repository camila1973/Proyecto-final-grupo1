# Deployment (Pulumi)

Infrastructure is managed with Pulumi (TypeScript) in `pulumi/`. State is stored in GCS (`gs://travelhub-pulumi-state`). The backend URL is declared in `pulumi/Pulumi.yaml` so no `pulumi login` is needed.

## Prerequisites
- [Pulumi CLI](https://www.pulumi.com/docs/install/) installed
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated (`gcloud auth application-default login`)
- A GCP project with billing enabled
- A GCS bucket for Pulumi state: `gcloud storage buckets create gs://travelhub-pulumi-state --location=us-central1`
- Edit `pulumi/Pulumi.yaml` — replace `YOUR_GCP_PROJECT_ID` with your actual project ID
- `cd pulumi && npm install`

## First-time GCP setup

Enable the required APIs once per project:

```bash
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  pubsub.googleapis.com \
  artifactregistry.googleapis.com \
  vpcaccess.googleapis.com \
  servicenetworking.googleapis.com
```

## Running Pulumi locally

```bash
# Preview changes
PULUMI_CONFIG_PASSPHRASE="" pulumi preview --stack prod --cwd pulumi

# Deploy
PULUMI_CONFIG_PASSPHRASE="" pulumi up --stack prod --cwd pulumi

# Read stack outputs
PULUMI_CONFIG_PASSPHRASE="" pulumi stack output --stack prod --cwd pulumi
```

## What `pulumi up` does

1. Builds all Docker images (base + 9 service images) and pushes to Artifact Registry
2. Creates/updates all Cloud Run services
3. Provisions shared infrastructure (Cloud SQL PostgreSQL, Memorystore Redis, Pub/Sub topics + subscriptions, VPC + Serverless VPC Access connector)

The frontend is **not** deployed by Pulumi — it requires a separate step after `pulumi up`:

```bash
# Convenience script (runs build + gcloud storage rsync):
pnpm run deploy:frontend

# Manual steps:
VITE_API_URL=$(PULUMI_CONFIG_PASSPHRASE="" pulumi stack output gatewayUrl --stack prod --cwd pulumi) \
  pnpm run build:frontend
BUCKET=$(PULUMI_CONFIG_PASSPHRASE="" pulumi stack output frontendBucket --stack prod --cwd pulumi)
gcloud storage rsync -r dist/frontend/ "gs://${BUCKET}/" --delete-unmatched-destination-objects
```

## GitHub Actions deploy

`.github/workflows/deploy.yml` — manually triggered via Actions → Deploy → Run workflow.

Required secrets (repository or `production` GitHub Environment):

| Secret | Value |
|---|---|
| `GCP_SA_KEY` | JSON key of a GCP service account with Pulumi deploy permissions |
| `GCP_PROJECT_ID` | Your GCP project ID |
| `PULUMI_CONFIG_PASSPHRASE` | Empty string `""` |
