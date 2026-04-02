import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bull";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { CsvImportService } from "./csv-import.service";
import { KYSELY } from "../database/database.provider";

const mockQueue = { add: jest.fn().mockResolvedValue({}) };

function buildDb(partner: any = { id: "partner-reg-1" }) {
  return {
    selectFrom: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn().mockResolvedValue(partner),
    }),
    insertInto: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockReturnValue({
          executeTakeFirstOrThrow: jest.fn().mockResolvedValue({
            id: "job-1",
            status: "queued",
            rowCount: 2,
          }),
        }),
      }),
    }),
  };
}

function writeTempCsv(content: string): string {
  const tmpPath = path.join(os.tmpdir(), `test-${Date.now()}.csv`);
  fs.writeFileSync(tmpPath, content);
  return tmpPath;
}

describe("CsvImportService", () => {
  let service: CsvImportService;
  let db: ReturnType<typeof buildDb>;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = buildDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvImportService,
        { provide: KYSELY, useValue: db },
        { provide: getQueueToken("csv-import"), useValue: mockQueue },
      ],
    }).compile();
    service = module.get<CsvImportService>(CsvImportService);
  });

  it("throws NotFoundException for unknown partner", async () => {
    const dbNoPartner = buildDb(null);
    const module = await Test.createTestingModule({
      providers: [
        CsvImportService,
        { provide: KYSELY, useValue: dbNoPartner },
        { provide: getQueueToken("csv-import"), useValue: mockQueue },
      ],
    }).compile();
    const svc = module.get<CsvImportService>(CsvImportService);

    const tmpPath = writeTempCsv(
      "externalId,name,type,city,countryCode\next1,Hotel,hotel,City,US\n",
    );
    const file = {
      path: tmpPath,
      originalname: "test.csv",
    } as Express.Multer.File;
    await expect(
      svc.enqueue("missing-partner", "properties", file),
    ).rejects.toThrow(NotFoundException);
    fs.unlinkSync(tmpPath);
  });

  it("throws BadRequestException for missing CSV columns", async () => {
    const tmpPath = writeTempCsv("externalId,name\next1,Hotel\n");
    const file = {
      path: tmpPath,
      originalname: "test.csv",
    } as Express.Multer.File;
    await expect(
      service.enqueue("partner-1", "properties", file),
    ).rejects.toThrow(BadRequestException);
    fs.unlinkSync(tmpPath);
  });

  it("throws BadRequestException when CSV exceeds row limit", async () => {
    // Generate a CSV with 10001 rows
    const headers = "externalId,name,type,city,countryCode\n";
    const rows = Array.from(
      { length: 10001 },
      (_, i) => `ext${i},Hotel${i},hotel,City,US`,
    ).join("\n");
    const tmpPath = writeTempCsv(headers + rows);
    const file = {
      path: tmpPath,
      originalname: "test.csv",
    } as Express.Multer.File;
    await expect(
      service.enqueue("partner-1", "properties", file),
    ).rejects.toThrow(BadRequestException);
    fs.unlinkSync(tmpPath);
  });

  it("creates job and enqueues for valid CSV", async () => {
    const tmpPath = writeTempCsv(
      "externalId,name,type,city,countryCode\next1,Hotel One,hotel,New York,US\next2,Hotel Two,hotel,Miami,US\n",
    );
    const file = {
      path: tmpPath,
      originalname: "test.csv",
    } as Express.Multer.File;
    const result = await service.enqueue("partner-1", "properties", file);
    expect(result.jobId).toBe("job-1");
    expect(result.status).toBe("queued");
    expect(mockQueue.add).toHaveBeenCalledWith(
      "process",
      expect.objectContaining({ jobId: "job-1" }),
    );
    fs.unlinkSync(tmpPath);
  });
});
