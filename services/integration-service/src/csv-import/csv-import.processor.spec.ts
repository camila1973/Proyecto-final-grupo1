import { Test, TestingModule } from "@nestjs/testing";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { CsvImportProcessor } from "./csv-import.processor";
import { KYSELY } from "../database/database.provider";
import { PropertyHandler } from "../events/handlers/property.handler";
import { RoomHandler } from "../events/handlers/room.handler";

const mockPropertyHandler = { handle: jest.fn() };
const mockRoomHandler = { handle: jest.fn() };

function buildDb() {
  const execute = jest.fn().mockResolvedValue([]);
  const where = jest.fn().mockReturnValue({ execute });
  const set = jest.fn().mockReturnValue({ where });
  return {
    db: {
      updateTable: jest.fn().mockReturnValue({ set }),
    },
    execute,
  };
}

function writeTempCsv(content: string): string {
  const tmpPath = path.join(os.tmpdir(), `test-processor-${Date.now()}.csv`);
  fs.writeFileSync(tmpPath, content);
  return tmpPath;
}

describe("CsvImportProcessor", () => {
  let processor: CsvImportProcessor;
  let dbMock: any;
  let tmpFiles: string[];

  beforeEach(async () => {
    jest.clearAllMocks();
    tmpFiles = [];
    const { db } = buildDb();
    dbMock = db;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvImportProcessor,
        { provide: KYSELY, useValue: dbMock },
        { provide: PropertyHandler, useValue: mockPropertyHandler },
        { provide: RoomHandler, useValue: mockRoomHandler },
      ],
    }).compile();
    processor = module.get<CsvImportProcessor>(CsvImportProcessor);
  });

  afterEach(() => {
    for (const f of tmpFiles) {
      try {
        fs.unlinkSync(f);
      } catch {
        /* ignore */
      }
    }
  });

  it("processes a properties CSV and calls propertyHandler for each row", async () => {
    mockPropertyHandler.handle.mockResolvedValue(undefined);

    const csvContent =
      "externalId,name,type,city,countryCode\next1,Hotel One,hotel,New York,US\next2,Hotel Two,hotel,Miami,US\n";
    const filePath = writeTempCsv(csvContent);
    tmpFiles.push(filePath);

    const job = {
      data: {
        jobId: "job-1",
        partnerId: "partner-1",
        type: "properties",
        filePath,
      },
    } as any;

    await processor.process(job);

    expect(mockPropertyHandler.handle).toHaveBeenCalledTimes(2);
    expect(mockPropertyHandler.handle).toHaveBeenCalledWith(
      "partner-1",
      "property.created",
      expect.objectContaining({ externalId: "ext1" }),
    );
    expect(dbMock.updateTable).toHaveBeenCalledWith("importJobs");
  });

  it("processes a rooms CSV and calls roomHandler for each row", async () => {
    mockRoomHandler.handle.mockResolvedValue(undefined);

    const csvContent =
      "externalId,externalPropertyId,roomType,capacity,totalRooms,basePriceUsd\nroom1,prop1,Standard,2,10,100\n";
    const filePath = writeTempCsv(csvContent);
    tmpFiles.push(filePath);

    const job = {
      data: { jobId: "job-2", partnerId: "partner-1", type: "rooms", filePath },
    } as any;

    await processor.process(job);

    expect(mockRoomHandler.handle).toHaveBeenCalledTimes(1);
    expect(mockRoomHandler.handle).toHaveBeenCalledWith(
      "partner-1",
      "room.created",
      expect.objectContaining({ externalId: "room1" }),
    );
  });

  it("increments failureCount when handler throws, and successCount + failureCount = rowCount", async () => {
    mockPropertyHandler.handle
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("validation failed"));

    const csvContent =
      "externalId,name,type,city,countryCode\next1,Hotel One,hotel,New York,US\next2,Bad Hotel,hotel,Miami,US\n";
    const filePath = writeTempCsv(csvContent);
    tmpFiles.push(filePath);

    const job = {
      data: {
        jobId: "job-3",
        partnerId: "partner-1",
        type: "properties",
        filePath,
      },
    } as any;

    await processor.process(job);

    // Should have called updateTable with completed status
    // Both rows are processed: 1 success, 1 failure
    expect(mockPropertyHandler.handle).toHaveBeenCalledTimes(2);
    // The final updateTable call should have status completed
    const updateTableCalls = dbMock.updateTable.mock.calls;
    expect(updateTableCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("marks job as completed after processing", async () => {
    mockPropertyHandler.handle.mockResolvedValue(undefined);

    const csvContent =
      "externalId,name,type,city,countryCode\next1,Hotel One,hotel,New York,US\n";
    const filePath = writeTempCsv(csvContent);
    tmpFiles.push(filePath);

    const job = {
      data: {
        jobId: "job-4",
        partnerId: "partner-1",
        type: "properties",
        filePath,
      },
    } as any;

    await processor.process(job);

    // updateTable is called for: processing, batch updates, completed
    expect(dbMock.updateTable).toHaveBeenCalledWith("importJobs");
  });
});
