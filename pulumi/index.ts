import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as docker from "@pulumi/docker";
import * as random from "@pulumi/random";

// ─── Service definitions ──────────────────────────────────────────────────────

const SERVICES = [
  { name: "api-gateway",          port: 3000, db: null          },
  { name: "auth-service",         port: 3001, db: "auth"        },
  { name: "search-service",       port: 3002, db: "search"      },
  { name: "inventory-service",    port: 3003, db: "inventory"   },
  { name: "booking-service",      port: 3004, db: "booking"     },
  { name: "payment-service",      port: 3005, db: "payment"     },
  { name: "notification-service", port: 3006, db: "notification"},
  { name: "partners-service",     port: 3007, db: "partners"    },
] as const;

type SvcName = typeof SERVICES[number]["name"];
const MICROSERVICES = SERVICES.filter(s => s.name !== "api-gateway");
const TAGS = { Project: "travelhub" };

// ─── VPC — public subnets only (no NAT gateway = free) ───────────────────────

const vpc = new awsx.ec2.Vpc("travelhub", {
  natGateways: { strategy: "None" },
  subnetSpecs: [{ type: awsx.ec2.SubnetType.Public, cidrMask: 24 }],
  numberOfAvailabilityZones: 2,
  tags: TAGS,
});

// ─── Security groups ──────────────────────────────────────────────────────────

// App Runner VPC connector — outbound only
const appRunnerSg = new aws.ec2.SecurityGroup("apprunner-sg", {
  vpcId: vpc.vpcId,
  egress: [{ fromPort: 0, toPort: 0, protocol: "-1", cidrBlocks: ["0.0.0.0/0"] }],
  tags: { ...TAGS, Name: "travelhub-apprunner" },
});

// RDS — only reachable from App Runner SG
const dbSg = new aws.ec2.SecurityGroup("db-sg", {
  vpcId: vpc.vpcId,
  ingress: [{
    fromPort: 5432, toPort: 5432, protocol: "tcp",
    securityGroups: [appRunnerSg.id],
    description: "PostgreSQL from App Runner",
  }],
  egress: [{ fromPort: 0, toPort: 0, protocol: "-1", cidrBlocks: ["0.0.0.0/0"] }],
  tags: { ...TAGS, Name: "travelhub-rds" },
});

// ─── RDS — single db.t4g.micro shared by all services ────────────────────────
// Each service uses its own database on the same instance (e.g. auth, search…)
// Cheapest RDS option: ~$15/month vs ~$105/month for 7 separate instances.

const dbPassword = new random.RandomPassword("db-password", {
  length: 32,
  special: false, // avoid URL-encoding issues in connection strings
});

const dbSubnetGroup = new aws.rds.SubnetGroup("db-subnets", {
  subnetIds: vpc.publicSubnetIds,
  tags: TAGS,
});

const db = new aws.rds.Instance("travelhub-db", {
  identifier:          "travelhub",
  engine:              "postgres",
  engineVersion:       "16",
  instanceClass:       "db.t4g.micro",
  allocatedStorage:    20,
  storageType:         "gp2",
  dbName:              "postgres",
  username:            "travelhub",
  password:            dbPassword.result,
  dbSubnetGroupName:   dbSubnetGroup.name,
  vpcSecurityGroupIds: [dbSg.id],
  multiAz:             false,
  publiclyAccessible:  false,
  skipFinalSnapshot:   true,
  tags: TAGS,
});

// ─── ECR repositories ─────────────────────────────────────────────────────────

const ecrToken = aws.ecr.getAuthorizationTokenOutput();

function makeRepo(name: string): aws.ecr.Repository {
  return new aws.ecr.Repository(`ecr-${name}`, {
    name: `travelhub/${name}`,
    forceDelete: true,
    imageTagMutability: "MUTABLE",
    imageScanningConfiguration: { scanOnPush: false },
    tags: TAGS,
  });
}

const baseRepo = makeRepo("base");
const repos: Partial<Record<SvcName, aws.ecr.Repository>> = {};
for (const svc of SERVICES) repos[svc.name] = makeRepo(svc.name);

function registryCreds(repo: aws.ecr.Repository): docker.types.input.RegistryArgs {
  return { server: repo.repositoryUrl, username: ecrToken.userName, password: ecrToken.password };
}

// ─── Docker images ────────────────────────────────────────────────────────────
// base is built once; service images reference it via BASE_IMAGE build-arg.
// Pulumi builds them sequentially so there's no parallel npm-ci memory issue.

const baseImg = new docker.Image("img-base", {
  build: {
    context: "../",
    dockerfile: "../docker/Dockerfile.base",
    platform: "linux/amd64",
  },
  imageName: pulumi.interpolate`${baseRepo.repositoryUrl}:latest`,
  registry: registryCreds(baseRepo),
});

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
    imageName: pulumi.interpolate`${repos[svc.name]!.repositoryUrl}:latest`,
    registry: registryCreds(repos[svc.name]!),
  }, { dependsOn: [baseImg] });
}

// ─── IAM — App Runner ECR access ─────────────────────────────────────────────

const ecrRole = new aws.iam.Role("apprunner-ecr-role", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect:    "Allow",
      Principal: { Service: "build.apprunner.amazonaws.com" },
      Action:    "sts:AssumeRole",
    }],
  }),
  tags: TAGS,
});

new aws.iam.RolePolicyAttachment("apprunner-ecr-policy", {
  role:      ecrRole.name,
  policyArn: "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess",
});

// ─── App Runner shared config ─────────────────────────────────────────────────

// maxSize:1 = fixed at 1 instance per service → cheapest (no auto-scale surprises)
const scaling = new aws.apprunner.AutoScalingConfigurationVersion("scaling", {
  autoScalingConfigurationName: "travelhub-minimal",
  maxConcurrency: 100,
  minSize: 1,
  maxSize: 1,
  tags: TAGS,
});

// VPC connector gives App Runner outbound access to RDS inside the VPC
const vpcConnector = new aws.apprunner.VpcConnector("vpc-connector", {
  vpcConnectorName: "travelhub",
  subnets:          vpc.publicSubnetIds,
  securityGroups:   [appRunnerSg.id],
  tags: TAGS,
});

function makeAppRunner(
  name: string,
  port: number,
  img: docker.Image,
  env: { [k: string]: pulumi.Input<string> },
  deps?: pulumi.Resource[],
): aws.apprunner.Service {
  return new aws.apprunner.Service(`apprunner-${name}`, {
    serviceName: `travelhub-${name}`,
    sourceConfiguration: {
      authenticationConfiguration: { accessRoleArn: ecrRole.arn },
      imageRepository: {
        imageIdentifier:     img.imageName,
        imageRepositoryType: "ECR",
        imageConfiguration: {
          port: String(port),
          runtimeEnvironmentVariables: env,
        },
      },
    },
    // 0.25 vCPU + 0.5 GB — smallest available, ~$14/month per service
    instanceConfiguration: { cpu: "256", memory: "512" },
    autoScalingConfigurationArn: scaling.arn,
    networkConfiguration: {
      egressConfiguration: { egressType: "VPC", vpcConnectorArn: vpcConnector.arn },
    },
    healthCheckConfiguration: {
      protocol: "HTTP", path: "/health",
      interval: 10, timeout: 5, healthyThreshold: 1, unhealthyThreshold: 5,
    },
    tags: TAGS,
  }, { dependsOn: deps });
}

// ─── Microservices (auth, search, inventory, booking, payment, notification, partners) ──

const runners: Partial<Record<SvcName, aws.apprunner.Service>> = {};

for (const svc of MICROSERVICES) {
  const env: { [k: string]: pulumi.Input<string> } = {
    NODE_ENV: "production",
    PORT:     String(svc.port),
    ...(svc.db ? {
      DATABASE_URL: pulumi.interpolate`postgres://travelhub:${dbPassword.result}@${db.address}:5432/${svc.db}`,
    } : {}),
  };
  runners[svc.name] = makeAppRunner(svc.name, svc.port, svcImgs[svc.name]!, env, [db]);
}

// ─── API Gateway — created last so it knows downstream service URLs ────────────

const gwEnv: { [k: string]: pulumi.Input<string> } = {
  NODE_ENV: "production",
  PORT:     "3000",
};
for (const svc of MICROSERVICES) {
  // auth-service → AUTH_SERVICE_URL, notification-service → NOTIFICATION_SERVICE_URL …
  const key = svc.name.replace("-service", "").toUpperCase() + "_SERVICE_URL";
  gwEnv[key] = pulumi.interpolate`https://${runners[svc.name]!.serviceUrl}`;
}

runners["api-gateway"] = makeAppRunner(
  "api-gateway", 3000, svcImgs["api-gateway"]!, gwEnv,
  Object.values(runners) as aws.apprunner.Service[],
);

// ─── Frontend — S3 + CloudFront (~$1/month vs ~$14/month for App Runner nginx) ──

const bucket = new aws.s3.BucketV2("frontend-bucket", { tags: TAGS });

// Block all public access — CloudFront OAC handles delivery
new aws.s3.BucketPublicAccessBlock("frontend-pab", {
  bucket:                bucket.id,
  blockPublicAcls:       true,
  blockPublicPolicy:     true,
  ignorePublicAcls:      true,
  restrictPublicBuckets: true,
});

const oac = new aws.cloudfront.OriginAccessControl("frontend-oac", {
  name:                          "travelhub-frontend",
  originAccessControlOriginType: "s3",
  signingBehavior:               "always",
  signingProtocol:               "sigv4",
});

const cdn = new aws.cloudfront.Distribution("frontend-cdn", {
  enabled:           true,
  defaultRootObject: "index.html",
  origins: [{
    domainName:            bucket.bucketRegionalDomainName,
    originId:              "s3",
    originAccessControlId: oac.id,
  }],
  defaultCacheBehavior: {
    targetOriginId:       "s3",
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods:       ["GET", "HEAD"],
    cachedMethods:        ["GET", "HEAD"],
    compress:             true,
    forwardedValues: { queryString: false, cookies: { forward: "none" } },
    minTtl: 0, defaultTtl: 86400, maxTtl: 31536000,
  },
  // SPA fallback: 403 from S3 (missing file) → serve index.html
  customErrorResponses: [
    { errorCode: 403, responseCode: 200, responsePagePath: "/index.html" },
    { errorCode: 404, responseCode: 200, responsePagePath: "/index.html" },
  ],
  restrictions:      { geoRestriction: { restrictionType: "none" } },
  viewerCertificate: { cloudfrontDefaultCertificate: true },
  tags: TAGS,
});

// Allow CloudFront OAC to read from the S3 bucket
new aws.s3.BucketPolicy("frontend-bucket-policy", {
  bucket: bucket.id,
  policy: pulumi.all([bucket.arn, cdn.arn]).apply(([bucketArn, cdnArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
        Effect:    "Allow",
        Principal: { Service: "cloudfront.amazonaws.com" },
        Action:    "s3:GetObject",
        Resource:  `${bucketArn}/*`,
        Condition: { StringEquals: { "AWS:SourceArn": cdnArn } },
      }],
    }),
  ),
});

// ─── Outputs ──────────────────────────────────────────────────────────────────

export const gatewayUrl        = pulumi.interpolate`https://${runners["api-gateway"]!.serviceUrl}`;
export const frontendUrl       = pulumi.interpolate`https://${cdn.domainName}`;
export const frontendBucket    = bucket.bucket;
export const dbEndpoint        = db.endpoint; // host:5432
export const vpcId             = vpc.vpcId;

// After `pulumi up`, deploy the frontend with:
//   npm run build:frontend
//   aws s3 sync dist/frontend/ s3://$(pulumi stack output frontendBucket)/ --delete
//   aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
