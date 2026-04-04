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
run(`gcloud storage rsync -r dist/frontend/ gs://${bucket}/ --delete-unmatched-destination-objects`);
