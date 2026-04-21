import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "./app.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
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
