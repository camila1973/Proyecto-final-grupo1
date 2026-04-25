import { Test, TestingModule } from "@nestjs/testing";
import { AppService } from "./app.service";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailer = require("nodemailer");

describe("AppService", () => {
  let service: AppService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();
    service = module.get<AppService>(AppService);
  });

  afterEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
  });

  describe("getHealth", () => {
    it("returns status ok with service name", () => {
      expect(service.getHealth()).toEqual({
        status: "ok",
        service: "notification-service",
      });
    });
  });

  describe("getNotifications", () => {
    it("returns an object with total and notifications array", () => {
      const result = service.getNotifications() as {
        total: number;
        notifications: Array<{ id: string; channel: string; status: string }>;
      };
      expect(result.total).toBe(2);
      expect(Array.isArray(result.notifications)).toBe(true);
      expect(result.notifications).toHaveLength(2);
    });

    it("first notification has expected fields", () => {
      const result = service.getNotifications() as {
        notifications: Array<Record<string, string>>;
      };
      expect(result.notifications[0]).toMatchObject({
        id: "notif_001",
        userId: "usr_002",
        channel: "email",
        subject: "Booking Confirmed",
        status: "delivered",
      });
    });

    it("second notification has expected fields", () => {
      const result = service.getNotifications() as {
        notifications: Array<Record<string, string>>;
      };
      expect(result.notifications[1]).toMatchObject({
        id: "notif_002",
        userId: "usr_003",
        channel: "push",
        subject: "Payment Pending",
        status: "delivered",
      });
    });
  });

  describe("sendNotification", () => {
    it("returns queued status with generated id and timestamp", () => {
      const body = {
        userId: "usr_001",
        channel: "push",
        subject: "Test",
        message: "Hello",
      };
      const result = service.sendNotification(body) as Record<string, string>;
      expect(result.status).toBe("queued");
      expect(result.id).toMatch(/^notif_/);
      expect(result.queuedAt).toBeDefined();
      expect(new Date(result.queuedAt).toString()).not.toBe("Invalid Date");
    });

    it("echoes back the body fields in the response", () => {
      const body = {
        userId: "usr_002",
        to: "test@example.com",
        channel: "email",
        subject: "Booking Confirmed",
        message: "Your room is ready",
      };
      const result = service.sendNotification(body) as Record<string, string>;
      expect(result.userId).toBe("usr_002");
      expect(result.to).toBe("test@example.com");
      expect(result.channel).toBe("email");
      expect(result.subject).toBe("Booking Confirmed");
      expect(result.message).toBe("Your room is ready");
    });

    it("does not call sendEmail when channel is push", () => {
      const spy = jest.spyOn(service as any, "sendEmail");
      service.sendNotification({
        userId: "usr_001",
        channel: "push",
        subject: "Test",
        message: "Hello",
      });
      expect(spy).not.toHaveBeenCalled();
    });

    it("does not call sendEmail when channel is email but no 'to' address", () => {
      const spy = jest.spyOn(service as any, "sendEmail");
      service.sendNotification({
        userId: "usr_001",
        channel: "email",
        subject: "Test",
        message: "Hello",
      });
      expect(spy).not.toHaveBeenCalled();
    });

    it("calls sendEmail when channel is email and 'to' is provided", () => {
      const spy = jest
        .spyOn(service as any, "sendEmail")
        .mockResolvedValue(undefined);
      service.sendNotification({
        userId: "usr_001",
        to: "user@example.com",
        channel: "email",
        subject: "Welcome",
        message: "Thanks for booking",
      });
      expect(spy).toHaveBeenCalledWith(
        "user@example.com",
        "Welcome",
        "Thanks for booking",
        undefined,
      );
    });

    it("logs error when sendEmail rejects", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      jest
        .spyOn(service as any, "sendEmail")
        .mockRejectedValue(new Error("SMTP failure"));

      service.sendNotification({
        userId: "usr_001",
        to: "test@example.com",
        channel: "email",
        subject: "Test",
        message: "Hello",
      });

      await new Promise((resolve) => setImmediate(resolve));

      expect(consoleSpy).toHaveBeenCalledWith(
        "[notification-service] Email send error:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe("sendEmail (private, called directly)", () => {
    it("logs in DEV MODE when SMTP_HOST is not set", async () => {
      delete process.env.SMTP_HOST;
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await (service as any).sendEmail(
        "user@example.com",
        "Subject",
        "Message body",
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("DEV MODE"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("user@example.com"),
      );
      consoleSpy.mockRestore();
    });

    it("creates nodemailer transport with correct SMTP config", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "465";
      process.env.SMTP_SECURE = "true";
      process.env.SMTP_USER = "smtp_user";
      process.env.SMTP_PASS = "smtp_pass";

      const mockSendMail = jest.fn().mockResolvedValue({ messageId: "123" });
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      await (service as any).sendEmail("to@example.com", "Hello", "Body");

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "smtp.example.com",
          port: 465,
          secure: true,
          auth: { user: "smtp_user", pass: "smtp_pass" },
        }),
      );
    });

    it("sends mail with correct fields including custom SMTP_FROM", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_FROM = "custom@travelhub.com";

      const mockSendMail = jest.fn().mockResolvedValue({ messageId: "123" });
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      await (service as any).sendEmail(
        "to@example.com",
        "Test Subject",
        "Test body",
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "custom@travelhub.com",
          to: "to@example.com",
          subject: "Test Subject",
          text: "Test body",
        }),
      );
    });

    it("uses default SMTP_FROM when env var is not set", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      delete process.env.SMTP_FROM;

      const mockSendMail = jest.fn().mockResolvedValue({ messageId: "123" });
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      await (service as any).sendEmail("to@example.com", "Subject", "Body");

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: "noreply@travelhub.com" }),
      );
    });

    it("uses default SMTP_PORT 587 when env var is not set", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      delete process.env.SMTP_PORT;

      const mockSendMail = jest.fn().mockResolvedValue({ messageId: "123" });
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      await (service as any).sendEmail("to@example.com", "Subject", "Body");

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 587 }),
      );
    });

    it("sets secure: false when SMTP_SECURE is not 'true'", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_SECURE = "false";

      const mockSendMail = jest.fn().mockResolvedValue({ messageId: "123" });
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      await (service as any).sendEmail("to@example.com", "Subject", "Body");

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ secure: false }),
      );
    });
  });
});
