import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  async onModuleInit(): Promise<void> {
    this.client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
    // Verify connection
    await this.client.ping();
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, "EX", ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Delete all keys matching a glob pattern using SCAN (safe for production,
   * avoids KEYS command blocking the server).
   */
  async scanDel(pattern: string): Promise<void> {
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [nextCursor, found] = await this.client.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      keys.push(...found);
    } while (cursor !== "0");

    if (keys.length > 0) {
      // del accepts spread or array — use pipeline for bulk delete
      const pipeline = this.client.pipeline();
      for (const key of keys) {
        pipeline.del(key);
      }
      await pipeline.exec();
    }
  }
}
