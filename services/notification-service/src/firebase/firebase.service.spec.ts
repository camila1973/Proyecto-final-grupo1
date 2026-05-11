import { Test, TestingModule } from "@nestjs/testing";
import { FirebaseService } from "./firebase.service";

// Mock firebase-admin before importing the service
jest.mock("firebase-admin", () => {
  const mockSend = jest.fn().mockResolvedValue("message-id");
  const mockMessaging = jest.fn().mockReturnValue({ send: mockSend });
  const mockInitializeApp = jest.fn().mockReturnValue({ name: "test-app" });
  const mockCert = jest.fn().mockReturnValue({ type: "service_account" });
  const mockCredential = { cert: mockCert };

  return {
    initializeApp: mockInitializeApp,
    messaging: mockMessaging,
    credential: mockCredential,
    app: { App: jest.fn() },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require("firebase-admin");

describe("FirebaseService", () => {
  let service: FirebaseService;

  const FIREBASE_ENV = {
    FIREBASE_PROJECT_ID: "test-project",
    FIREBASE_CLIENT_EMAIL: "test@test.iam.gserviceaccount.com",
    FIREBASE_PRIVATE_KEY:
      "-----BEGIN RSA PRIVATE KEY-----\\ntest\\n-----END RSA PRIVATE KEY-----",
  };

  async function buildService(): Promise<FirebaseService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FirebaseService],
    }).compile();
    return module.get<FirebaseService>(FirebaseService);
  }

  beforeEach(() => {
    // Ensure Firebase env vars are absent before each test so that tests
    // which don't call Object.assign(process.env, FIREBASE_ENV) start clean,
    // regardless of what the root .env file may have loaded.
    for (const key of Object.keys(FIREBASE_ENV)) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(FIREBASE_ENV)) {
      delete process.env[key];
    }
  });

  it("does not initialize when credentials are missing", async () => {
    service = await buildService();
    service.onModuleInit();
    expect(admin.initializeApp).not.toHaveBeenCalled();
  });

  it("initializes Firebase when all credentials are set", async () => {
    Object.assign(process.env, FIREBASE_ENV);
    service = await buildService();
    service.onModuleInit();
    expect(admin.initializeApp).toHaveBeenCalledTimes(1);
    expect(admin.credential.cert).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "test-project",
        clientEmail: "test@test.iam.gserviceaccount.com",
      }),
    );
  });

  it("skips sendPushNotification when Firebase is not initialized", async () => {
    service = await buildService();
    service.onModuleInit();
    await service.sendPushNotification("some-token", "Title", "Body");
    expect(admin.messaging).not.toHaveBeenCalled();
  });

  it("calls admin.messaging().send with correct payload when initialized", async () => {
    Object.assign(process.env, FIREBASE_ENV);
    service = await buildService();
    service.onModuleInit();
    await service.sendPushNotification("device-token-123", "Hello", "World", {
      key: "val",
    });
    expect(admin.messaging).toHaveBeenCalledTimes(1);
    const { send } = admin.messaging.mock.results[0].value;
    expect(send).toHaveBeenCalledWith({
      token: "device-token-123",
      notification: { title: "Hello", body: "World" },
      data: { key: "val" },
    });
  });

  it("calls admin.messaging().send without data when data is undefined", async () => {
    Object.assign(process.env, FIREBASE_ENV);
    service = await buildService();
    service.onModuleInit();
    await service.sendPushNotification("device-token-456", "T", "B");
    const { send } = admin.messaging.mock.results[0].value;
    expect(send).toHaveBeenCalledWith({
      token: "device-token-456",
      notification: { title: "T", body: "B" },
    });
  });

  it("logs error and does not throw when FCM send fails", async () => {
    Object.assign(process.env, FIREBASE_ENV);
    const mockSend = jest.fn().mockRejectedValue(new Error("FCM error"));
    admin.messaging.mockReturnValue({ send: mockSend });

    service = await buildService();
    service.onModuleInit();
    await expect(
      service.sendPushNotification("token", "T", "B"),
    ).resolves.toBeUndefined();
  });

  it("logs error and does not throw when initializeApp throws", () => {
    Object.assign(process.env, FIREBASE_ENV);
    admin.initializeApp.mockImplementationOnce(() => {
      throw new Error("Firebase init failed");
    });

    // Instantiate directly to avoid compile() consuming the one-shot mock
    const svc = new (FirebaseService as any)();
    expect(() => svc.onModuleInit()).not.toThrow();
  });
});
