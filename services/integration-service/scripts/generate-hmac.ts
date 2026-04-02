#!/usr/bin/env npx tsx
/**
 * Generate an HMAC-SHA256 signature for integration-service webhook testing.
 *
 * Usage:
 *   npx tsx scripts/generate-hmac.ts --secret <secret> --body '<json>'
 *   npx tsx scripts/generate-hmac.ts --secret <secret> --file <path>
 *   echo '<json>' | npx tsx scripts/generate-hmac.ts --secret <secret>
 *
 * Seeded signing secrets:
 *   Partner 1 (a1000000-0000-0000-0000-000000000001): secret-partner-1
 *   Partner 2 (a1000000-0000-0000-0000-000000000002): secret-partner-2
 *
 * Examples:
 *   npx tsx scripts/generate-hmac.ts \
 *     --secret secret-partner-1 \
 *     --body '{"eventId":"evt-001","eventType":"property.created","occurredAt":"2026-04-01T10:00:00Z","data":{"externalId":"new-property-webhook-test","name":"Webhook Test Hotel","type":"hotel","city":"Cancún","countryCode":"MX","stars":4}}'
 */

import { createHmac } from "crypto";
import { readFileSync } from "fs";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1] ?? "";
      i++;
    }
  }
  return args;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk: string) => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const secret = args["secret"] ?? process.env["WEBHOOK_SECRET"] ?? "";
  if (!secret) {
    console.error(
      "Error: provide --secret <value> or set WEBHOOK_SECRET env var",
    );
    process.exit(1);
  }

  let body: string;
  if (args["body"]) {
    body = args["body"];
  } else if (args["file"]) {
    body = readFileSync(args["file"], "utf-8").trim();
  } else if (!process.stdin.isTTY) {
    body = await readStdin();
  } else {
    console.error(
      "Error: provide --body '<json>', --file <path>, or pipe JSON via stdin",
    );
    process.exit(1);
  }

  // Validate the body is parseable JSON (optional but helpful for catching mistakes)
  try {
    JSON.parse(body);
  } catch {
    console.error("Warning: body is not valid JSON — signing anyway");
  }

  const sig = createHmac("sha256", secret).update(body).digest("hex");

  console.log("\nSignature (X-TravelHub-Signature):");
  console.log(sig);
  console.log("\ncurl snippet:");
  console.log(
    `  -H 'X-TravelHub-Signature: ${sig}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${body}'`,
  );
}

void main();
