import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { Kysely } from "kysely";
import { createReadStream } from "fs";
import { parse } from "csv-parse";
import { KYSELY } from "../database/database.provider";
import { Database } from "../database/database.types";

const PROPERTY_REQUIRED_COLUMNS = [
  "externalId",
  "name",
  "type",
  "city",
  "countryCode",
];
// Optional: stars, neighborhood, lat, lon, thumbnailUrl, amenities

const ROOM_REQUIRED_COLUMNS = [
  "externalId",
  "externalPropertyId",
  "roomType",
  "capacity",
  "totalRooms",
  "basePriceUsd",
];
// Optional: bedType, viewType
const MAX_ROWS = 10_000;

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @InjectQueue("csv-import") private readonly queue: Queue,
  ) {}

  async enqueue(
    partnerId: string,
    type: "properties" | "rooms",
    file: Express.Multer.File,
  ) {
    // 1. Validate partner exists
    const partner = await this.db
      .selectFrom("pmsRegistrations")
      .select("id")
      .where("partnerId", "=", partnerId)
      .executeTakeFirst();
    if (!partner)
      throw new NotFoundException(`Partner not found: ${partnerId}`);

    if (!file) throw new BadRequestException("No file uploaded");

    // 2. Validate headers
    const expectedColumns =
      type === "properties" ? PROPERTY_REQUIRED_COLUMNS : ROOM_REQUIRED_COLUMNS;
    const headers = await this.readHeaders(file.path);
    const missing = expectedColumns.filter((c) => !headers.includes(c));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing CSV columns: ${missing.join(", ")}`,
      );
    }

    // 3. Count rows
    const rowCount = await this.countRows(file.path);
    if (rowCount > MAX_ROWS) {
      throw new BadRequestException(`CSV exceeds max row limit of ${MAX_ROWS}`);
    }

    // 4. Create import job
    const job = await this.db
      .insertInto("importJobs")
      .values({
        partnerId,
        type,
        status: "queued",
        rowCount,
        successCount: 0,
        failureCount: 0,
        errors: JSON.stringify([]),
        filePath: file.path,
      })
      .returning(["id", "status", "rowCount"])
      .executeTakeFirstOrThrow();

    // 5. Enqueue job
    await this.queue.add("process", {
      jobId: job.id,
      partnerId,
      type,
      filePath: file.path,
    });

    return { jobId: job.id, status: "queued", rowCount };
  }

  async getJob(jobId: string) {
    return this.db
      .selectFrom("importJobs")
      .selectAll()
      .where("id", "=", jobId)
      .executeTakeFirst();
  }

  private readHeaders(filePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const parser = parse({ columns: false, to_line: 1 });
      const stream = createReadStream(filePath);
      let headers: string[] = [];
      parser.on("readable", () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        let row: string[] = parser.read();
        while (row !== null) {
          headers = row;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          row = parser.read();
        }
      });
      parser.on("end", () => resolve(headers));
      parser.on("error", reject);
      stream.pipe(parser);
    });
  }

  private countRows(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let count = 0;
      const parser = parse({ columns: true, skip_empty_lines: true });
      const stream = createReadStream(filePath);
      parser.on("readable", () => {
        while (parser.read() !== null) count++;
      });
      parser.on("end", () => resolve(count));
      parser.on("error", reject);
      stream.pipe(parser);
    });
  }
}
