export class UpstreamServiceError extends Error {
  constructor(
    public readonly service: string,
    public readonly cause?: unknown,
  ) {
    super(`Upstream service error: ${service}`);
    this.name = "UpstreamServiceError";
  }
}
