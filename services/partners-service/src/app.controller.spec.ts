import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("health", () => {
    it("should return status ok and service name", () => {
      expect(appController.getHealth()).toEqual({
        status: "ok",
        service: "partners-service",
      });
    });
  });

  describe("getHotels", () => {
    it("returns hotel list with total", () => {
      const result = appController.getHotels() as {
        total: number;
        hotels: unknown[];
      };
      expect(result.total).toBe(2);
      expect(result.hotels).toHaveLength(2);
    });
  });

  describe("getRevenue", () => {
    it("returns revenue data for the given hotel id", () => {
      const result = appController.getRevenue("hotel_001") as {
        hotelId: string;
        revenue: unknown;
      };
      expect(result.hotelId).toBe("hotel_001");
      expect(result.revenue).toBeDefined();
    });
  });

  describe("getAllRevenue", () => {
    it("returns all partners revenue", () => {
      const result = appController.getAllRevenue() as {
        partners: unknown[];
        totalRevenue: number;
      };
      expect(result.partners).toHaveLength(2);
      expect(result.totalRevenue).toBeGreaterThan(0);
    });
  });
});
