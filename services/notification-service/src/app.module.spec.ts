import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { FirebaseService } from "./firebase/firebase.service";
import { DeviceTokensService } from "./device-tokens/device-tokens.service";
import { KYSELY } from "./database/database.provider";

const mockFirebaseService = {
  onModuleInit: jest.fn(),
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
};

const mockDeviceTokensService = {
  findByUserId: jest.fn().mockResolvedValue(null),
  upsert: jest.fn(),
  remove: jest.fn(),
};

const mockKysely = {};

describe("AppModule unit wiring", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: DeviceTokensService, useValue: mockDeviceTokensService },
        { provide: KYSELY, useValue: mockKysely },
      ],
    }).compile();
  });

  it("should compile the module", () => {
    expect(module).toBeDefined();
  });

  it("should provide AppController", () => {
    const controller = module.get<AppController>(AppController);
    expect(controller).toBeDefined();
  });

  it("should provide AppService", () => {
    const service = module.get<AppService>(AppService);
    expect(service).toBeDefined();
  });
});
