import { Test } from "@nestjs/testing";
import { HoldsController } from "./holds.controller.js";
import { HoldsService } from "./holds.service.js";

const HOLD_ID = "hold-uuid";
const EXPIRES_AT = "2026-05-22T10:15:00.000Z";

const CREATE_DTO = {
  bookerId: "booker-uuid",
  roomId: "room-uuid",
  checkIn: "2026-05-01",
  checkOut: "2026-05-04",
};

describe("HoldsController", () => {
  let controller: HoldsController;
  let service: jest.Mocked<HoldsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HoldsController],
      providers: [
        {
          provide: HoldsService,
          useValue: {
            create: jest.fn(),
            release: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(HoldsController);
    service = module.get(HoldsService);
  });

  describe("create", () => {
    it("delegates to service and returns holdId + expiresAt", async () => {
      const response = { holdId: HOLD_ID, expiresAt: EXPIRES_AT };
      service.create.mockResolvedValue(response);

      const result = await controller.create(CREATE_DTO);

      expect(service.create).toHaveBeenCalledWith(CREATE_DTO);
      expect(result).toBe(response);
    });
  });

  describe("release", () => {
    it("delegates to service with the holdId param", async () => {
      service.release.mockResolvedValue(undefined);

      await controller.release(HOLD_ID);

      expect(service.release).toHaveBeenCalledWith(HOLD_ID);
    });
  });
});
