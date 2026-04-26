import { UpstreamServiceError } from "./upstream-service.error.js";

describe("UpstreamServiceError", () => {
  it("is an instance of Error", () => {
    const err = new UpstreamServiceError("booking-service");
    expect(err).toBeInstanceOf(Error);
  });

  it("sets name to UpstreamServiceError", () => {
    const err = new UpstreamServiceError("booking-service");
    expect(err.name).toBe("UpstreamServiceError");
  });

  it("sets message to include the service name", () => {
    const err = new UpstreamServiceError("booking-service");
    expect(err.message).toContain("booking-service");
  });

  it("exposes the service property", () => {
    const err = new UpstreamServiceError("payment-service");
    expect(err.service).toBe("payment-service");
  });

  it("stores cause when provided", () => {
    const cause = new Error("network timeout");
    const err = new UpstreamServiceError("booking-service", cause);
    expect(err.cause).toBe(cause);
  });

  it("cause is undefined when not provided", () => {
    const err = new UpstreamServiceError("booking-service");
    expect(err.cause).toBeUndefined();
  });
});
