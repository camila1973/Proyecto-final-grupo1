import { Test, TestingModule } from "@nestjs/testing";
import {
  InternalServerErrorException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { Request } from "express";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";
import { UnknownEntityError } from "../../events/unknown-entity.error";

const mockWebhooksService = { processEvent: jest.fn() };

describe("WebhooksController", () => {
  let controller: WebhooksController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [{ provide: WebhooksService, useValue: mockWebhooksService }],
    }).compile();
    controller = module.get<WebhooksController>(WebhooksController);
  });

  const makeReq = (): Request =>
    ({ body: Buffer.from("{}") }) as unknown as Request;

  it("returns the result from webhooksService.processEvent on happy path", async () => {
    mockWebhooksService.processEvent.mockResolvedValue({ status: "ok" });
    const result = await controller.receiveEvent(
      "partner-1",
      "sig-abc",
      makeReq(),
    );
    expect(result).toEqual({ status: "ok" });
    expect(mockWebhooksService.processEvent).toHaveBeenCalledWith(
      "partner-1",
      expect.any(Buffer),
      "sig-abc",
    );
  });

  it("throws UnprocessableEntityException when service throws UnknownEntityError", async () => {
    mockWebhooksService.processEvent.mockRejectedValue(
      new UnknownEntityError("room", "ext-1"),
    );
    await expect(
      controller.receiveEvent("partner-1", "sig", makeReq()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("re-throws NestJS HTTP exceptions as-is", async () => {
    const httpError = new InternalServerErrorException("some upstream error");
    mockWebhooksService.processEvent.mockRejectedValue(httpError);
    await expect(
      controller.receiveEvent("partner-1", "sig", makeReq()),
    ).rejects.toBe(httpError);
  });

  it("throws InternalServerErrorException for unknown errors", async () => {
    mockWebhooksService.processEvent.mockRejectedValue(new Error("unexpected"));
    await expect(
      controller.receiveEvent("partner-1", "sig", makeReq()),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
