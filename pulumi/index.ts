// Infrastructure entry point
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker";
import * as random from "@pulumi/random";

// ─── Config ──────────────────────────────────────────────────────────────────

const gcpConfig = new pulumi.Config("gcp");
const PROJECT = gcpConfig.require("project");
const REGION = gcpConfig.get("region") ?? "us-central1";
const LABELS = { project: "travelhub" };

const appConfig = new pulumi.Config();
const smtpHost = appConfig.get("smtpHost");
const smtpPort = appConfig.get("smtpPort") ?? "587";
const smtpUser = appConfig.get("smtpUser");
const smtpPass = appConfig.getSecret("smtpPass");
const smtpFrom = appConfig.get("smtpFrom") ?? smtpUser;

// Stripe — required for payment-service
const stripeSecretKey       = appConfig.getSecret("stripeSecretKey");
const stripeWebhookSecret   = appConfig.getSecret("stripeWebhookSecret");
const stripePublishableKey  = appConfig.get("stripePublishableKey");

// ─── Service definitions ──────────────────────────────────────────────────────

const SERVICES = [
  { name: "api-gateway",          port: 3000, db: null                   },
  // inventory before search — search-service needs INVENTORY_SERVICE_URL at creation time
  { name: "inventory-service",    port: 3003, db: "inventory"            },
  { name: "notification-service", port: 3006, db: "notification"         },
  { name: "auth-service",         port: 3001, db: "auth"                 },
  { name: "booking-service",      port: 3004, db: "booking"              },
  { name: "payment-service",      port: 3005, db: "payment"              },
  { name: "partners-service",     port: 3007, db: "partners"             },
  { name: "search-service",       port: 3002, db: "search"               },
  // integration last — needs inventory, booking, and payment URLs
  { name: "integration-service",  port: 3008, db: "integration_service"  },
] as const;

type SvcName = typeof SERVICES[number]["name"];
const MICROSERVICES = SERVICES.filter((s) => s.name !== "api-gateway");

// ─── VPC — for Memorystore (Redis requires private VPC access) ───────────────

const network = new gcp.compute.Network("travelhub", {
  autoCreateSubnetworks: false,
  description: "TravelHub VPC",
});

const subnet = new gcp.compute.Subnetwork("travelhub-subnet", {
  network: network.id,
  region: REGION,
  ipCidrRange: "10.8.0.0/28",
});

// Serverless VPC Access connector — lets Cloud Run reach Memorystore private IP
const vpcConnector = new gcp.vpcaccess.Connector("travelhub-connector", {
  name: "th-vpc-connector",
  region: REGION,
  subnet: { name: subnet.name },
  minInstances: 2,
  maxInstances: 3,
  machineType: "e2-micro",
});

// ─── Cloud SQL — PostgreSQL 16 (db-f1-micro, ~$10/month) ─────────────────────
// Cloud Run connects via the built-in Cloud SQL Auth Proxy (unix socket).
// Each service gets its own database on this single shared instance.

const dbPassword = new random.RandomPassword("db-password", {
  length: 32,
  special: false, // avoid URL-encoding issues in connection strings
});

const dbInstance = new gcp.sql.DatabaseInstance("travelhub-db", {
  databaseVersion: "POSTGRES_16",
  region: REGION,
  settings: {
    tier: "db-f1-micro",
    ipConfiguration: {
      ipv4Enabled: true, // public endpoint required for Cloud SQL Auth Proxy
    },
    backupConfiguration: { enabled: false },
  },
  deletionProtection: false,
});

const dbUser = new gcp.sql.User("travelhub-user", {
  instance: dbInstance.name,
  name: "travelhub",
  password: dbPassword.result,
});

// Create one database per service
const DB_NAMES = [
  "auth", "search", "inventory", "booking",
  "payment", "notification", "partners", "integration_service",
];
for (const dbName of DB_NAMES) {
  new gcp.sql.Database(`db-${dbName}`, {
    instance: dbInstance.name,
    name: dbName,
  }, { dependsOn: [dbUser] });
}

// Connection name used in Cloud Run volume config and DATABASE_URL socket path
const sqlConnectionName = pulumi.interpolate`${PROJECT}:${REGION}:${dbInstance.name}`;

// ─── Memorystore Redis — BASIC 1 GB (~$35/month) ──────────────────────────────
// Used by search-service (caching) and integration-service (Bull job queue).

const redisInstance = new gcp.redis.Instance("travelhub-redis", {
  tier: "BASIC",
  memorySizeGb: 1,
  region: REGION,
  authorizedNetwork: network.id,
  redisVersion: "REDIS_7_0",
  displayName: "travelhub",
  labels: LABELS,
});

// ─── Pub/Sub — replaces Amazon MQ (RabbitMQ) ─────────────────────────────────
// Routing key dots become hyphens to form topic/subscription names.
// Topics are created by Pulumi; services reference them by name (no assertExchange).

const EVENT_ROUTING_KEYS = [
  "inventory.room.upserted",
  "inventory.price.updated",
  "inventory.room.deleted",
] as const;

const pubsubTopics: Record<string, gcp.pubsub.Topic> = {};
for (const key of EVENT_ROUTING_KEYS) {
  const topicName = key.replace(/\./g, "-");
  pubsubTopics[topicName] = new gcp.pubsub.Topic(`topic-${topicName}`, {
    name: topicName,
    labels: LABELS,
  });
}

// Subscriptions consumed by search-service
const SEARCH_SUBSCRIPTIONS = [
  { name: "search-inventory-room-upserted", topic: "inventory-room-upserted" },
  { name: "search-inventory-price-updated", topic: "inventory-price-updated" },
  { name: "search-inventory-room-deleted",  topic: "inventory-room-deleted"  },
];
for (const sub of SEARCH_SUBSCRIPTIONS) {
  new gcp.pubsub.Subscription(`sub-${sub.name}`, {
    name: sub.name,
    topic: pubsubTopics[sub.topic].id,
    ackDeadlineSeconds: 60,
    retryPolicy: { minimumBackoff: "10s", maximumBackoff: "600s" },
    labels: LABELS,
  });
}

// ─── Artifact Registry ────────────────────────────────────────────────────────

const registry = new gcp.artifactregistry.Repository("travelhub", {
  repositoryId: "travelhub",
  location: REGION,
  format: "DOCKER",
  description: "TravelHub Docker images",
  labels: LABELS,
});

const registryUrl = pulumi.interpolate`${REGION}-docker.pkg.dev/${PROJECT}/travelhub`;

// ─── Service account — shared across all Cloud Run services ──────────────────

const serviceAccount = new gcp.serviceaccount.Account("travelhub-sa", {
  accountId: "travelhub-cloudrun",
  displayName: "TravelHub Cloud Run SA",
});

const saMember = pulumi.interpolate`serviceAccount:${serviceAccount.email}`;

new gcp.projects.IAMMember("sa-cloudsql-client",    { project: PROJECT, role: "roles/cloudsql.client",              member: saMember });
new gcp.projects.IAMMember("sa-pubsub-publisher",   { project: PROJECT, role: "roles/pubsub.publisher",             member: saMember });
new gcp.projects.IAMMember("sa-pubsub-subscriber",  { project: PROJECT, role: "roles/pubsub.subscriber",            member: saMember });
new gcp.projects.IAMMember("sa-artifact-reader",    { project: PROJECT, role: "roles/artifactregistry.reader",      member: saMember });
new gcp.projects.IAMMember("sa-secret-accessor",    { project: PROJECT, role: "roles/secretmanager.secretAccessor", member: saMember });

// Allow the CI deployer SA to assign travelhub-cloudrun as a Cloud Run service account
new gcp.serviceaccount.IAMMember("sa-deployer-act-as", {
  serviceAccountId: serviceAccount.name,
  role: "roles/iam.serviceAccountUser",
  member: `serviceAccount:travelhub-deployer@${PROJECT}.iam.gserviceaccount.com`,
});

// ─── Secret Manager — DATABASE_URL per service ────────────────────────────────
// Each service's DATABASE_URL (which embeds the DB password) is stored in
// Secret Manager. Cloud Run pulls the value at startup via secretKeyVersion —
// the plaintext password never appears in Cloud Run env var configuration.

const dbUrlSecrets: Partial<Record<SvcName, gcp.secretmanager.Secret>> = {};

for (const svc of MICROSERVICES) {
  if (!svc.db) continue;

  const secret = new gcp.secretmanager.Secret(`secret-db-url-${svc.name}`, {
    secretId: `travelhub-db-url-${svc.name}`,
    replication: { auto: {} },
    labels: LABELS,
  });

  new gcp.secretmanager.SecretVersion(`secret-db-url-version-${svc.name}`, {
    secret: secret.id,
    // Full DATABASE_URL including password — encrypted at rest by Secret Manager
    secretData: pulumi.interpolate`postgresql://travelhub:${dbPassword.result}@localhost/${svc.db}?host=/cloudsql/${sqlConnectionName}`,
  });

  dbUrlSecrets[svc.name] = secret;
}

// ─── Secret Manager — SMTP password (only when SMTP is configured) ───────────

const smtpPassSecret = smtpPass
  ? (() => {
      const secret = new gcp.secretmanager.Secret("secret-smtp-pass", {
        secretId: "travelhub-smtp-pass",
        replication: { auto: {} },
        labels: LABELS,
      });
      new gcp.secretmanager.SecretVersion("secret-smtp-pass-version", {
        secret: secret.id,
        secretData: smtpPass,
      });
      return secret;
    })()
  : null;

// ─── Secret Manager — Stripe keys (payment-service) ──────────────────────────

const stripeSecretKeySecret = stripeSecretKey
  ? (() => {
      const secret = new gcp.secretmanager.Secret("secret-stripe-secret-key", {
        secretId: "travelhub-stripe-secret-key",
        replication: { auto: {} },
        labels: LABELS,
      });
      new gcp.secretmanager.SecretVersion("secret-stripe-secret-key-version", {
        secret: secret.id,
        secretData: stripeSecretKey,
      });
      return secret;
    })()
  : null;

const stripeWebhookSecretSecret = stripeWebhookSecret
  ? (() => {
      const secret = new gcp.secretmanager.Secret("secret-stripe-webhook-secret", {
        secretId: "travelhub-stripe-webhook-secret",
        replication: { auto: {} },
        labels: LABELS,
      });
      new gcp.secretmanager.SecretVersion("secret-stripe-webhook-secret-version", {
        secret: secret.id,
        secretData: stripeWebhookSecret,
      });
      return secret;
    })()
  : null;

// ─── Docker images ────────────────────────────────────────────────────────────

const gcpAuth = gcp.organizations.getClientConfigOutput({});
const registryCreds: docker.types.input.Registry = {
  server: pulumi.interpolate`${REGION}-docker.pkg.dev`,
  username: "oauth2accesstoken",
  password: gcpAuth.accessToken,
};

const baseImg = new docker.Image("img-base", {
  build: {
    context: "../",
    dockerfile: "../docker/Dockerfile.base",
    platform: "linux/amd64",
  },
  imageName: pulumi.interpolate`${registryUrl}/base:latest`,
  registry: registryCreds,
}, { dependsOn: [registry] });

const svcImgs: Partial<Record<SvcName, docker.Image>> = {};
for (const svc of SERVICES) {
  svcImgs[svc.name] = new docker.Image(`img-${svc.name}`, {
    build: {
      context: "../",
      dockerfile: "../docker/Dockerfile.service",
      platform: "linux/amd64",
      args: {
        BASE_IMAGE:   baseImg.imageName,
        SERVICE_NAME: svc.name,
        SERVICE_PORT: String(svc.port),
      },
    },
    imageName: pulumi.interpolate`${registryUrl}/${svc.name}:latest`,
    registry: registryCreds,
  }, { dependsOn: [baseImg] });
}

// ─── Cloud Run services ───────────────────────────────────────────────────────

const runners: Partial<Record<SvcName, gcp.cloudrunv2.Service>> = {};

type SecretRef = { secretId: pulumi.Input<string>; version?: string };

function makeCloudRun(
  name: string,
  _port: number,
  img: docker.Image,
  plainEnv: Record<string, pulumi.Input<string>>,
  secretEnv: Record<string, SecretRef>,
  withSql: boolean,
  deps?: pulumi.Resource[],
): gcp.cloudrunv2.Service {
  // Plain env vars (non-sensitive: ports, URLs, feature flags)
  const plainVars: gcp.types.input.cloudrunv2.ServiceTemplateContainerEnv[] =
    Object.entries(plainEnv).map(([n, v]) => ({ name: n, value: v as string }));

  // Secret-backed env vars — value injected at runtime from Secret Manager
  const secretVars: gcp.types.input.cloudrunv2.ServiceTemplateContainerEnv[] =
    Object.entries(secretEnv).map(([n, ref]) => ({
      name: n,
      valueSource: {
        secretKeyRef: {
          secret:  ref.secretId as string,
          version: ref.version ?? "latest",
        },
      },
    }));

  const volumes: gcp.types.input.cloudrunv2.ServiceTemplateVolume[] = withSql
    ? [{ name: "cloudsql", cloudSqlInstance: { instances: [sqlConnectionName as unknown as string] } }]
    : [];

  const volumeMounts: gcp.types.input.cloudrunv2.ServiceTemplateContainerVolumeMount[] = withSql
    ? [{ name: "cloudsql", mountPath: "/cloudsql" }]
    : [];

  const svc = new gcp.cloudrunv2.Service(`cloudrun-${name}`, {
    name: `travelhub-${name}`,
    location: REGION,
    labels: LABELS,
    template: {
      serviceAccount: serviceAccount.email,
      volumes,
      vpcAccess: {
        connector: vpcConnector.id,
        egress: "PRIVATE_RANGES_ONLY",
      },
      scaling: { minInstanceCount: 1, maxInstanceCount: 1 },
      containers: [{
        image: img.imageName,
        ports: [{ containerPort: 8080 }],
        envs: [...plainVars, ...secretVars],
        volumeMounts,
        resources: {
          limits: { cpu: "1000m", memory: "512Mi" },
          startupCpuBoost: true,
        },
        startupProbe: {
          httpGet: { path: "/health", port: 8080 },
          initialDelaySeconds: 5,
          periodSeconds: 10,
          failureThreshold: 6,
        },
      }],
    },
    ingress: "INGRESS_TRAFFIC_ALL",
  }, { dependsOn: [dbInstance, redisInstance, vpcConnector, ...(deps ?? [])] });

  // Allow unauthenticated (public) invocations
  new gcp.cloudrunv2.ServiceIamBinding(`invoker-${name}`, {
    name: svc.name,
    location: REGION,
    role: "roles/run.invoker",
    members: ["allUsers"],
  });

  return svc;
}

// ─── Deploy microservices ─────────────────────────────────────────────────────

for (const svc of MICROSERVICES) {
  const plainEnv: Record<string, pulumi.Input<string>> = {
    NODE_ENV: "production",
  };

  // DATABASE_URL pulled from Secret Manager at runtime — never a plain env var
  const secretEnvVars: Record<string, SecretRef> = {};
  if (svc.db && dbUrlSecrets[svc.name]) {
    secretEnvVars["DATABASE_URL"] = { secretId: dbUrlSecrets[svc.name]!.secretId };
  }

  if (svc.name === "search-service") {
    plainEnv["REDIS_URL"]             = pulumi.interpolate`redis://${redisInstance.host}:6379`;
    plainEnv["MESSAGE_BROKER_TYPE"]   = "pubsub";
    plainEnv["PUBSUB_PROJECT_ID"]     = PROJECT;
    plainEnv["INVENTORY_SERVICE_URL"] = pulumi.interpolate`${runners["inventory-service"]!.uri}`;
  }

  if (svc.name === "inventory-service") {
    plainEnv["MESSAGE_BROKER_TYPE"] = "pubsub";
    plainEnv["PUBSUB_PROJECT_ID"]   = PROJECT;
  }

  if (svc.name === "auth-service") {
    plainEnv["NOTIFICATION_SERVICE_URL"] = pulumi.interpolate`${runners["notification-service"]!.uri}`;
  }

  if (svc.name === "notification-service" && smtpHost && smtpUser && smtpPass) {
    plainEnv["SMTP_HOST"] = smtpHost;
    plainEnv["SMTP_PORT"] = smtpPort;
    plainEnv["SMTP_USER"] = smtpUser;
    plainEnv["SMTP_FROM"] = smtpFrom ?? smtpUser;
    secretEnvVars["SMTP_PASS"] = { secretId: smtpPassSecret!.secretId };
  }

  if (svc.name === "booking-service") {
    plainEnv["REDIS_URL"]             = pulumi.interpolate`redis://${redisInstance.host}:6379`;
    plainEnv["INVENTORY_SERVICE_URL"] = pulumi.interpolate`${runners["inventory-service"]!.uri}`;
  }

  if (svc.name === "payment-service") {
    plainEnv["BOOKING_SERVICE_URL"] = pulumi.interpolate`${runners["booking-service"]!.uri}`;
    // SMTP — same config shared with notification-service
    if (smtpHost && smtpUser) {
      plainEnv["SMTP_HOST"] = smtpHost;
      plainEnv["SMTP_PORT"] = smtpPort;
      plainEnv["SMTP_USER"] = smtpUser;
      plainEnv["SMTP_FROM"] = smtpFrom ?? smtpUser;
    }
    if (smtpPassSecret) {
      secretEnvVars["SMTP_PASS"] = { secretId: smtpPassSecret.secretId };
    }
    // Stripe secrets injected at runtime via Secret Manager
    if (stripeSecretKeySecret) {
      secretEnvVars["STRIPE_SECRET_KEY"] = { secretId: stripeSecretKeySecret.secretId };
    }
    if (stripeWebhookSecretSecret) {
      secretEnvVars["STRIPE_WEBHOOK_SECRET"] = { secretId: stripeWebhookSecretSecret.secretId };
    }
    // Publishable key is non-secret (embedded in frontend build) — still useful here as reference
    if (stripePublishableKey) {
      plainEnv["STRIPE_PUBLISHABLE_KEY"] = stripePublishableKey;
    }
  }

  if (svc.name === "integration-service") {
    plainEnv["REDIS_HOST"]            = redisInstance.host;
    plainEnv["REDIS_PORT"]            = "6379";
    plainEnv["INVENTORY_SERVICE_URL"] = pulumi.interpolate`${runners["inventory-service"]!.uri}`;
    plainEnv["BOOKING_SERVICE_URL"]   = pulumi.interpolate`${runners["booking-service"]!.uri}`;
    plainEnv["PAYMENT_SERVICE_URL"]   = pulumi.interpolate`${runners["payment-service"]!.uri}`;
    plainEnv["FX_MOCK"]               = "true";
  }

  runners[svc.name] = makeCloudRun(
    svc.name,
    svc.port,
    svcImgs[svc.name]!,
    plainEnv,
    secretEnvVars,
    svc.db !== null,
  );
}

// ─── Frontend — Cloud Storage static website (~$1/month) ─────────────────────

const frontendBucketResource = new gcp.storage.Bucket("frontend", {
  name: pulumi.interpolate`travelhub-frontend-${PROJECT}`,
  location: REGION,
  uniformBucketLevelAccess: true,
  website: {
    mainPageSuffix: "index.html",
    notFoundPage:   "index.html",
  },
  labels: LABELS,
});

new gcp.storage.BucketIAMBinding("frontend-public", {
  bucket: frontendBucketResource.name,
  role:   "roles/storage.objectViewer",
  members: ["allUsers"],
});

// ─── API Gateway — created last so all downstream URLs are known ──────────────

const gwEnv: Record<string, pulumi.Input<string>> = {
  NODE_ENV:    "production",
  CORS_ORIGIN: "https://storage.googleapis.com",
};
for (const svc of MICROSERVICES) {
  const key = svc.name.replace("-service", "").toUpperCase() + "_SERVICE_URL";
  gwEnv[key] = pulumi.interpolate`${runners[svc.name]!.uri}`;
}

runners["api-gateway"] = makeCloudRun(
  "api-gateway",
  3000,
  svcImgs["api-gateway"]!,
  gwEnv,
  {},       // no secrets for api-gateway
  false,    // no DB
  Object.values(runners) as gcp.cloudrunv2.Service[],
);

// ─── Outputs ──────────────────────────────────────────────────────────────────

export const gatewayUrl           = runners["api-gateway"]!.uri;
export const frontendBucket       = frontendBucketResource.name;
export const frontendUrl          = pulumi.interpolate`https://storage.googleapis.com/${frontendBucketResource.name}/index.html`;
export const dbConnectionName     = sqlConnectionName;
export const redisHost            = redisInstance.host;
// Secret output — used by the seed CI workflow to construct localhost DATABASE_URLs
// via Cloud SQL Auth Proxy. Encrypted in Pulumi state with PULUMI_CONFIG_PASSPHRASE.
export const dbPasswordSecret     = pulumi.secret(dbPassword.result);
// Stripe publishable key — needed when building the frontend with VITE_STRIPE_PUBLISHABLE_KEY
export const stripePublishableKeyOut = stripePublishableKey ?? "";
