import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CsvImportController } from "./csv-import.controller";
import { CsvImportService } from "./csv-import.service";

const mockCsvImportService = {
  enqueue: jest.fn(),
  getJob: jest.fn(),
};

describe("CsvImportController", () => {
  let controller: CsvImportController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CsvImportController],
      providers: [
        { provide: CsvImportService, useValue: mockCsvImportService },
      ],
    }).compile();
    controller = module.get<CsvImportController>(CsvImportController);
  });

  describe("uploadCsv", () => {
    it("calls csvImportService.enqueue and returns its result", async () => {
      const expectedResult = { jobId: "job-1", status: "queued", rowCount: 2 };
      mockCsvImportService.enqueue.mockResolvedValue(expectedResult);

      const file = {
        path: "/tmp/test.csv",
        originalname: "test.csv",
      } as Express.Multer.File;
      const result = await controller.uploadCsv(
        file,
        "partner-1",
        "properties",
      );

      expect(result).toEqual(expectedResult);
      expect(mockCsvImportService.enqueue).toHaveBeenCalledWith(
        "partner-1",
        "properties",
        file,
      );
    });
  });

  describe("getJob", () => {
    it("returns the job when found", async () => {
      const job = { id: "job-1", status: "completed", rowCount: 5 };
      mockCsvImportService.getJob.mockResolvedValue(job);

      const result = await controller.getJob("job-1");
      expect(result).toEqual(job);
      expect(mockCsvImportService.getJob).toHaveBeenCalledWith("job-1");
    });

    it("throws NotFoundException when job is not found", async () => {
      mockCsvImportService.getJob.mockResolvedValue(null);

      await expect(controller.getJob("missing-job")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
