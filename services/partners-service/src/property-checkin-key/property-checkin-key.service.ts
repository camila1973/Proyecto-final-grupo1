import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { Injectable, NotFoundException } from "@nestjs/common";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { Response } from "express";
import { InventoryClientService } from "../clients/inventory-client.service.js";
import { PropertyCheckinKeyRepository } from "./property-checkin-key.repository.js";

// __dirname is the CJS global — resolves to dist/partners-service/src/property-checkin-key/
// logo.png is copied by nest-cli to dist/partners-service/assets/logo.png
const LOGO_BUFFER = readFileSync(join(__dirname, "..", "assets", "logo.png"));

@Injectable()
export class PropertyCheckinKeyService {
  constructor(
    private readonly repo: PropertyCheckinKeyRepository,
    private readonly inventoryClient: InventoryClientService,
  ) {}

  async findKey(
    partnerId: string,
    propertyId: string,
  ): Promise<{ partnerId: string; propertyId: string; checkInKey: string }> {
    const checkInKey = await this.repo.findActiveKey(partnerId, propertyId);
    if (!checkInKey) {
      throw new NotFoundException(
        `No active check-in key for partner ${partnerId} / property ${propertyId}`,
      );
    }
    return { partnerId, propertyId, checkInKey };
  }

  async regenerateKey(
    partnerId: string,
    propertyId: string,
  ): Promise<{ partnerId: string; propertyId: string; checkInKey: string }> {
    const newKey = randomBytes(32).toString("hex");
    const checkInKey = await this.repo.rotateKey(partnerId, propertyId, newKey);
    if (!checkInKey) {
      throw new NotFoundException(
        `No active check-in key for partner ${partnerId} / property ${propertyId}`,
      );
    }
    return { partnerId, propertyId, checkInKey };
  }

  async generateCheckinPdf(
    partnerId: string,
    propertyId: string,
    res: Response,
  ): Promise<void> {
    const checkInKey = await this.repo.findActiveKey(partnerId, propertyId);
    if (!checkInKey) {
      throw new NotFoundException(
        `No active check-in key for partner ${partnerId} / property ${propertyId}`,
      );
    }

    const property = await this.inventoryClient.getPropertyById(propertyId);
    const propertyName = property?.name ?? propertyId;

    const deepLink = `travelhub://checkin?key=${checkInKey}`;
    const qrBuffer = await QRCode.toBuffer(deepLink, {
      errorCorrectionLevel: "M",
      width: 400,
      margin: 2,
    });

    // Half-letter: 5.5" × 8.5" = 396pt × 612pt
    const doc = new PDFDocument({ size: [396, 612], margin: 0 });
    const pageW = 396;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="qr-checkin-${propertyId}.pdf"`,
    );
    doc.pipe(res);

    // Logo — centered, 130pt wide
    const logoW = 130;
    doc.image(LOGO_BUFFER, (pageW - logoW) / 2, 36, { width: logoW });

    // QR code — centered, 200×200pt
    const qrSize = 200;
    doc.image(qrBuffer, (pageW - qrSize) / 2, 110, {
      width: qrSize,
      height: qrSize,
    });

    // Property name
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#1B4F8C")
      .text(propertyName, 0, 326, { align: "center", width: pageW });

    // Divider
    doc
      .moveTo(40, 360)
      .lineTo(pageW - 40, 360)
      .strokeColor("#E0E0E0")
      .lineWidth(0.5)
      .stroke();

    // Spanish guest instructions
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#333333")
      .text("Cómo hacer check-in", 0, 376, { align: "center", width: pageW });
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor("#555555")
      .text(
        "Abre la app TravelHub, ve a tu reservación\ny presiona Check-in. Escanea este código\npara activar tu llegada.",
        32,
        393,
        { align: "center", width: pageW - 64, lineGap: 2 },
      );

    // English guest instructions
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#999999")
      .text("How to check in", 0, 448, { align: "center", width: pageW });
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor("#BBBBBB")
      .text(
        "Open the TravelHub app, go to your reservation\nand tap Check-in. Scan this code to complete\nyour arrival.",
        32,
        463,
        { align: "center", width: pageW - 64, lineGap: 2 },
      );

    doc.end();
  }
}
