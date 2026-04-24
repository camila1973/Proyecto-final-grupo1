import { Test } from "@nestjs/testing";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsService } from "./payments.service.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const INITIATE_DTO = {
  reservationId: "res-uuid",
  amountUsd: 350.5,
  currency: "usd",
  guestEmail: "guest@example.com",
};

const INITIATE_RESPONSE = {
  paymentId: "pay-uuid",
  clientSecret: "pi_test_secret_abc123",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PaymentsController", () => {
  let controller: PaymentsController;
  let service: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            initiate: jest.fn(),
            handleWebhook: jest.fn(),
            getStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(PaymentsController);
    service = module.get(PaymentsService);
  });

  // ─── initiate ─────────────────────────────────────────────────────────────

  describe("initiate", () => {
    it("delegates to service and returns the payment response", async () => {
      service.initiate.mockResolvedValue(INITIATE_RESPONSE);

      const result = await controller.initiate(INITIATE_DTO);

      expect(service.initiate).toHaveBeenCalledWith(INITIATE_DTO);
      expect(result).toBe(INITIATE_RESPONSE);
    });
  });

  // ─── webhook ──────────────────────────────────────────────────────────────

  describe("webhook", () => {
    it("delegates rawBody and stripe-signature header to service", async () => {
      service.handleWebhook.mockResolvedValue(undefined);
      const rawBody = Buffer.from('{"type":"payment_intent.succeeded"}');
      const sig = "t=12345,v1=abc";
      const req = { rawBody };

      await controller.webhook(sig, req as any);

      expect(service.handleWebhook).toHaveBeenCalledWith(rawBody, sig);
    });

    it("passes an empty buffer when rawBody is missing", async () => {
      service.handleWebhook.mockResolvedValue(undefined);
      const req = {};

      await controller.webhook("sig", req as any);

      expect(service.handleWebhook).toHaveBeenCalledWith(undefined, "sig");
    });
  });

  // ─── getStatus ────────────────────────────────────────────────────────────

  describe("getStatus", () => {
    it("delegates to service with the reservation id", async () => {
      const status = { status: "captured" };
      service.getStatus.mockResolvedValue(status as any);

      const result = await controller.getStatus("res-uuid");

      expect(service.getStatus).toHaveBeenCalledWith("res-uuid");
      expect(result).toBe(status);
    });
  });
});
