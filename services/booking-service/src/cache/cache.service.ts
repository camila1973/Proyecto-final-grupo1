import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  async onModuleInit(): Promise<void> {
    this.client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
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
   * Atomically sets key=value only if it does not already exist (SET NX EX).
   * Returns true if the lock was acquired, false if another holder already owns it.
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, "1", "EX", ttlSeconds, "NX");
    return result === "OK";
  }

  /**
   * Atomically writes key=value only if the key does not exist (SET NX EX).
   * Unlike acquireLock, stores an arbitrary value instead of "1".
   * Returns true if written (first caller), false if the key already existed.
   */
  async setIfAbsent(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(key, value, "EX", ttlSeconds, "NX");
    return result === "OK";
  }

  /**
   * Atomically returns the value of key and deletes it in a single command (GETDEL).
   * Exactly one concurrent caller receives the value; all others receive null.
   */
  async getAndDelete(key: string): Promise<string | null> {
    return this.client.getdel(key);
  }
}
