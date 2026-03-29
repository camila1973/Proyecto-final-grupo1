import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it("returns ok status with service name", () => {
    expect(controller.getHealth()).toEqual({
      status: "ok",
      service: "inventory-service",
    });
  });
});
