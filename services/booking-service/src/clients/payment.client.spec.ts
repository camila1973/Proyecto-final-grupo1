import type { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { PaymentClient } from "./payment.client.js";
import { UpstreamServiceError } from "./upstream-service.error.js";

function makeClient(
  httpPost: jest.Mock = jest.fn().mockReturnValue(
    of({
      data: {
        status: "succeeded",
        policy: "full_refund",
        refundedUsd: 100,
        externalRef: "re_test",
        adjustmentId: "adj-1",
      },
    }),
  ),
) {
  const httpService = { post: httpPost } as unknown as HttpService;
  return { client: new PaymentClient(httpService), httpPost };
}

const INPUT = {
  reservationId: "res-uuid",
  reason: "guest_cancelled",
  actorId: "user-7",
  actorRole: "guest",
  requestIp: "10.0.0.1",
};

describe("PaymentClient.requestRefund", () => {
  it("POSTs to /payments/:id/refund with the actor metadata in the body", async () => {
    const { client, httpPost } = makeClient();

    const result = await client.requestRefund(INPUT);

    expect(httpPost).toHaveBeenCalledWith(
      expect.stringMatching(/\/payments\/res-uuid\/refund$/),
      {
        reason: "guest_cancelled",
        actorId: "user-7",
        actorRole: "guest",
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-forwarded-for": "10.0.0.1",
        }),
      }),
    );
    expect(result.externalRef).toBe("re_test");
  });

  it("omits x-forwarded-for when no IP is provided", async () => {
    const { client, httpPost } = makeClient();

    await client.requestRefund({ ...INPUT, requestIp: null });

    const headers = (
      httpPost.mock.calls[0][2] as { headers: Record<string, string> }
    ).headers;
    expect(headers["x-forwarded-for"]).toBeUndefined();
  });

  it("wraps downstream errors in UpstreamServiceError", async () => {
    const httpPost = jest
      .fn()
      .mockReturnValue(throwError(() => new Error("connection refused")));
    const { client } = makeClient(httpPost);

    await expect(client.requestRefund(INPUT)).rejects.toThrow(
      UpstreamServiceError,
    );
  });
});
