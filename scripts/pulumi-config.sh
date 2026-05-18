#!/usr/bin/env bash
set -euo pipefail

STACK=${1:-prod}
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/pulumi"

require() {
  local name=$1
  local value=${2:-}
  if [[ -z "$value" ]]; then
    echo "ERROR: Missing required environment variable $name" >&2
    exit 1
  fi
}

require "GCP_PROJECT_ID" "$GCP_PROJECT_ID"
require "GCP_REGION" "$GCP_REGION"
require "AUTH_JWT_SECRET" "$AUTH_JWT_SECRET"
require "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
require "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
require "STRIPE_PUBLISHABLE_KEY" "$STRIPE_PUBLISHABLE_KEY"
require "SMTP_HOST" "$SMTP_HOST"
require "SMTP_USER" "$SMTP_USER"
require "SMTP_PASS" "$SMTP_PASS"
require "FIREBASE_PROJECT_ID" "$FIREBASE_PROJECT_ID"
require "FIREBASE_CLIENT_EMAIL" "$FIREBASE_CLIENT_EMAIL"
require "FIREBASE_PRIVATE_KEY" "$FIREBASE_PRIVATE_KEY"

if [[ -n "${GCP_SERVICE_ACCOUNT_KEY:-}" ]]; then
  GCP_SERVICE_ACCOUNT_KEY_CONTENT="$GCP_SERVICE_ACCOUNT_KEY"
elif [[ -n "${GCP_SERVICE_ACCOUNT_KEY_FILE:-}" ]]; then
  if [[ ! -f "$GCP_SERVICE_ACCOUNT_KEY_FILE" ]]; then
    echo "ERROR: GCP_SERVICE_ACCOUNT_KEY_FILE file does not exist: $GCP_SERVICE_ACCOUNT_KEY_FILE" >&2
    exit 1
  fi
  GCP_SERVICE_ACCOUNT_KEY_CONTENT="$(cat "$GCP_SERVICE_ACCOUNT_KEY_FILE")"
else
  GCP_SERVICE_ACCOUNT_KEY_CONTENT=""
fi

pulumi config set --stack "$STACK" gcp:project "$GCP_PROJECT_ID"
pulumi config set --stack "$STACK" gcp:region "$GCP_REGION"

pulumi config set --secret --stack "$STACK" authJwtSecret "$AUTH_JWT_SECRET"
pulumi config set --secret --stack "$STACK" stripeSecretKey "$STRIPE_SECRET_KEY"
pulumi config set --secret --stack "$STACK" stripeWebhookSecret "$STRIPE_WEBHOOK_SECRET"
pulumi config set --stack "$STACK" stripePublishableKey "$STRIPE_PUBLISHABLE_KEY"
pulumi config set --stack "$STACK" smtpHost "$SMTP_HOST"
pulumi config set --stack "$STACK" smtpUser "$SMTP_USER"
pulumi config set --secret --stack "$STACK" smtpPass "$SMTP_PASS"
pulumi config set --stack "$STACK" firebaseProjectId "$FIREBASE_PROJECT_ID"
pulumi config set --secret --stack "$STACK" firebaseClientEmail "$FIREBASE_CLIENT_EMAIL"
pulumi config set --secret --stack "$STACK" firebasePrivateKey "$FIREBASE_PRIVATE_KEY"

if [[ -n "$GCP_SERVICE_ACCOUNT_KEY_CONTENT" ]]; then
  pulumi config set --secret --stack "$STACK" gcpServiceAccountKey "$GCP_SERVICE_ACCOUNT_KEY_CONTENT"
else
  echo "NOTE: GCP_SERVICE_ACCOUNT_KEY / GCP_SERVICE_ACCOUNT_KEY_FILE is not set; using default gcloud credentials if available."
fi

echo "Pulumi config values set for stack '$STACK'."
