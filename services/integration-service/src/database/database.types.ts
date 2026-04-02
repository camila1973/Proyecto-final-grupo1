import { Generated } from "kysely";

export interface PmsRegistrationsTable {
  id: Generated<string>;
  partnerId: string;
  name: string;
  adapterType: "generic" | "hotelbeds" | "travelclick" | "roomraccoon";
  signingSecret: string;
  enabled: boolean;
  createdAt: Generated<Date>;
}

export interface ExternalIdMapTable {
  id: Generated<string>;
  partnerId: string;
  entityType: "property" | "room" | "booking" | "hold";
  externalId: string;
  internalId: string;
  createdAt: Generated<Date>;
}

export interface ProcessedEventsTable {
  id: Generated<string>;
  partnerId: string;
  eventId: string;
  processedAt: Generated<Date>;
}

export interface ImportJobsTable {
  id: Generated<string>;
  partnerId: string;
  type: "properties" | "rooms";
  status: "queued" | "processing" | "completed" | "failed";
  rowCount: number;
  successCount: number;
  failureCount: number;
  errors: unknown; // jsonb
  filePath: string;
  createdAt: Generated<Date>;
  completedAt: Date | null;
}

export interface Database {
  pmsRegistrations: PmsRegistrationsTable;
  externalIdMap: ExternalIdMapTable;
  processedEvents: ProcessedEventsTable;
  importJobs: ImportJobsTable;
}
