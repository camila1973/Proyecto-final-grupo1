import { AppService } from "./app.service";

describe("AppService", () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  describe("getHealth", () => {
    it("returns status ok and service name", () => {
      expect(service.getHealth()).toEqual({
        status: "ok",
        service: "auth-service",
      });
    });
  });
});
