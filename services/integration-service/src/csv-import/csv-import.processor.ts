import { Inject, Logger } from "@nestjs/common";
import { Process, Processor } from "@nestjs/bull";
import type { Job } from "bull";
import { Kysely } from "kysely";
import { createReadStream } from "fs";
import { parse } from "csv-parse";
import { KYSELY } from "../database/database.provider";
import { Database } from "../database/database.types";
import { PropertyHandler } from "../events/handlers/property.handler";
import { RoomHandler } from "../events/handlers/room.handler";

interface CsvJobData {
  jobId: string;
  partnerId: string;
  type: string;
  filePath: string;
}

interface RowError {
  row: number;
  error: string;
}

const BATCH_SIZE = 50;

@Processor("csv-import")
export class CsvImportProcessor {
  private readonly logger = new Logger(CsvImportProcessor.name);

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly propertyHandler: PropertyHandler,
    private readonly roomHandler: RoomHandler,
  ) {}

  @Process("process")
  async process(job: Job<CsvJobData>): Promise<void> {
    const { jobId, partnerId, type, filePath } = job.data;

    await this.db
      .updateTable("importJobs")
      .set({ status: "processing" })
      .where("id", "=", jobId)
      .execute();

    const errors: RowError[] = [];
    let successCount = 0;
    let failureCount = 0;
    let rowIndex = 0;
    const batch: Record<string, string>[] = [];

    const processBatch = async (rows: Record<string, string>[]) => {
      for (const row of rows) {
        rowIndex++;
        try {
          if (type === "properties") {
            await this.propertyHandler.handle(
              partnerId,
              "property.created",
              row,
            );
          } else {
            await this.roomHandler.handle(partnerId, "room.created", row);
          }
          successCount++;
        } catch (err) {
          failureCount++;
          errors.push({
            row: rowIndex,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      await this.db
        .updateTable("importJobs")
        .set({ successCount, failureCount })
        .where("id", "=", jobId)
        .execute();
    };

    await new Promise<void>((resolve, reject) => {
      const parser = parse({ columns: true, skip_empty_lines: true });
      const stream = createReadStream(filePath);

      const onReadable = () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        let row: Record<string, string> = parser.read();
        const drainAndProcess = async () => {
          while (row !== null) {
            batch.push(row);
            if (batch.length >= BATCH_SIZE) {
              parser.pause();
              const current = batch.splice(0, BATCH_SIZE);
              await processBatch(current).catch((e: unknown) =>
                this.logger.error(e),
              );
              parser.resume();
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            row = parser.read();
          }
        };
        drainAndProcess().catch(reject);
      };

      const onEnd = () => {
        const finish = async () => {
          if (batch.length > 0) {
            await processBatch(batch).catch((e: unknown) =>
              this.logger.error(e),
            );
          }
          resolve();
        };
        finish().catch(reject);
      };

      parser.on("readable", onReadable);
      parser.on("end", onEnd);
      parser.on("error", reject);
      stream.pipe(parser);
    });

    await this.db
      .updateTable("importJobs")
      .set({
        status: "completed",
        successCount,
        failureCount,
        errors: JSON.stringify(errors),
        completedAt: new Date(),
      })
      .where("id", "=", jobId)
      .execute();

    this.logger.log(
      `Job ${jobId} completed: ${successCount} ok, ${failureCount} failed`,
    );
  }
}
