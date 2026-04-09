#!/usr/bin/env node
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const out = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();

const PULUMI = "cd pulumi && PULUMI_CONFIG_PASSPHRASE='' pulumi stack output";
const bucket = out(`${PULUMI} frontendBucket --stack prod`);
const gatewayUrl = out(`${PULUMI} gatewayUrl --stack prod`);
const baseUrl = `/${bucket}/`;

console.log(`Bucket:     ${bucket}`);
console.log(`Gateway:    ${gatewayUrl}`);
console.log(`Base URL:   ${baseUrl}`);

run(`VITE_API_URL=${gatewayUrl} VITE_BASE_URL=${baseUrl} pnpm run build:frontend`);

// Sync hashed assets first (safe to cache long-term, filenames change on every build)
run(`gcloud storage rsync -r dist/frontend/assets/ gs://${bucket}/assets/ --delete-unmatched-destination-objects`);

// Upload index.html last with no-cache so browsers always fetch the latest version
run(`gcloud storage cp --cache-control="no-store, no-cache" dist/frontend/index.html gs://${bucket}/index.html`);

// Sync any remaining files (vite.svg, package.json, etc.) without special headers
run(`gcloud storage rsync -r dist/frontend/ gs://${bucket}/ --delete-unmatched-destination-objects --exclude="assets/.*|index\\.html"`);
