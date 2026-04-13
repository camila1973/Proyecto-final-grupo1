import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe("getHealth", () => {
    it("should return status ok and service name", () => {
      expect(appController.getHealth()).toEqual({
        status: "ok",
        service: "notification-service",
      });
    });
  });

  describe("getNotifications", () => {
    it("should return notifications list with total count", () => {
      const result = appController.getNotifications() as {
        total: number;
        notifications: unknown[];
      };
      expect(result.total).toBe(2);
      expect(result.notifications).toHaveLength(2);
    });

    it("should delegate to appService.getNotifications", () => {
      const spy = jest
        .spyOn(appService, "getNotifications")
        .mockReturnValue({ total: 0, notifications: [] });
      appController.getNotifications();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("sendNotification", () => {
    it("should return a queued notification", () => {
      const body = {
        userId: "usr_001",
        channel: "push",
        subject: "Test notification",
        message: "Hello there",
      };
      const result = appController.sendNotification(body) as {
        id: string;
        status: string;
        queuedAt: string;
      };
      expect(result.status).toBe("queued");
      expect(result.id).toMatch(/^notif_/);
      expect(result.queuedAt).toBeDefined();
    });

    it("should delegate to appService.sendNotification", () => {
      const body = {
        userId: "usr_002",
        to: "test@example.com",
        channel: "email",
        subject: "Booking confirmed",
        message: "Your booking is confirmed",
      };
      const spy = jest.spyOn(appService, "sendNotification").mockReturnValue({
        id: "notif_abc",
        status: "queued",
        queuedAt: new Date().toISOString(),
      });
      appController.sendNotification(body);
      expect(spy).toHaveBeenCalledWith(body);
    });
  });
});
