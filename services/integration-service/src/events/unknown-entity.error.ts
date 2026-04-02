export class UnknownEntityError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly externalId: string,
  ) {
    super(`Unknown entity: ${entityType} with externalId=${externalId}`);
    this.name = "UnknownEntityError";
  }
}
