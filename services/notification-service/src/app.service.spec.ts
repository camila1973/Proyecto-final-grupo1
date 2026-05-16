import { AppService } from "./app.service";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailer = require("nodemailer");

const mockFirebaseService = {
  onModuleInit: jest.fn(),
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
};

const mockDeviceTokensService = {
  upsert: jest.fn(),
  findByUserId: jest.fn().mockResolvedValue(null),
  remove: jest.fn(),
};

describe("AppService", () => {
  let service: AppService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceTokensService.findByUserId.mockResolvedValue(null);
    service = new (AppService as any)(
      mockFirebaseService,
      mockDeviceTokensService,
    );
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
      const loggerSpy = jest
        .spyOn((service as any).logger, "error")
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

      expect(loggerSpy).toHaveBeenCalledWith(
        "Email send error",
        expect.any(String),
      );
      loggerSpy.mockRestore();
    });

    it("logs String(err) when sendEmail rejects with a non-Error value", async () => {
      const loggerSpy = jest
        .spyOn((service as any).logger, "error")
        .mockImplementation(() => {});
      jest
        .spyOn(service as any, "sendEmail")
        .mockRejectedValue("plain string error");

      service.sendNotification({
        userId: "usr_001",
        to: "test@example.com",
        channel: "email",
        subject: "Test",
        message: "Hello",
      });

      await new Promise((resolve) => setImmediate(resolve));

      expect(loggerSpy).toHaveBeenCalledWith(
        "Email send error",
        "plain string error",
      );
      loggerSpy.mockRestore();
    });
  });

  describe("sendEmail (private, called directly)", () => {
    it("logs in DEV MODE when SMTP_HOST is not set", async () => {
      delete process.env.SMTP_HOST;
      const loggerSpy = jest
        .spyOn((service as any).logger, "debug")
        .mockImplementation(() => {});

      await (service as any).sendEmail(
        "user@example.com",
        "Subject",
        "Message body",
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("DEV MODE"),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("user@example.com"),
      );
      loggerSpy.mockRestore();
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

    it("includes html in sendMail call when html is provided", async () => {
      process.env.SMTP_HOST = "smtp.example.com";

      const mockSendMail = jest.fn().mockResolvedValue({ messageId: "123" });
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      await (service as any).sendEmail(
        "to@example.com",
        "Subject",
        "Plain body",
        "<b>HTML body</b>",
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ html: "<b>HTML body</b>" }),
      );
    });
  });

  describe("sendPush (private, via sendNotification)", () => {
    it("calls firebaseService.sendPushNotification when device token is found", async () => {
      mockDeviceTokensService.findByUserId.mockResolvedValue(
        "device-token-abc",
      );

      service.sendNotification({
        userId: "usr_001",
        channel: "push",
        subject: "Test Push",
        message: "Hello Push",
      });

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockFirebaseService.sendPushNotification).toHaveBeenCalledWith(
        "device-token-abc",
        "Test Push",
        "Hello Push",
      );
    });

    it("skips sendPushNotification and logs debug when no token found", async () => {
      mockDeviceTokensService.findByUserId.mockResolvedValue(null);
      const debugSpy = jest
        .spyOn((service as any).logger, "debug")
        .mockImplementation(() => {});

      service.sendNotification({
        userId: "usr_no_token",
        channel: "push",
        subject: "Test",
        message: "Hello",
      });

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockFirebaseService.sendPushNotification).not.toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining("usr_no_token"),
      );
      debugSpy.mockRestore();
    });

    it("logs error when sendPush rejects", async () => {
      mockDeviceTokensService.findByUserId.mockResolvedValue("token-xyz");
      mockFirebaseService.sendPushNotification.mockRejectedValue(
        new Error("FCM error"),
      );
      const loggerSpy = jest
        .spyOn((service as any).logger, "error")
        .mockImplementation(() => {});

      service.sendNotification({
        userId: "usr_001",
        channel: "push",
        subject: "Test",
        message: "Hello",
      });

      await new Promise((resolve) => setImmediate(resolve));

      expect(loggerSpy).toHaveBeenCalledWith(
        "Push send error",
        expect.any(String),
      );
      loggerSpy.mockRestore();
    });

    it("logs String(err) when sendPush rejects with a non-Error value", async () => {
      mockDeviceTokensService.findByUserId.mockResolvedValue("token-xyz");
      mockFirebaseService.sendPushNotification.mockRejectedValue(
        "non-error push failure",
      );
      const loggerSpy = jest
        .spyOn((service as any).logger, "error")
        .mockImplementation(() => {});

      service.sendNotification({
        userId: "usr_001",
        channel: "push",
        subject: "Test",
        message: "Hello",
      });

      await new Promise((resolve) => setImmediate(resolve));

      expect(loggerSpy).toHaveBeenCalledWith(
        "Push send error",
        "non-error push failure",
      );
      loggerSpy.mockRestore();
    });
  });
});
