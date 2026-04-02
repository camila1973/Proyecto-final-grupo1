import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { CsvImportService } from "./csv-import.service";

@Controller("import/csv")
export class CsvImportController {
  constructor(private readonly csvImportService: CsvImportService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "/tmp/integration-imports",
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          cb(null, `${unique}-${file.originalname}`);
        },
      }),
    }),
  )
  async uploadCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body("partnerId") partnerId: string,
    @Body("type") type: string,
  ) {
    return this.csvImportService.enqueue(
      partnerId,
      type as "properties" | "rooms",
      file,
    );
  }

  @Get("jobs/:jobId")
  async getJob(@Param("jobId") jobId: string) {
    const job = await this.csvImportService.getJob(jobId);
    if (!job) throw new NotFoundException(`Job not found: ${jobId}`);
    return job;
  }
}
