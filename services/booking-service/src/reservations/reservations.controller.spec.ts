import { Test } from "@nestjs/testing";
import { ReservationsController } from "./reservations.controller.js";
import { ReservationsService } from "./reservations.service.js";
import { FareBreakdown } from "../fare/fare-calculator.service.js";

function makeFareBreakdown(): FareBreakdown {
  return {
    nights: 3,
    roomRateUsd: 150,
    subtotalUsd: 450,
    taxes: [],
    fees: [],
    taxTotalUsd: 0,
    feeTotalUsd: 0,
    totalUsd: 450,
  };
}

describe("ReservationsController", () => {
  let controller: ReservationsController;
  let service: jest.Mocked<ReservationsService>;

  const PREVIEW_DTO = {
    propertyId: "prop-1",
    roomId: "room-1",
    partnerId: "partner-1",
    checkIn: "2026-05-01",
    checkOut: "2026-05-04",
  };

  const CREATE_DTO = {
    ...PREVIEW_DTO,
    bookerId: "booker-1",
    guestInfo: {
      firstName: "Ana",
      lastName: "García",
      email: "ana@example.com",
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        {
          provide: ReservationsService,
          useValue: {
            preview: jest.fn(),
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ReservationsController);
    service = module.get(ReservationsService);
  });

  describe("preview", () => {
    it("delegates to service and returns the breakdown", async () => {
      const breakdown = makeFareBreakdown();
      service.preview.mockResolvedValue(breakdown);

      const result = await controller.preview(PREVIEW_DTO);

      expect(service.preview).toHaveBeenCalledWith(PREVIEW_DTO);
      expect(result).toBe(breakdown);
    });
  });

  describe("create", () => {
    it("delegates to service and returns the new reservation", async () => {
      const reservation = {
        id: "res-1",
        fareBreakdown: makeFareBreakdown(),
        holdExpiresAt: "2026-05-01T12:15:00Z",
      } as any;
      service.create.mockResolvedValue(reservation);

      const result = await controller.create(CREATE_DTO);

      expect(service.create).toHaveBeenCalledWith(CREATE_DTO);
      expect(result).toBe(reservation);
    });
  });

  describe("findAll", () => {
    it("delegates to service and returns reservation list", async () => {
      const list = { total: 0, reservations: [] };
      service.findAll.mockResolvedValue(list);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toBe(list);
    });
  });

  describe("findOne", () => {
    it("delegates to service with the id param", async () => {
      const reservation = { id: "res-1" } as any;
      service.findOne.mockResolvedValue(reservation);

      const result = await controller.findOne("res-1");

      expect(service.findOne).toHaveBeenCalledWith("res-1");
      expect(result).toBe(reservation);
    });
  });
});
