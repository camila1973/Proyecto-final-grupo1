/**
 * Integration tests — spins up the full NestJS HTTP stack (controller +
 * routing) with a mocked PaymentsService. No database or Stripe connection
 * required. Verifies HTTP status codes, request/response shapes, and header
 * forwarding through the entire NestJS request pipeline.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require("supertest") as (
  app: unknown,
) => ReturnType<typeof import("supertest")>;
import { PaymentsController } from "./payments.controller.js";
import { PaymentsService } from "./payments.service.js";

// ─── Mock PaymentsService ─────────────────────────────────────────────────────

const mockService = {
  initiate: jest.fn(),
  handleWebhook: jest.fn(),
  getStatus: jest.fn(),
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const INITIATE_BODY = {
  reservationId: "res-uuid",
  amountUsd: 250,
  currency: "usd",
  guestEmail: "guest@example.com",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Payments HTTP (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockService }],
    }).compile();

    app = module.createNestApplication({ rawBody: true });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /payments/initiate ───────────────────────────────────────────────

  describe("POST /payments/initiate", () => {
    it("returns 201 with paymentId and clientSecret on success", async () => {
      mockService.initiate.mockResolvedValue({
        paymentId: "pay-uuid",
        clientSecret: "pi_test_secret",
      });

      const res = await request(app.getHttpServer())
        .post("/payments/initiate")
        .send(INITIATE_BODY)
        .expect(201);

      expect(res.body).toMatchObject({
        paymentId: "pay-uuid",
        clientSecret: "pi_test_secret",
      });
      expect(mockService.initiate).toHaveBeenCalledWith(
        expect.objectContaining({ reservationId: "res-uuid" }),
      );
    });

    it("propagates service errors as 500", async () => {
      mockService.initiate.mockRejectedValue(new Error("Stripe unavailable"));

      await request(app.getHttpServer())
        .post("/payments/initiate")
        .send(INITIATE_BODY)
        .expect(500);
    });
  });

  // ─── POST /payments/webhook ───────────────────────────────────────────────

  describe("POST /payments/webhook", () => {
    it("returns 200 when webhook is processed successfully", async () => {
      mockService.handleWebhook.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post("/payments/webhook")
        .set("stripe-signature", "t=123,v1=abc")
        .send({ type: "payment_intent.succeeded" })
        .expect(200);
    });

    it("forwards the stripe-signature header to the service", async () => {
      mockService.handleWebhook.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post("/payments/webhook")
        .set("stripe-signature", "t=999,v1=xyz")
        .send({})
        .expect(200);

      expect(mockService.handleWebhook).toHaveBeenCalledWith(
        expect.any(Buffer),
        "t=999,v1=xyz",
      );
    });

    it("returns 400 when service throws BadRequestException (invalid signature)", async () => {
      const { BadRequestException } = await import("@nestjs/common");
      mockService.handleWebhook.mockRejectedValue(
        new BadRequestException("Invalid webhook signature"),
      );

      await request(app.getHttpServer())
        .post("/payments/webhook")
        .set("stripe-signature", "bad-sig")
        .send({})
        .expect(400);
    });
  });

  // ─── GET /payments/:reservationId/status ──────────────────────────────────

  describe("GET /payments/:reservationId/status", () => {
    it("returns 200 with status=captured for a confirmed payment", async () => {
      mockService.getStatus.mockResolvedValue({ status: "captured" });

      const res = await request(app.getHttpServer())
        .get("/payments/res-uuid/status")
        .expect(200);

      expect(res.body).toEqual({ status: "captured" });
      expect(mockService.getStatus).toHaveBeenCalledWith("res-uuid");
    });

    it("returns 200 with status=pending while payment is processing", async () => {
      mockService.getStatus.mockResolvedValue({ status: "pending" });

      const res = await request(app.getHttpServer())
        .get("/payments/res-uuid/status")
        .expect(200);

      expect(res.body.status).toBe("pending");
    });

    it("returns 200 with status=failed and failureReason", async () => {
      mockService.getStatus.mockResolvedValue({
        status: "failed",
        failureReason: "Insufficient funds.",
      });

      const res = await request(app.getHttpServer())
        .get("/payments/res-uuid/status")
        .expect(200);

      expect(res.body).toEqual({
        status: "failed",
        failureReason: "Insufficient funds.",
      });
    });

    it("returns 404 when no payment exists for the reservation", async () => {
      const { NotFoundException } = await import("@nestjs/common");
      mockService.getStatus.mockRejectedValue(
        new NotFoundException("No payment found"),
      );

      await request(app.getHttpServer())
        .get("/payments/unknown-res/status")
        .expect(404);
    });
  });
});
