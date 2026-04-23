import { UpstreamServiceError } from "./upstream-service.error.js";

describe("UpstreamServiceError", () => {
  it("sets message to include the service name", () => {
    const err = new UpstreamServiceError("inventory-service");
    expect(err.message).toBe("Upstream service error: inventory-service");
  });

  it("stores the service name on the instance", () => {
    const err = new UpstreamServiceError("payment-service");
    expect(err.service).toBe("payment-service");
  });

  it("sets the error name to UpstreamServiceError", () => {
    const err = new UpstreamServiceError("auth-service");
    expect(err.name).toBe("UpstreamServiceError");
  });

  it("stores the cause when provided", () => {
    const cause = new Error("ECONNREFUSED");
    const err = new UpstreamServiceError("inventory-service", cause);
    expect(err.cause).toBe(cause);
  });

  it("is an instance of Error", () => {
    const err = new UpstreamServiceError("test-service");
    expect(err).toBeInstanceOf(Error);
  });
});
