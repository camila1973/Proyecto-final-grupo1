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
    holdId: "hold-uuid",
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
            submit: jest.fn(),
            confirm: jest.fn(),
            fail: jest.fn(),
            cancel: jest.fn(),
            rehold: jest.fn(),
            updateGuestInfo: jest.fn(),
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
    const mockRes = () => ({ status: jest.fn() }) as any;

    it("returns 201 and the reservation data when newly created", async () => {
      const reservation = {
        created: true,
        id: "res-1",
        fareBreakdown: makeFareBreakdown(),
        holdExpiresAt: "2026-05-01T12:15:00Z",
      } as any;
      service.create.mockResolvedValue(reservation);
      const res = mockRes();

      const result = await controller.create(CREATE_DTO, res);

      expect(service.create).toHaveBeenCalledWith(CREATE_DTO);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(result).toEqual({
        id: reservation.id,
        fareBreakdown: reservation.fareBreakdown,
        holdExpiresAt: reservation.holdExpiresAt,
      });
    });

    it("returns 200 when returning an existing hold", async () => {
      const reservation = {
        created: false,
        id: "res-1",
        fareBreakdown: makeFareBreakdown(),
        holdExpiresAt: "2026-05-01T12:15:00Z",
      } as any;
      service.create.mockResolvedValue(reservation);
      const res = mockRes();

      const result = await controller.create(CREATE_DTO, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(result).toEqual({
        id: reservation.id,
        fareBreakdown: reservation.fareBreakdown,
        holdExpiresAt: reservation.holdExpiresAt,
      });
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

  describe("submit", () => {
    it("delegates to service and returns the submitted reservation", async () => {
      const reservation = { id: "res-1", status: "submitted" } as any;
      (service.submit as jest.Mock).mockResolvedValue(reservation);

      const result = await controller.submit("res-1");

      expect(service.submit).toHaveBeenCalledWith("res-1");
      expect(result).toBe(reservation);
    });
  });

  describe("confirm", () => {
    it("delegates to service and returns the confirmed reservation", async () => {
      const reservation = { id: "res-1", status: "confirmed" } as any;
      (service.confirm as jest.Mock).mockResolvedValue(reservation);

      const result = await controller.confirm("res-1");

      expect(service.confirm).toHaveBeenCalledWith("res-1");
      expect(result).toBe(reservation);
    });
  });

  describe("updateGuestInfo", () => {
    it("delegates to service and returns the updated reservation", async () => {
      const dto = {
        firstName: "Ana",
        lastName: "García",
        email: "ana@example.com",
      };
      const reservation = { id: "res-1" } as any;
      (service.updateGuestInfo as jest.Mock).mockResolvedValue(reservation);

      const result = await controller.updateGuestInfo("res-1", dto as any);

      expect(service.updateGuestInfo).toHaveBeenCalledWith("res-1", dto);
      expect(result).toBe(reservation);
    });
  });

  describe("fail", () => {
    it("delegates to service with id and reason", async () => {
      const reservation = { id: "res-1", status: "failed" } as any;
      (service.fail as jest.Mock).mockResolvedValue(reservation);

      const result = await controller.fail("res-1", {
        reason: "card declined",
      });

      expect(service.fail).toHaveBeenCalledWith("res-1", "card declined");
      expect(result).toBe(reservation);
    });
  });

  describe("cancel", () => {
    it("delegates to service with id and reason", async () => {
      const reservation = { id: "res-1", status: "cancelled" } as any;
      (service.cancel as jest.Mock).mockResolvedValue(reservation);

      const result = await controller.cancel("res-1", {
        reason: "changed mind",
      });

      expect(service.cancel).toHaveBeenCalledWith("res-1", "changed mind");
      expect(result).toBe(reservation);
    });
  });

  describe("rehold", () => {
    it("delegates to service and returns the reheld reservation", async () => {
      const reservation = { id: "res-1", status: "held" } as any;
      (service.rehold as jest.Mock).mockResolvedValue(reservation);

      const result = await controller.rehold("res-1");

      expect(service.rehold).toHaveBeenCalledWith("res-1");
      expect(result).toBe(reservation);
    });
  });
});
