import type { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { PartnersClient } from "./partners.client.js";
import { UpstreamServiceError } from "./upstream-service.error.js";

function makeClient(
  httpGet: jest.Mock = jest
    .fn()
    .mockReturnValue(of({ data: { checkInKey: "secret-key" } })),
) {
  const httpService = { get: httpGet } as unknown as HttpService;
  return { client: new PartnersClient(httpService), httpGet };
}

describe("PartnersClient.getCheckinKey", () => {
  afterEach(() => {
    delete process.env["PARTNERS_SERVICE_URL"];
  });

  it("GETs the partner check-in public-key endpoint and returns the key", async () => {
    const { client, httpGet } = makeClient();

    const result = await client.getCheckinKey("partner-1", "property-1");

    expect(httpGet).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/internal\/partners\/partner-1\/properties\/property-1\/checkin-publickey$/,
      ),
    );
    expect(result).toBe("secret-key");
  });

  it("uses PARTNERS_SERVICE_URL when provided", async () => {
    process.env["PARTNERS_SERVICE_URL"] = "http://partners.internal:3007";
    const httpGet = jest
      .fn()
      .mockReturnValue(of({ data: { checkInKey: "k" } }));
    const { client } = makeClient(httpGet);

    await client.getCheckinKey("p", "prop");

    expect(httpGet).toHaveBeenCalledWith(
      expect.stringContaining(
        "http://partners.internal:3007/internal/partners/p",
      ),
    );
  });

  it("returns null when partners-service responds 404", async () => {
    const httpGet = jest
      .fn()
      .mockReturnValue(throwError(() => ({ response: { status: 404 } })));
    const { client } = makeClient(httpGet);

    const result = await client.getCheckinKey("partner-x", "property-x");

    expect(result).toBeNull();
  });

  it("wraps non-404 downstream errors in UpstreamServiceError", async () => {
    const httpGet = jest.fn().mockReturnValue(
      throwError(() => ({
        response: { status: 500 },
        message: "boom",
      })),
    );
    const { client } = makeClient(httpGet);

    await expect(
      client.getCheckinKey("partner-1", "property-1"),
    ).rejects.toThrow(UpstreamServiceError);
  });

  it("wraps connection-level errors (no response) in UpstreamServiceError", async () => {
    const httpGet = jest
      .fn()
      .mockReturnValue(throwError(() => new Error("connection refused")));
    const { client } = makeClient(httpGet);

    await expect(
      client.getCheckinKey("partner-1", "property-1"),
    ).rejects.toThrow(UpstreamServiceError);
  });
});
